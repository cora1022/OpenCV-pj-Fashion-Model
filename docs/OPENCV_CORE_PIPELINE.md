# OpenCV 중심 이미지 처리 파이프라인

이 문서는 GitHub에서 프로젝트를 볼 때 OpenCV가 어떤 역할을 하는지 바로 확인할 수 있도록 정리한 설명 문서이다. 본 프로젝트는 패션 이미지를 단순히 AI 모델에 넣는 방식이 아니라, OpenCV 기반 전처리로 의류 영역을 먼저 분리한 뒤 FashionCLIP과 Qdrant 검색으로 이어지는 구조이다.

---

## 1. 왜 OpenCV가 핵심인가

패션 이미지 유사도 검색에서 입력 이미지는 항상 깨끗하지 않다. 사용자가 전신 사진, 착용샷, 쇼핑몰 이미지, 배경이 있는 사진을 업로드할 수 있기 때문에 원본 전체를 그대로 벡터화하면 옷이 아닌 배경, 얼굴, 포즈, 조명, 주변 사물이 검색 결과에 영향을 줄 수 있다.

그래서 이 프로젝트에서는 검색 전에 OpenCV 전처리 단계를 둔다.

```text
원본 이미지
  -> OpenCV/YOLO로 의류 영역 탐지
  -> 의류 중심 crop
  -> crop 이미지만 FashionCLIP 임베딩
  -> Qdrant 유사도 검색
```

즉, FashionCLIP은 이미지 특징을 벡터화하는 역할이고, OpenCV는 어떤 영역을 벡터화할지 결정하는 역할이다. 검색 품질의 출발점은 OpenCV 기반 관심 영역 추출이다.

---

## 2. 핵심 코드 위치

```text
backend/app/services/opencv_crop_service.py
```

이 파일의 `OpenCvCropService`가 이미지 전처리를 담당한다.

주요 함수:

- `_decode_image()`: 업로드된 bytes를 PIL RGB 이미지로 변환
- `load()`: YOLO, OpenCV cascade, HOG detector 준비
- `crop_image_bytes_with_metadata()`: 전처리 전체 흐름 실행
- `_detect_box()`: 사용할 detector 선택
- `_detect_yolo_box()`: YOLO 결과에서 의류 bounding box 선택
- `_largest_box()`: OpenCV fallback 결과 중 가장 큰 후보 선택
- `_expand_box()`: bounding box에 padding 적용 후 이미지 경계 보정

---

## 3. 실제 전처리 흐름

```text
1. 사용자가 이미지를 업로드한다.
2. FastAPI가 이미지 bytes를 받는다.
3. OpenCvCropService가 bytes를 PIL Image로 decode한다.
4. 이미지를 RGB로 통일한다.
5. numpy array로 변환한다.
6. OpenCV 처리를 위해 RGB를 BGR로 변환한다.
7. YOLO 의류 detector가 있으면 우선 사용한다.
8. YOLO 모델이 없으면 OpenCV cascade detector를 시도한다.
9. cascade도 없으면 OpenCV HOG person detector를 fallback으로 사용한다.
10. 탐지된 후보 중 의류 class 또는 가장 큰 영역을 선택한다.
11. bounding box에 padding을 적용한다.
12. 좌표가 이미지 밖으로 나가지 않도록 보정한다.
13. crop된 이미지를 반환한다.
14. crop metadata를 함께 반환한다.
```

이 과정에서 OpenCV는 단순 보조 라이브러리가 아니라, 입력 이미지를 검색 가능한 형태로 바꾸는 전처리 엔진 역할을 한다.

---

## 4. RGB to BGR 변환의 의미

PIL과 일반 웹 이미지는 RGB 채널 순서를 사용한다. 반면 OpenCV는 기본적으로 BGR 채널 순서를 사용한다. 따라서 OpenCV detector나 영상처리 함수를 쓰기 전에 다음 변환이 필요하다.

```python
array = np.array(image)
bgr = cv2.cvtColor(array, cv2.COLOR_RGB2BGR)
```

이 변환을 통해 이미지 데이터를 OpenCV가 기대하는 형식으로 맞춘다. 색상 채널 순서를 맞추지 않으면 이후 detector나 영상처리 결과가 의도와 다르게 나올 수 있다.

---

## 5. Detector 선택 구조

`OpenCvCropService.load()`는 가능한 detector를 순서대로 준비한다.

```text
1. YOLO 의류 모델 파일이 있으면 YOLO 사용
2. cascade path가 있으면 OpenCV cascade 사용
3. 둘 다 없으면 OpenCV HOGDescriptor 사용
```

