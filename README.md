# OpenCV 기반 패션 이미지 유사도 검색

OpenCV/YOLO 전처리, FashionCLIP 이미지 임베딩, Qdrant 벡터 검색, FastAPI, React를 연결한 패션 이미지 유사도 검색 프로젝트입니다.

이 프로젝트의 핵심은 단순히 이미지를 업로드해서 AI 모델에 넣는 것이 아니라, **OpenCV 기반 이미지 전처리로 의류 관심 영역을 먼저 분리한 뒤 검색하는 것**입니다. 사용자가 올린 원본 이미지에는 배경, 얼굴, 손, 주변 사물처럼 패션 검색에 방해되는 정보가 섞일 수 있기 때문에, 백엔드는 먼저 OpenCV 처리에 적합한 배열로 변환하고 YOLO/OpenCV detector를 통해 옷 영역을 찾습니다. 이후 바운딩 박스를 확장하고 이미지 범위를 보정한 뒤 crop된 의류 이미지만 FashionCLIP 벡터로 변환합니다.

즉, 검색 정확도를 만드는 첫 단계는 `FashionCLIP`이 아니라 `OpenCvCropService`의 디지털 영상처리 파이프라인입니다. FashionCLIP과 Qdrant는 OpenCV가 정리한 의류 영역을 기반으로 유사도 검색을 수행합니다. 로그인한 admin은 마음에 드는 상품을 MySQL 저장 목록에 보관할 수 있습니다.

## OpenCV 핵심 구현

OpenCV 관련 핵심 코드는 [backend/app/services/opencv_crop_service.py](backend/app/services/opencv_crop_service.py)에 있습니다.

```text
입력 이미지 bytes
  -> PIL Image decode
  -> RGB 이미지 생성
  -> numpy array 변환
  -> OpenCV 처리를 위한 RGB to BGR 변환
  -> YOLO clothing detector 또는 OpenCV cascade/HOG detector 실행
  -> 의류 후보 bounding box 선택
  -> box padding 확장
  -> 이미지 경계 밖 좌표 보정
  -> 의류 영역 crop
  -> crop metadata와 함께 검색 파이프라인으로 전달
```

OpenCV가 담당하는 역할:

- 원본 이미지를 영상처리 가능한 `numpy` 배열로 변환
- `cv2.cvtColor(..., cv2.COLOR_RGB2BGR)`로 OpenCV 처리 색상 공간에 맞춤
- YOLO 모델이 없을 때 OpenCV cascade 또는 HOG detector로 fallback
- 사람 전체가 탐지된 경우 상반신 영역 중심으로 crop 범위 조정
- 배경보다 옷 영역이 임베딩에 더 크게 반영되도록 관심 영역 추출
- `crop_applied`, `detector`, `crop_box` metadata를 남겨 전처리 결과 확인 가능

이 구조 때문에 본 프로젝트는 단순 쇼핑몰이나 텍스트 검색 프로젝트가 아니라, 입력 영상에서 의미 있는 영역을 찾아내고 그 결과를 머신러닝 검색으로 연결하는 OpenCV 중심 프로젝트입니다.

## 이미지 검색 파이프라인

```text
1. React에서 사용자가 이미지 업로드
2. FastAPI가 이미지 bytes 수신
3. OpenCvCropService가 OpenCV/YOLO 전처리 수행
4. 의류 영역 crop 및 crop metadata 생성
5. FashionClipService가 crop 이미지를 벡터화
6. QdrantSearchService가 벡터 유사도 검색
7. GeminiFeatureService가 색상/소재/스타일 특징 분석
8. React가 유사 상품 카드 출력
9. 로그인한 관리자는 결과를 MySQL에 저장
```

OpenCV 전처리가 빠지면 FashionCLIP은 전체 이미지의 배경과 잡음까지 함께 임베딩할 수 있습니다. 그래서 이 프로젝트에서는 검색 전에 옷 영역을 먼저 분리하는 것을 핵심 설계로 두었습니다.

## 주요 기술

```text
OpenCV
  이미지 색상 공간 변환, detector fallback, HOG 기반 후보 탐지, crop 전처리

YOLO
  의류 영역 bounding box 탐지

FashionCLIP
  crop된 의류 이미지를 feature vector로 변환

Qdrant
  FashionCLIP 벡터 기반 유사도 검색

FastAPI
  이미지 업로드, 검색, 로그인, 저장 목록 API

React + TypeScript
  이미지 업로드, 수동 크롭, 검색 결과 UI

MySQL
  관리자 계정과 저장 상품 목록 관리

Docker Compose + Caddy
  EC2 배포와 HTTPS 프록시 구성
```

