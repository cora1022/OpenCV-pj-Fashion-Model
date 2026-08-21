# Style Finder

사진에서 선택한 옷과 비슷한 카탈로그 이미지를 찾는 패션 이미지 유사도 검색
포트폴리오입니다. OpenCV 기반 관심 영역 전처리, FashionCLIP 임베딩, Qdrant
벡터 검색에 Spring Boot 회원 서비스와 MySQL을 결합하고 있습니다.

현재 React, FastAPI, Spring Boot, Qdrant, MySQL, Caddy가 하나의 Docker Compose
스택으로 실행됩니다. 서비스 경계는 구현되어 있지만 인증과 사용자 활동 기능의 통합이
진행 중이므로 완성된 마이크로서비스라고 표현하지 않습니다.

## 현재 구현

### 사용자 화면

- 에디토리얼 스타일 랜딩·로그인·회원가입 화면
- 로그인 후 이미지 업로드, 자동·수동 크롭, 유사 이미지 검색
- JPEG/PNG 사전 검증: 최대 10MiB, 최대 1,600만 픽셀
- 카탈로그 ID 기반 재검색과 유사도 결과 표시

### 이미지 검색 서비스

- FastAPI 업로드 검증과 안전한 오류 응답
- OpenCV/YOLO 관심 영역 제안과 사람 상반신 HOG fallback
- FashionCLIP 512차원 임베딩과 Qdrant 코사인 유사도 검색
- 임의 URL 다운로드 API 제거와 로컬 manifest 기반 이미지 제공
- 추론 thread offload, 동시 실행 제한, liveness/readiness
- 권리 메타데이터 기반 카탈로그 인덱서와 로컬 legacy 마이그레이션 도구

### 회원 서비스 기준선

- Spring Boot 3, Java 21, Spring Security
- 회원가입·로그인·내 정보 조회
- BCrypt 비밀번호 해시
- Access/Refresh Token 발급과 Refresh Token 해시 저장·회전·폐기
- MySQL과 Flyway V1/V2 migration
- 검색 기록·저장 결과용 JPA 엔티티와 API 기준선

## 아직 완료되지 않은 기능

- FastAPI 검색 API의 서버 측 Access Token 검증
- HttpOnly 쿠키 기반 Refresh Token과 React 세션 복원
- 검색 기록·저장 목록·마이페이지 React 연결
- Spring Security 401/403 공통 오류 응답
- 회원 서비스 DB readiness와 실제 검색 실행 timeout
- Spring Boot 자동 테스트와 GitHub Actions 검증
- 공개 배포 가능한 권리 확보 카탈로그

현재 로그인 제한은 React 사용자 흐름에 적용되어 있습니다. 검색 API 자체의 인증은 다음
보안 단계에서 Spring 발급 토큰을 FastAPI가 검증하는 방식으로 추가할 예정입니다.

## 아키텍처

```text
Browser
  → Caddy
    → /                         React · Nginx
    → /api/members/*            Spring Boot → MySQL
    → /api/search/*             FastAPI → Qdrant
    → /api/preprocess/*         FastAPI
    → /api/catalog/*            FastAPI
```

Spring Boot와 FastAPI는 데이터베이스를 공유하지 않습니다. Spring Boot는 회원과 사용자
활동 데이터를, FastAPI는 이미지 처리와 벡터 검색을 소유합니다. 자세한 내용은
[아키텍처 문서](docs/ARCHITECTURE.md)를 참고하세요.

## 로컬 실행

JDK 21, Docker Desktop이 필요합니다. `.env.example`의 비밀번호와 JWT 값은 로컬 실행
기본값일 뿐 운영 환경에서 사용하면 안 됩니다.

```powershell
docker compose --env-file .env.example config
docker compose --env-file .env.example up -d --build
docker compose --env-file .env.example ps
```

접속 주소는 `http://localhost`입니다.

권리 확보 카탈로그가 없는 새 환경에서는 랜딩·회원·크롭 기능은 실행되지만
`/health/ready`가 503을 반환하고 검색 결과는 제공되지 않습니다. 카탈로그 준비 방법은
[catalog/README.md](catalog/README.md)를 참고하세요.

## 검증

```powershell
uv sync --frozen
uv run ruff check backend
uv run pytest backend/tests -q

cd frontend
npm ci
npm run test
npm run lint
npm run build

cd ../member-service
./gradlew test
./gradlew bootJar
```

현재 FastAPI 테스트 14개와 React 테스트 3개가 있으며, Spring Boot 테스트는 다음 구현
단계에서 추가할 예정입니다.

## 데이터 정책

기존 네이버 쇼핑 API에서 수집한 크롭 이미지와 벡터는 로컬 기능 확인에만 사용합니다.
이미지, 로컬 manifest, Qdrant 볼륨은 Git과 Docker 빌드 컨텍스트에서 제외됩니다.
공개 저장소나 공개 배포에는 소유권 또는 재배포 권리가 확인된 카탈로그만 사용해야 합니다.

자세한 정책은 [DATA_POLICY.md](docs/DATA_POLICY.md)를 참고하세요.

## 알려진 제한

- HOG fallback은 의류 탐지가 아니라 사람 상반신 추정입니다.
- YOLO가 의류 클래스를 감지하지 못하면 원본 이미지를 유지합니다.
- legacy 벡터의 정확한 FashionCLIP commit revision은 확인되지 않았습니다.
- 일반 CI에서는 실제 모델 다운로드와 Qdrant 통합 검색을 수행하지 않습니다.
- cold start와 warm search 성능 측정은 권리 확보 카탈로그 준비 후 공개할 예정입니다.

## Repository

https://github.com/cora1022/fashion-portfolio-project
