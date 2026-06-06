# OpenCV 패션 유사도 검색 프로젝트 개발 지시서

본 문서는 `이미지로 찾는 패션 유사도 검색` 프로젝트를 개발하기 전에 작성한 Markdown 형식의 개발 지시서이다.

목표는 단순히 OpenCV를 코드 일부에 끼워 넣는 것이 아니라, 이미지 전처리, 객체 영역 탐지, 임베딩, 벡터 유사도 검색, 웹 서비스 배포까지 하나의 흐름으로 연결하는 것이다. 특히 프로젝트가 커지면서 코드가 한 파일에 몰리지 않도록, 클린 아키텍처에서 말하는 관심사 분리와 계층 분리를 계속 요구하는 방향으로 작성한다.

---

## 1. 프로젝트 목표

```text
사용자가 패션 이미지를 업로드하면,
백엔드는 이미지에서 옷 영역을 찾고,
OpenCV/YOLO를 이용해 의류 영역을 크롭한 뒤,
FashionCLIP으로 이미지 특징 벡터를 생성한다.

생성된 벡터는 Qdrant에 저장된 네이버 쇼핑 상품 이미지 벡터와 비교한다.
유사도가 높은 상품을 React 화면에 카드 형태로 보여준다.

관리자는 로그인 후 마음에 드는 검색 결과를 MySQL에 저장할 수 있다.
최종 결과물은 AWS EC2 + Docker Compose + Caddy 구조로 배포 가능한 웹 서비스여야 한다.
```

이 프로젝트는 단순 이미지 업로드 예제가 아니라, 디지털 영상처리와 머신러닝을 연결한 서비스형 과제물로 개발한다. OpenCV는 보조 기능이 아니라 입력 이미지의 품질을 높이는 핵심 전처리 단계로 다룬다.

---

## 2. 개발 원칙

```text
처음부터 완벽한 클린 아키텍처를 구현하지는 못하더라도,
다음 원칙은 끝까지 유지한다.

1. main.py에 모든 코드를 몰아넣지 않는다.
2. API 계층은 HTTP 요청과 응답만 담당한다.
3. 이미지 처리, AI 모델, 벡터 검색은 services 계층으로 분리한다.
4. DB 모델과 API 응답 스키마를 분리한다.
5. 환경변수, JWT, 비밀번호 해싱은 core 계층으로 분리한다.
6. React 화면 코드와 API 호출 코드를 분리한다.
7. Docker 배포 설정은 애플리케이션 코드와 분리한다.
```

개발 중 AI 도구에 코드를 요청할 때도 이 원칙을 반복해서 요구한다. "일단 동작하게 만들어줘"가 아니라, "api, services, schemas, models, db, core로 나누고 외부 기술은 서비스 객체로 감싸줘"라고 계속 지시한다.

---

## 3. 전체 처리 흐름

```text
1. 네이버 쇼핑 API로 패션 상품 이미지를 수집한다.
2. 수집한 이미지에서 OpenCV/YOLO로 의류 영역을 찾는다.
3. 바운딩 박스 기준으로 옷 영역을 크롭한다.
4. 크롭된 이미지를 FashionCLIP에 넣어 특징 벡터를 만든다.
5. 상품 정보와 벡터를 Qdrant 컬렉션에 저장한다.
6. 사용자가 React 화면에서 이미지를 업로드한다.
7. FastAPI가 업로드 이미지를 받는다.
8. 백엔드가 다시 OpenCV/YOLO 전처리를 수행한다.
9. FashionCLIP으로 업로드 이미지 벡터를 만든다.
10. Qdrant에서 유사 벡터 Top-K를 검색한다.
11. Gemini를 사용할 수 있으면 이미지 특징 분석도 함께 수행한다.
12. React는 결과를 카드형 쇼핑 리스트로 출력한다.
13. 로그인한 관리자는 검색 결과를 MySQL에 저장한다.
```

데이터 구축과 사용자 검색 흐름 모두에서 이미지 전처리와 벡터화가 중심이 되어야 한다. 보고서에는 이 흐름을 디지털 영상처리, 머신러닝, 벡터 데이터베이스가 연결되는 구조로 설명한다.

---

## 4. 백엔드 구조 지시