## 주요 문서

- [OpenCV 중심 처리 흐름](docs/OPENCV_CORE_PIPELINE.md)
- [클린 아키텍처 기반 개발 지시서](docs/SECTION4_BEGINNER_CLEAN_ARCHITECTURE_PROMPT.md)

## 배포 목표

이 프로젝트의 AWS 배포 방식은 복잡한 AWS 서비스를 여러 개 쓰는 방식이 아닙니다.

목표는 **EC2 서버 한 대에 Docker Compose로 전체 서비스를 올리는 방식**입니다.

```text
EC2 1대
  caddy 컨테이너
    외부 80/443 포트를 받고 HTTPS 인증서를 자동 발급/갱신
    coran1022.com, www.coran1022.com 요청을 frontend:80으로 프록시

  frontend 컨테이너
    React 빌드 결과물을 Nginx로 서빙
    /api 요청을 backend:8000으로 프록시

  backend 컨테이너
    FastAPI 실행
    FashionCLIP, OpenCV/YOLO, Qdrant 검색, 로그인/저장 API 처리

  qdrant 컨테이너
    FashionCLIP 벡터 DB

  mysql 컨테이너
    admin 로그인, 저장된 패션 목록 DB
```

외부 공개 포트:

- `80`: Caddy HTTP, Let's Encrypt 인증용 및 HTTPS 리다이렉트
- `443`: Caddy HTTPS

외부에 직접 공개하지 않는 포트:

- `80`: frontend Nginx, Docker 내부에서만 사용
- `8000`: FastAPI
- `3306`: MySQL
- `6333`: Qdrant HTTP
- `6334`: Qdrant gRPC

브라우저는 `https://coran1022.com`으로 Caddy에 접속합니다. Caddy는 요청을 내부 Docker 네트워크의 `frontend:80`으로 넘기고, frontend Nginx가 `/api/...` 요청을 다시 `backend:8000`으로 넘깁니다.

## 주요 파일

```text
docker-compose.yml
Caddyfile
.env.aws.example
frontend/
  Dockerfile
  nginx.conf
  src/
backend/
  Dockerfile
  requirements.txt
  app/
```

## EC2 한 대에 Docker Compose로 배포하기

### 1. EC2 생성

AWS에서 EC2 Ubuntu 서버를 한 대 생성합니다.

보안 그룹 인바운드 규칙은 최소한 아래만 엽니다.

```text
22  SSH   내 IP만 허용 권장
80  HTTP  0.0.0.0/0
443 HTTPS 0.0.0.0/0
```

FastAPI, MySQL, Qdrant 포트는 보안 그룹에서 열지 않습니다.

### 1-1. 도메인 DNS 설정

도메인 관리 페이지에서 DNS A 레코드를 VPS/EC2 퍼블릭 IP로 연결합니다.

```text
coran1022.com      A    YOUR_SERVER_IP
www.coran1022.com  A    YOUR_SERVER_IP
```

DNS 전파가 끝났는지 확인합니다.

```bash
nslookup coran1022.com
nslookup www.coran1022.com
```

두 결과가 `YOUR_SERVER_IP`를 가리켜야 Caddy가 Let's Encrypt 인증서를 정상 발급받을 수 있습니다.

### 2. EC2에 Docker 설치

EC2에 SSH로 접속한 뒤 Docker와 Compose 플러그인을 설치합니다.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

그 다음 SSH를 다시 접속하거나 아래 명령을 실행합니다.

```bash
newgrp docker
docker --version
docker compose version
```

### 3. 프로젝트 업로드

GitHub에 올린 저장소를 EC2에서 clone합니다.

```bash
git clone <YOUR_REPOSITORY_URL> my-pj
cd my-pj
```

또는 로컬 프로젝트를 `scp`/SFTP로 EC2에 복사해도 됩니다.

### 4. 환경변수 만들기

EC2 서버에서 `.env.aws.example`을 `.env`로 복사합니다.

```bash
cp .env.aws.example .env
nano .env
```

반드시 수정할 값:

