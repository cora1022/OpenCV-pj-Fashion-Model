# Style Finder Frontend

Style Finder의 React 사용자 인터페이스입니다.

## 현재 기능

- 에디토리얼 스타일 서비스 랜딩 페이지
- 흰색 기반 로그인·회원가입 모달
- 비로그인 검색 시작 시 로그인 안내
- 로그인 후 이미지 업로드와 검색 화면 전환
- JPEG/PNG, 파일 크기, 이미지 픽셀 사전 검증
- 자동 영역 제안과 수동 크롭
- FastAPI 이미지 검색과 카탈로그 ID 재검색
- 유사도, 카테고리, 태그, 원본 링크 결과 표시

회원 API는 `src/api/members.ts`, 검색 API는 `src/api/search.ts`로 분리되어 있습니다.
Access Token은 현재 메모리에만 저장합니다. Refresh Token 쿠키, 새로고침 세션 복원,
검색 기록, 저장 목록과 마이페이지는 아직 연결되지 않았습니다.

## 실행

```powershell
npm ci
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다. Docker의 동일 출처 Caddy를 사용할 때
`VITE_API_BASE_URL`은 비워둘 수 있습니다.

## 검증

```powershell
npm run test
npm run lint
npm run build
```

## API 연결 원칙

- 이미지 검색과 크롭은 FastAPI가 담당합니다.
- 회원과 사용자 활동은 Spring Boot가 담당합니다.
- 화면 컴포넌트에서 서비스 URL을 직접 조합하지 않습니다.
- Access Token은 localStorage와 sessionStorage에 저장하지 않습니다.
- 서버 오류 코드를 사용자가 이해할 수 있는 메시지로 변환합니다.

## 이미지 자산

`public/style-finder-hero.png`와 `public/style-finder-hero-v2.png`는 랜딩 페이지용
프로젝트 비주얼입니다. 네이버 상품 크롭 이미지는 프론트 자산이나 Git 추적 대상에
포함하지 않습니다.