```text
backend/app/
  main.py
  api/
    auth.py
    saved_fashions.py
    deps.py
  services/
    opencv_crop_service.py
    fashionclip_service.py
    qdrant_service.py
    gemini_feature_service.py
    admin_seed_service.py
  schemas/
    auth_schema.py
    search_schema.py
    saved_fashion_schema.py
  models/
    admin_user.py
    saved_fashion.py
  db/
    base.py
    session.py
  core/
    config.py
    security.py
```

`main.py`는 FastAPI 앱 생성, CORS 설정, 라우터 등록, 서비스 객체 초기화 정도만 담당한다. 로그인 로직, 이미지 크롭 로직, Qdrant 검색 로직, DB 저장 로직을 `main.py`에 직접 길게 작성하지 않는다.

---

## 5. API 계층 지시

```text
api 계층은 컨트롤러 역할만 한다.

필요한 API:
- POST /api/search/image
- POST /api/search/image-url
- POST /api/auth/login
- GET /api/auth/me
- GET /api/saved-fashions
- POST /api/saved-fashions
- DELETE /api/saved-fashions/{saved_id}

API 함수가 할 일:
1. 요청 값을 받는다.
2. 파일 형식과 query parameter를 검증한다.
3. 필요한 service 함수를 호출한다.
4. response_model에 맞춰 결과를 반환한다.
5. 실패 상황은 HTTPException으로 처리한다.

API 함수가 하지 말아야 할 일:
- YOLO 모델 직접 로드
- FashionCLIP 직접 실행
- Qdrant client 직접 생성
- JWT 직접 조립
- SQLAlchemy engine 직접 생성
```

API 계층은 외부 요청을 받아 안쪽 로직으로 전달하는 입구로만 둔다. 실제 기능 구현은 계속 services, db, core 계층에 넘긴다.

---

## 6. 서비스 계층 지시

```text
services 계층은 실제 기능이 모이는 곳이다.

OpenCvCropService:
- 이미지 bytes를 PIL Image로 decode
- RGB 이미지를 numpy array로 변환
- OpenCV 처리를 위해 RGB -> BGR 변환
- YOLO 모델이 있으면 YOLO 우선 사용
- 의류 class 후보를 우선 선택
- 후보가 여러 개면 area * confidence 기준으로 선택
- padding 적용 후 이미지 범위를 벗어나지 않게 보정
- crop_applied, crop_box, detector metadata 반환

FashionClipService:
- CLIPProcessor와 CLIPModel 로드
- 이미지를 RGB로 변환
- pixel_values tensor 생성
- get_image_features로 이미지 벡터 추출
- L2 normalization 수행

QdrantSearchService:
- Qdrant client 생성
- 컬렉션 존재 여부 확인
- query vector로 Top-K 검색
- payload를 ImageSearchResult로 변환

GeminiFeatureService:
- 이미지 bytes를 base64로 변환
- Gemini API로 색상, 소재, 패턴, 스타일 키워드 분석
- 실패해도 전체 이미지 검색이 죽지 않도록 optional하게 처리

admin_seed_service:
- 환경변수 ADMIN_USERS를 읽어 관리자 계정 생성
- 비밀번호 원문이 아니라 bcrypt hash를 사용
```

외부 기술은 전부 서비스 객체로 감싼다. 나중에 FashionCLIP 대신 다른 임베딩 모델을 쓰거나, Qdrant 대신 다른 벡터 DB를 쓰더라도 API 계층 전체를 다시 고치지 않도록 한다.

---

## 7. OpenCV/YOLO 전처리 지시

```text
이 프로젝트에서 OpenCV는 핵심이다.
원본 이미지를 그대로 벡터화하지 말고,
가능하면 옷 영역을 먼저 탐지하고 잘라낸 뒤 벡터화한다.

전처리 순서:
1. 업로드 이미지 bytes를 읽는다.
2. PIL Image로 decode한다.
3. numpy array로 변환한다.
4. OpenCV 사용을 위해 BGR로 변환한다.
5. YOLO 모델로 객체 탐지를 수행한다.
6. clothing, cloth 등 의류 관련 class를 우선 선택한다.
7. 바운딩 박스에 padding을 적용한다.
8. 좌표가 이미지 밖으로 나가지 않도록 보정한다.
9. crop된 이미지를 FashionCLIP에 전달한다.
10. crop metadata를 응답에 포함한다.
```

