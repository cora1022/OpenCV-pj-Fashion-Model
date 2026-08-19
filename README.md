# Style Finder

이미지로 찾는 패션 유사도 검사 서비스입니다. 현재는 React UI, FastAPI 이미지
전처리·임베딩 API, Qdrant 카탈로그 검색을 갖춘 포트폴리오 기준선입니다.

Spring Boot 회원 서비스는 아직 구현하지 않았습니다. 따라서 이 저장소는 완성된
마이크로서비스가 아니라, 그 전에 검색 서비스를 안전하고 재현 가능하게 만드는 단계입니다.

## 현재 구현

- JPEG/PNG 업로드 검증: 최대 10MiB, 최대 1,600만 픽셀
- OpenCV/YOLO 기반 관심 영역 크롭과 수동 크롭 UI
- FashionCLIP 임베딩과 Qdrant 유사도 검색
- 권리 메타데이터를 포함한 로컬 카탈로그 manifest·인덱서
- `/health/live`와 `/health/ready` 분리, Docker healthcheck

실제 카탈로그 이미지는 아직 포함하지 않았습니다. 이미지를 소유하거나 재배포할
권리가 있을 때만 `catalog/images`에 추가하고 manifest에 권리 정보를 기록해야 합니다.

## 실행

```powershell
uv sync --frozen
uv run pytest backend/tests -q
cd frontend; npm ci; npm run test; npm run build; npm run lint
```

카탈로그 준비 방법은 [catalog/README.md](catalog/README.md), API 계약은
[docs/API.md](docs/API.md)를 참고하세요. Docker 로컬 구성은 다음과 같습니다.

```powershell
docker compose --env-file .env.example config
docker compose up -d --build
```

카탈로그를 적재하지 않은 새 환경에서는 `/health/live`가 200, `/health/ready`가
503을 반환하는 것이 정상입니다.

## 책임 경계

```text
Browser → Caddy → / React (Nginx static files)
                → /api/search/*, /api/preprocess/*, /api/catalog/* FastAPI → Qdrant
                → /api/members/* Spring Boot → MySQL (예정)
```

FastAPI와 이후 Spring Boot는 데이터베이스를 공유하지 않습니다. 회원, 인증, 검색
기록, 저장 목록은 검색 계약과 재현성 기준선이 안정된 뒤 Spring Boot가 맡습니다.

## 제한 사항

- HOG fallback은 의류 탐지가 아니라 사람 상반신 추정입니다.
- YOLO가 의류 클래스를 감지하지 못하면 원본 이미지를 유지합니다.
- 일반 테스트/CI는 실제 모델 다운로드와 Qdrant 검색을 수행하지 않습니다.
- 모델 cold start, warm search 시간은 실제 권리 카탈로그가 제공된 뒤 기록합니다.
