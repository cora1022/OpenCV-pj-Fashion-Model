# Fashion Image Similarity Search

FashionCLIP, OpenCV/YOLO, Qdrant, FastAPI, React를 사용한 패션 이미지 유사도 검색 프로젝트입니다.

사용자가 이미지를 업로드하면 백엔드가 이미지를 FashionCLIP 벡터로 변환하고, Qdrant의 `naver_fashion_images_fashionclip` 컬렉션에서 유사한 네이버 쇼핑 상품을 검색합니다. 로그인한 admin은 마음에 드는 상품을 MySQL 저장 목록에 보관할 수 있습니다.

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

프로젝트의 전체 개발·배포 흐름은 [docs/PROJECT_FLOW.md](docs/PROJECT_FLOW.md)에서 확인할 수 있습니다.

공부와 면접 대비용 학습 자료는 [docs/STUDY_GUIDE.md](docs/STUDY_GUIDE.md)에서 확인할 수 있습니다.