보고서에서는 이 부분을 디지털 영상처리의 핵심 구현으로 설명한다. 단순히 AI 모델만 사용한 것이 아니라, 이미지에서 관심 영역을 분리해 검색 정확도를 높이는 과정이라고 정리한다.

---

## 8. 스키마와 모델 지시

```text
schemas 폴더:
- LoginRequest
- LoginResponse
- AdminUserResponse
- ImageSearchResult
- ImageFeatureAnalysis
- ImageSearchResponse
- ImageUrlSearchRequest
- SavedFashionCreate
- SavedFashionResponse

models 폴더:
- AdminUser
- SavedFashion
```

DB 모델을 그대로 API 응답으로 내보내지 않는다. Pydantic 스키마를 따로 만들어 프론트엔드가 받을 데이터 구조를 고정한다. 이것은 클린 아키텍처에서 말하는 boundary model 또는 DTO와 비슷한 역할로 본다.

---

## 9. 인증과 저장 기능 지시

```text
관리자 로그인은 JWT 기반으로 구현한다.

core/security.py:
- hash_password()
- verify_password()
- create_access_token()
- decode_access_token()

api/deps.py:
- get_current_admin()

auth.py:
- /api/auth/login
- /api/auth/me

saved_fashions.py:
- 로그인한 관리자만 저장 목록 조회
- 로그인한 관리자만 상품 저장
- 로그인한 관리자만 저장 상품 삭제
```

비밀번호 원문을 DB에 저장하지 않는다. MySQL에는 bcrypt hash만 저장한다. React는 로그인 후 받은 access token을 저장하고, 저장 목록 API 요청 시 Authorization 헤더에 포함한다.

---

## 10. 프론트엔드 구조 지시

```text
frontend/src/
  components/
    IntroScreen.tsx
    SearchScreen.tsx
    UploadPanel.tsx
    ImageUploadModal.tsx
    ManualCropper.tsx
    ResultGrid.tsx
    LoginModal.tsx
    SavedFashionModal.tsx
    SearchLoadingOverlay.tsx
  api/
    search.ts
    auth.ts
    savedFashion.ts
```

React + TypeScript로 작성한다. 화면 컴포넌트와 서버 통신 코드를 섞지 않는다. 검색 결과, 로그인 응답, 저장 목록 응답은 TypeScript 타입으로 관리한다.

프론트엔드는 단순히 버튼 몇 개만 있는 화면이 아니라, 실제 사용자가 이미지 검색 서비스를 사용하는 흐름으로 만든다.

```text
1. 인트로 화면에서 검색 시작과 로그인 진입 제공
2. 이미지 업로드 UI 제공
3. 자동 크롭과 수동 크롭 흐름 제공
4. 검색 중 로딩 화면 제공
5. 유사 상품 카드 목록 출력
6. 로그인 상태에서는 저장 버튼 제공
7. 저장된 패션 목록을 모달로 조회
```

---

## 11. 프론트엔드와 백엔드 결합 개발 지시

```text
초기에는 프론트엔드와 백엔드를 따로 개발한다.

1단계:
- 백엔드는 FastAPI, OpenCV, FashionCLIP, Qdrant 검색 기능을 먼저 구현한다.
- Swagger 또는 API 테스트로 이미지 검색 응답 구조를 확인한다.

2단계:
- 프론트엔드는 React 화면과 mock 데이터를 먼저 만든다.
- 업로드, 크롭, 결과 카드, 로그인 모달 UI를 독립적으로 구현한다.

3단계:
- 중간 단계에서 frontend 폴더와 backend 폴더를 한 프로젝트 안으로 합친다.
- React의 api/search.ts, api/auth.ts, api/savedFashion.ts가 FastAPI 엔드포인트를 호출하도록 연결한다.
- CORS, proxy, Docker network 문제를 같이 정리한다.

4단계:
- Docker Compose에서 frontend, backend, mysql, qdrant를 같이 실행한다.
- frontend Nginx가 /api 요청을 backend:8000으로 넘기도록 한다.
- 브라우저에서 실제 업로드부터 검색 결과 출력까지 end-to-end로 확인한다.
```