```text
MYSQL_PASSWORD
MYSQL_ROOT_PASSWORD
DATABASE_URL 안의 MySQL 비밀번호
JWT_SECRET_KEY
ADMIN_USERS
GEMINI_API_KEY, Gemini 분석을 사용할 경우
CORS_ORIGINS, 도메인을 연결한 경우
```

Docker Compose 내부 연결 값은 아래처럼 둡니다.

```text
DATABASE_URL=mysql+pymysql://fashion_user:change-this-mysql-password@mysql:3306/fashion_app
QDRANT_URL=http://qdrant:6333
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL`은 비워둡니다. 그러면 React 앱은 같은 도메인의 `/api/...`로 요청하고, Nginx가 backend 컨테이너로 프록시합니다.

### 5. admin 계정 준비

비밀번호 원문은 `.env`에 넣지 않습니다. bcrypt 해시를 넣습니다.

로컬 또는 EC2에서 아래 명령으로 해시를 만듭니다.

```bash
python -c "from backend.app.core.security import hash_password; print(hash_password('admin-password'))"
```

`.env`의 `ADMIN_USERS`에 아래 형식으로 넣습니다.

```text
ADMIN_USERS=admin:관리자:<bcrypt_hash>
```

여러 명이면 쉼표로 구분합니다.

```text
ADMIN_USERS=admin1:관리자1:<hash1>,admin2:관리자2:<hash2>,admin3:관리자3:<hash3>
```

### 6. HTTPS 전체 서비스 실행

아래 한 번으로 caddy, frontend, backend, mysql, qdrant가 같이 올라와야 합니다.

```bash
docker compose up -d --build
```

상태 확인:

```bash
docker compose ps
docker compose logs -f backend
```

브라우저에서 확인:

```text
https://coran1022.com
https://coran1022.com/health
https://www.coran1022.com
```

Caddy 인증서 발급 로그는 아래처럼 확인합니다.

```bash
docker compose logs -f caddy
```

처음 실행할 때는 DNS가 아직 전파되지 않았거나 80/443 포트가 막혀 있으면 인증서 발급에 실패할 수 있습니다. DNS와 방화벽을 고친 뒤 다시 `docker compose restart caddy`를 실행하면 됩니다.

### 7. Docker Compose 설정 검증

배포 전에 Compose 파일이 정상 해석되는지 확인합니다.

```bash
docker compose config
```

확인할 점:

- `caddy`만 `ports`로 `80:80`, `443:443`을 공개해야 합니다.
- `frontend`, `backend`, `mysql`, `qdrant`에는 외부 공개용 `ports`가 없어야 합니다.
- `frontend`는 `expose: 80`으로 Docker 내부에서만 접근되어야 합니다.
- `backend`의 `DATABASE_URL`은 `@mysql:3306`을 사용해야 합니다.
- `backend`의 `QDRANT_URL`은 `http://qdrant:6333`이어야 합니다.

## Qdrant 컬렉션 준비

Qdrant 컨테이너만 새로 올리면 컬렉션은 비어 있습니다. 이 상태에서 검색하면 컬렉션이 없거나 데이터가 없어 결과가 나오지 않을 수 있습니다.

컬렉션 이름:

```text
naver_fashion_images_fashionclip
```

이 컬렉션은 단순히 네이버 상품 이미지 URL을 모아 둔 저장소가 아닙니다. 프로젝트를 만들기 전 데이터 구축 단계에서 `backend/scripts/naver_crop_to_qdrant_fashionclip.py`를 실행해 네이버 쇼핑 이미지를 하나씩 검토하고, OpenCV가 제안한 의류 후보 영역 또는 사용자가 직접 선택한 의류 영역을 crop한 뒤 FashionCLIP 벡터로 변환해 저장합니다.

Qdrant 구축 단계의 OpenCV 처리 흐름:

```text
네이버 쇼핑 API 상품 이미지
  -> 이미지 다운로드
  -> PIL RGB 이미지 변환
  -> numpy array 변환
  -> OpenCV RGB to BGR 변환
  -> OpenCV HOG로 사람/상반신 후보 영역 탐지
  -> 의류 영역 crop 후보를 GUI에 표시
  -> 사용자가 후보를 보정하거나 직접 crop
  -> crop된 의류 이미지 저장
  -> FashionCLIP vector 생성
  -> Qdrant payload + vector upsert
```

