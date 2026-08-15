# Style Finder Frontend

Style Finder의 React 사용자 인터페이스입니다.

## 현재 기능

- 서비스 랜딩 페이지
- 이미지 파일과 이미지 URL 입력
- 자동 감지 영역 확인
- 수동 크롭
- FastAPI 검색 요청
- 유사 이미지와 유사도 표시
- 선택적 이미지 특징 분석 결과 표시

현재 프론트엔드는 FastAPI만 호출합니다. 로그인, 회원 정보, 검색 기록, 저장 목록 UI는 Spring Boot Member API 구현 후 추가합니다.

## 실행

```powershell
npm ci
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다.

FastAPI 주소가 다른 경우 `frontend/.env`에 다음 값을 설정합니다.

```text
VITE_API_BASE_URL=http://localhost:8000
```

Docker의 동일 출처 프록시를 사용할 때는 값을 비워둘 수 있습니다.

## 검증

```powershell
npm run build
npm run lint
```

## API 연결 원칙

- 이미지 검색과 크롭 요청은 FastAPI가 담당합니다.
- 회원과 사용자 활동 요청은 Spring Boot 추가 후 별도 API 모듈로 분리합니다.
- 화면 컴포넌트에서 API URL을 직접 조합하지 않습니다.
- 각 서비스의 오류를 사용자가 이해할 수 있는 메시지로 표시합니다.

## 이미지 자산

`public/style-finder-hero.png`와 `public/style-finder-hero-v2.png`는 이 포트폴리오 랜딩 페이지를 위해 별도로 제작한 비주얼입니다. 외부 상품 이미지를 프론트엔드 데모 데이터로 포함하지 않습니다.