YOLO는 의류 영역을 더 직접적으로 찾는 역할을 한다. 하지만 모델 파일이 없거나 설정이 빠진 경우에도 완전히 실패하지 않도록 OpenCV cascade와 HOG detector fallback을 둔다. 이 구조는 과제에서 OpenCV 기반 전처리 흐름을 유지하기 위한 설계이다.

---

## 6. Bounding Box 선택 기준

YOLO 결과에는 여러 개의 box가 나올 수 있다. 이 프로젝트는 먼저 class name에 `cloth` 또는 `clothing`이 포함된 후보를 우선 사용한다.

```text
clothing 후보가 있으면:
  clothing 후보 중 area * confidence가 가장 큰 box 선택

clothing 후보가 없으면:
  전체 후보 중 area * confidence가 가장 큰 box 선택
```

단순히 confidence만 보지 않고, box 면적과 confidence를 함께 고려한다. 너무 작은 영역이 높은 confidence로 잡히는 경우를 줄이고, 실제 의류 영역에 가까운 큰 후보를 선택하기 위해서이다.

---

## 7. Padding과 좌표 보정

탐지된 box를 그대로 crop하면 옷의 가장자리나 소매, 밑단이 잘릴 수 있다. 그래서 `_expand_box()`에서 가로 12%, 세로 10% 정도 padding을 적용한다.

```text
pad_x = width * 0.12
pad_y = height * 0.10
```

그 다음 `max()`와 `min()`으로 좌표가 이미지 범위를 벗어나지 않게 보정한다.

```text
left   = max(0, x - pad_x)
top    = max(0, y - pad_y)
right  = min(image_width, x + width + pad_x)
bottom = min(image_height, y + height + pad_y)
```

이 단계는 디지털 영상처리에서 관심 영역을 안정적으로 추출하기 위한 후처리이다.

---

## 8. Metadata를 남기는 이유

전처리 결과는 단순히 crop 이미지만 반환하지 않고 metadata도 함께 반환한다.

```text
crop_applied
original_width
original_height
detector
crop_box
```

이 정보는 보고서와 디버깅에서 중요하다. 어떤 detector가 사용되었는지, 실제 crop이 적용되었는지, crop 좌표가 어떻게 잡혔는지 확인할 수 있기 때문이다. 즉, OpenCV 전처리가 실제 검색 파이프라인에서 수행되었다는 근거로 사용할 수 있다.

---

## 9. FashionCLIP과의 연결

OpenCV 전처리가 끝나면 crop된 이미지는 FashionCLIP으로 전달된다.

```text
OpenCV crop image
  -> FashionCLIP processor
  -> CLIP image feature
  -> L2 normalization
  -> Qdrant query vector
```

FashionCLIP이 좋은 임베딩 모델이어도 입력 이미지에 배경 정보가 많으면 패션 유사도 검색 결과가 흐려질 수 있다. 그래서 이 프로젝트는 모델 성능에만 의존하지 않고, OpenCV로 입력을 먼저 정리한다.

---

## 10. 데이터 구축 스크립트에서도 OpenCV 사용

OpenCV 전처리는 사용자 업로드 검색에만 쓰이는 것이 아니다.

```text
backend/scripts/naver_crop_to_qdrant_fashionclip.py
```

이 스크립트는 네이버 쇼핑 API로 상품 이미지를 수집하고, 저장 전에 의류 영역을 crop한 뒤 FashionCLIP 벡터로 변환한다. 따라서 Qdrant에 저장되는 기준 이미지들도 OpenCV 전처리를 거친 의류 중심 이미지가 된다.

검색 시점의 사용자 이미지와 저장 시점의 상품 이미지 모두 OpenCV 전처리 흐름을 거치기 때문에, 벡터 비교의 기준이 더 일관된다.

---

## 11. 보고서 관점 정리

이 프로젝트에서 OpenCV는 다음 이유로 핵심 기술이다.

```text
1. 이미지 bytes를 실제 영상처리 가능한 배열로 변환한다.
2. RGB/BGR 색상 공간 차이를 처리한다.
3. YOLO 결과와 OpenCV fallback detector를 이용해 관심 영역을 찾는다.
4. bounding box 기반 crop으로 의류 영역을 추출한다.
5. padding과 좌표 보정으로 crop 안정성을 높인다.
6. crop metadata를 남겨 처리 과정을 확인할 수 있게 한다.
7. 전처리된 이미지를 FashionCLIP/Qdrant 검색으로 연결한다.
```

따라서 이 저장소는 단순한 웹 CRUD 프로젝트가 아니라, OpenCV 전처리를 중심으로 머신러닝 임베딩과 벡터 검색을 연결한 디지털 영상처리 응용 프로젝트이다.