이 과정을 거치기 때문에 Qdrant의 기준 데이터는 원본 쇼핑몰 이미지 전체가 아니라 의류 관심 영역 중심으로 쌓입니다. 사용자가 업로드한 이미지도 검색 시 OpenCV 전처리를 거치므로, 저장 데이터와 검색 데이터 모두 의류 영역 기준으로 비교됩니다.

### 방법 A. 서버에서 재색인

EC2 서버에 네이버 쇼핑 API 설정, 이미지 적재 스크립트, 필요한 모델 파일이 준비되어 있다면 서버에서 다시 색인합니다.

예시:

```bash
docker compose up -d qdrant
# 필요한 env/model/API 설정 후 색인 스크립트 실행
python naver_crop_to_qdrant_fashionclip.py
```

색인이 끝나면 전체 서비스를 실행합니다.

```bash
docker compose up -d --build
```

### 방법 B. 로컬 Qdrant 데이터를 서버로 옮기기

로컬에서 이미 Qdrant 컬렉션을 만들었다면 `qdrant_storage` 데이터를 EC2로 옮길 수 있습니다.

권장 흐름:

1. 로컬 Qdrant를 중지합니다.
2. 로컬 `qdrant_storage` 폴더를 압축합니다.
3. EC2로 업로드합니다.
4. EC2의 Docker 볼륨 또는 bind mount 위치에 복원합니다.
5. Qdrant 컨테이너를 다시 시작합니다.

Docker named volume을 쓰고 있다면 EC2에서 임시 컨테이너로 볼륨에 복사해야 할 수 있습니다.

간단히 관리하고 싶다면 `docker-compose.yml`의 Qdrant 볼륨을 아래처럼 서버 폴더 bind mount로 바꿔 운영할 수도 있습니다.

```yaml
qdrant:
  volumes:
    - ./qdrant_storage:/qdrant/storage
```

이 경우 로컬의 `qdrant_storage` 폴더를 EC2 프로젝트 루트에 그대로 업로드하면 됩니다.

## Caddy와 Nginx 프록시

`Caddyfile`은 도메인 요청을 frontend 컨테이너로 넘깁니다.

```caddyfile
coran1022.com, www.coran1022.com {
    encode gzip zstd
    reverse_proxy frontend:80
}
```

`frontend/nginx.conf`는 React 정적 파일을 서빙하고 API 요청을 backend 컨테이너로 넘깁니다.

```nginx
location /api/ {
    proxy_pass http://backend:8000/api/;
}

location /health {
    proxy_pass http://backend:8000/health;
}
```

따라서 브라우저는 Caddy의 443 포트로만 접속하고, frontend/backend 포트에 직접 접근하지 않습니다.

## 로컬 개발

로컬에서 프론트와 백엔드를 따로 실행할 때는 `frontend/.env`에 아래처럼 둘 수 있습니다.

```text
VITE_API_BASE_URL=http://localhost:8000
```

Docker Compose 배포에서는 `VITE_API_BASE_URL`을 비워서 같은 도메인의 `/api`를 사용합니다.

## 운영 체크리스트

- `.env`는 Git에 올리지 않습니다.
- EC2/VPS 방화벽에서 22, 80, 443만 엽니다.
- 8000, 3306, 6333, 6334는 외부에 열지 않습니다.
- `docker compose ps`에서 5개 서비스가 모두 Up인지 확인합니다.
- `/health`가 정상 응답하는지 확인합니다.
- `docker compose logs -f caddy`에서 인증서 발급 오류가 없는지 확인합니다.
- Qdrant 컬렉션이 존재하고 데이터가 들어 있는지 확인합니다.
- EC2 디스크에 MySQL/Qdrant 데이터가 쌓이므로 주기적으로 백업합니다.

## 추가 기술 문서

OpenCV 전처리가 왜 검색 품질의 핵심인지 정리한 문서는 [docs/OPENCV_CORE_PIPELINE.md](docs/OPENCV_CORE_PIPELINE.md)에서 확인할 수 있습니다.

클린 아키텍처를 요구하며 프론트엔드와 백엔드를 결합해 개발한 지시서는 [docs/SECTION4_BEGINNER_CLEAN_ARCHITECTURE_PROMPT.md](docs/SECTION4_BEGINNER_CLEAN_ARCHITECTURE_PROMPT.md)에서 확인할 수 있습니다.