즉, 처음부터 한 번에 통합 프로젝트를 만든 것이 아니라 프론트엔드와 백엔드를 역할별로 나누어 개발하고, 중간에 두 폴더를 합치면서 API 응답 구조와 화면 상태를 맞춘다. 이 결합 과정에서 CORS, API base URL, Docker 내부 네트워크, 응답 타입 불일치를 해결한다.

---

## 12. Qdrant 데이터 구축 지시

```text
backend/scripts/naver_crop_to_qdrant_fashionclip.py는 데이터 구축용 스크립트이다.

역할:
1. 네이버 쇼핑 API에서 패션 상품을 검색한다.
2. 상품 이미지 URL을 가져온다.
3. 이미지를 다운로드한다.
4. OpenCV/YOLO로 의류 영역을 크롭한다.
5. FashionCLIP으로 이미지 벡터를 만든다.
6. Qdrant 컬렉션에 벡터와 상품 payload를 저장한다.

주의:
- NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET은 코드에 직접 쓰지 않는다.
- 반드시 .env에서 os.getenv()로 읽는다.
- Qdrant collection 이름과 FashionCLIP 모델 이름도 환경변수로 관리할 수 있게 한다.
```

데이터 구축 스크립트도 서비스와 같은 관점으로 작성한다. API 서버와 직접 연결되는 코드는 아니지만, 이미지 전처리, 임베딩, 벡터 DB 저장이라는 핵심 파이프라인을 보여주는 중요한 코드이다.

---

## 13. Docker 및 배포 지시

```text
Docker Compose 컨테이너:
- caddy
- frontend
- backend
- mysql
- qdrant

caddy:
- 외부 80/443 포트 처리
- HTTPS 인증서 자동 발급
- frontend 컨테이너로 요청 전달

frontend:
- React build 결과를 Nginx로 서빙
- /api 요청을 backend로 proxy

backend:
- FastAPI 실행
- OpenCV/YOLO, FashionCLIP, Qdrant, MySQL 처리

mysql:
- 관리자 계정과 저장 상품 목록 저장

qdrant:
- FashionCLIP 이미지 벡터 저장 및 유사도 검색
```

배포 목표는 AWS EC2 서버 한 대에 Docker Compose로 전체 서비스를 올리는 것이다. 도메인은 EC2 public IP에 연결하고, Caddy가 HTTPS를 담당한다. FastAPI, MySQL, Qdrant 포트는 외부에 직접 열지 않는다.

---

## 14. 개발 방법 기록

```text
1. 먼저 Markdown 지시서로 전체 기능과 폴더 구조를 정리한다.
2. 클린 아키텍처를 참고해 계층 분리를 강하게 요구한다.
3. 백엔드는 FastAPI 중심으로 API, services, schemas, models, db, core를 나눈다.
4. 프론트엔드는 React + TypeScript로 components와 api 폴더를 나눈다.
5. 초반에는 프론트엔드와 백엔드를 따로 개발한다.
6. 중간에 frontend 폴더와 backend 폴더를 하나의 레포 안에서 결합한다.
7. 결합 과정에서 API 응답 타입, CORS, Docker proxy 설정을 맞춘다.
8. Qdrant 데이터 구축 스크립트로 상품 이미지 벡터를 미리 저장한다.
9. 업로드 이미지 검색, 로그인, 저장 목록 기능을 end-to-end로 테스트한다.
10. 마지막으로 Docker Compose와 Caddy를 이용해 AWS EC2 배포 구조를 정리한다.
```

개발 과정에서 가장 집요하게 요구한 것은 "기능은 되는데 구조가 무너지는 코드"를 피하는 것이다. 그래서 AI 도구에 코드를 요청할 때도 계속 다음과 같이 지시한다.

```text
main.py에 다 넣지 말고 계층을 나눠라.
OpenCV, FashionCLIP, Qdrant는 services로 빼라.
DB 모델과 API 스키마를 섞지 마라.
프론트 화면 코드와 API 호출 코드를 분리해라.
프론트와 백엔드를 따로 만든 뒤, 중간에 API 계약을 맞춰 합쳐라.
Docker 배포까지 고려해서 경로와 환경변수를 잡아라.
```

이 지시서를 기준으로 개발하면 초보적인 프로젝트에서 출발하더라도 코드가 한 파일에 몰리는 것을 막을 수 있고, 보고서에는 클린 아키텍처를 현실적으로 적용하려고 노력한 개발 과정으로 설명할 수 있다.
