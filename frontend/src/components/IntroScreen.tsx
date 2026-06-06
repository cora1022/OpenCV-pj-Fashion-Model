import {
  useEffect,
  useRef,
} from 'react'
import type { AdminUser } from '../api/auth'

type IntroScreenProps = {
  admin: AdminUser | null
  onStart: () => void
  onLoginClick: () => void
  onLogout: () => void
  onSavedListClick: () => void
}

export function IntroScreen({
  admin,
  onStart,
  onLoginClick,
  onLogout,
  onSavedListClick,
}: IntroScreenProps) {
  const techSectionRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const section = techSectionRef.current
    if (!section) {
      return
    }

    const cards = Array.from(
      section.querySelectorAll('.transition-flow-card, .tech-stack-card'),
    )
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion) {
      cards.forEach((card) => card.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18 },
    )

    cards.forEach((card) => observer.observe(card))

    return () => observer.disconnect()
  }, [])

  return (
    <main className="intro-screen">
      <section className="intro-hero" aria-labelledby="intro-title">
        <div className="intro-copy">
          <div className="brand-row" aria-label="사용 기술">
            <div className="brand-mark logo-card opencv-logo-card" aria-label="OpenCV">
              <img
                src="https://opencv.org/wp-content/uploads/2020/07/OpenCV_logo_no_text-1.svg"
                alt="OpenCV"
              />
            </div>
            <div className="brand-mark logo-card naver-logo-card" aria-label="Naver">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/23/Naver_Logotype.svg"
                alt="Naver"
              />
            </div>
          </div>

          <p className="eyebrow">Fashion AI Search</p>
          <h1 id="intro-title">이미지로 찾는 패션 유사도 검색</h1>
          <p className="intro-description">
            OpenCV 기반 크롭 데이터와 네이버 쇼핑 상품 이미지를 FashionCLIP
            벡터로 연결해, 업로드한 스타일과 가장 가까운 상품을 찾아냅니다.
          </p>

          <div className="intro-actions">
            <button className="primary-button" type="button" onClick={onStart}>
              검색 시작
            </button>
            {admin ? (
              <button className="secondary-button" type="button" onClick={onSavedListClick}>
                저장된 패션 목록
              </button>
            ) : (
              <button className="secondary-button" type="button" onClick={onLoginClick}>
                로그인
              </button>
            )}
          </div>
          <div className="auth-actions">
            {admin ? (
              <>
                <span>{admin.display_name} 로그인 중</span>
                <button className="text-button" type="button" onClick={onLogout}>
                  로그아웃
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="intro-visual" aria-hidden="true">
          <div className="visual-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="visual-frame">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85"
              alt=""
            />
            <div className="scan-box">
              <span>FashionCLIP</span>
            </div>
          </div>
          <div className="result-strip">
            <div>
              <strong>0.806</strong>
              <span>similarity</span>
            </div>
            <div>
              <strong>Top 2</strong>
              <span>Naver Shopping</span>
            </div>
          </div>
        </div>
      </section>
      <div className="dark-stack-zone" ref={techSectionRef}>
        <section className="dark-transition-spacer" aria-labelledby="pipeline-title">
          <div className="dark-motion-layer" aria-hidden="true">
            <span className="motion-line line-one" />
            <span className="motion-line line-two" />
            <span className="motion-dot dot-one" />
            <span className="motion-dot dot-two" />
            <span className="motion-dot dot-three" />
          </div>
          <div className="transition-inner">
            <div className="section-kicker">OpenCV First Pipeline</div>
            <h2 id="pipeline-title">OpenCV로 자르고, FashionCLIP으로 벡터화하고, Qdrant에서 찾습니다</h2>
            <p className="deep-dive-lead">
              이 프로젝트는 단순 업로드 검색이 아니라, 네이버 쇼핑 상품 이미지를
              OpenCV와 YOLO 기반 의류 감지로 정제한 뒤 FashionCLIP 벡터로 변환해
              Qdrant 벡터 DB를 구축하는 이미지 검색 파이프라인입니다.
            </p>
            <div className="transition-flow-grid">
              <article className="transition-flow-card">
                <span>01</span>
                <strong>상품 이미지 적재</strong>
                <p>
                  네이버 쇼핑 API에서 상품 이미지와 가격, 쇼핑몰, 링크 payload를 수집합니다.
                </p>
              </article>
              <article className="transition-flow-card">
                <span>02</span>
                <strong>OpenCV + YOLO 크롭</strong>
                <p>
                  YOLO 패션 감지 박스로 의류 ROI를 찾고 OpenCV로 검색에 필요한 영역을 크롭합니다.
                </p>
              </article>
              <article className="transition-flow-card">
                <span>03</span>
                <strong>FashionCLIP 임베딩</strong>
                <p>
                  크롭된 이미지를 CLIP 계열 패션 벡터로 변환해 이미지 의미를 숫자 공간에 배치합니다.
                </p>
              </article>
              <article className="transition-flow-card">
                <span>04</span>
                <strong>Qdrant 벡터 DB</strong>
                <p>
                  벡터와 상품 payload를 저장하고, 웹 요청 이미지도 같은 방식으로 변환해 유사도를 탐색합니다.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="intro-deep-dive"
          aria-labelledby="stack-title"
        >
          <div className="dark-motion-layer tech-motion-layer" aria-hidden="true">
            <span className="motion-line line-one" />
            <span className="motion-line line-two" />
            <span className="motion-dot dot-one" />
            <span className="motion-dot dot-two" />
            <span className="motion-dot dot-three" />
          </div>
          <div className="deep-dive-inner">
            <div className="section-kicker">Tech Stack</div>
            <h2 id="stack-title">패션 이미지 검색을 구성하는 기술 스택</h2>
            <p className="deep-dive-lead">
              웹에서는 업로드 이미지가 크롭 API를 거쳐 FashionCLIP 벡터로 변환되고,
              Qdrant는 사전에 저장된 네이버 쇼핑 상품 벡터와 비교해 가장 가까운 상품을
              반환합니다. 로그인한 관리자는 마음에 드는 결과를 MySQL 저장 목록으로 관리할 수 있습니다.
            </p>

          <div className="tech-category-grid">
            <section className="tech-category" aria-labelledby="frontend-stack">
              <div>
                <p className="category-label">Frontend</p>
                <h3 id="frontend-stack">사용자 경험</h3>
              </div>
              <div className="tech-card-grid">
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img src="https://cdn.simpleicons.org/react/61DAFB" alt="" />
                    <strong>React</strong>
                  </div>
                  <p>이미지 업로드, 크롭 선택, 결과 카드, 로그인/저장 모달 UI를 구성합니다.</p>
                </article>
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img src="https://cdn.simpleicons.org/typescript/3178C6" alt="" />
                    <strong>TypeScript</strong>
                  </div>
                  <p>검색 응답, 저장 목록, 로그인 상태 타입을 명확히 관리합니다.</p>
                </article>
              </div>
            </section>

            <section className="tech-category" aria-labelledby="backend-stack">
              <div>
                <p className="category-label">Backend</p>
                <h3 id="backend-stack">서버 파이프라인</h3>
              </div>
              <div className="tech-card-grid">
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"
                      alt=""
                    />
                    <strong>FastAPI</strong>
                  </div>
                  <p>이미지 검색 API, 자동 크롭 API, JWT 로그인, 저장 목록 API를 제공합니다.</p>
                </article>
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img
                      src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"
                      alt=""
                    />
                    <strong>Python</strong>
                  </div>
                  <p>OpenCV, FashionCLIP, Qdrant, MySQL 연동 로직을 처리합니다.</p>
                </article>
              </div>
            </section>

            <section className="tech-category" aria-labelledby="ai-stack">
              <div>
                <p className="category-label">AI / Search</p>
                <h3 id="ai-stack">이미지 이해와 벡터 탐색</h3>
              </div>
              <div className="tech-card-grid">
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img
                      className="official-openai-logo"
                      src="https://upload.wikimedia.org/wikipedia/commons/6/66/OpenAI_logo_2025_%28symbol%29.svg"
                      alt=""
                    />
                    <strong>FashionCLIP</strong>
                  </div>
                  <p>업로드 이미지와 상품 이미지를 CLIP 계열 패션 임베딩으로 변환해 의미 기반 비교를 가능하게 합니다.</p>
                </article>
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img
                      src="https://opencv.org/wp-content/uploads/2020/07/OpenCV_logo_no_text-1.svg"
                      alt=""
                    />
                    <strong>OpenCV + YOLOv8</strong>
                  </div>
                  <p>디지털 영상처리 관점에서 의류 ROI를 감지하고, 바운딩 박스 기반 자동 크롭으로 검색 입력을 정제합니다.</p>
                </article>
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img src="https://cdn.simpleicons.org/qdrant/DC244C" alt="" />
                    <strong>Qdrant</strong>
                  </div>
                  <p>상품 벡터와 payload를 저장하고 업로드 이미지와 가까운 상품을 검색합니다.</p>
                </article>
              </div>
            </section>

            <section className="tech-category" aria-labelledby="infra-stack">
              <div>
                <p className="category-label">Infra / Tools</p>
                <h3 id="infra-stack">실행과 데이터 소스</h3>
              </div>
              <div className="tech-card-grid">
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img src="https://cdn.simpleicons.org/docker/2496ED" alt="" />
                    <strong>Docker</strong>
                  </div>
                  <p>FastAPI, React, Qdrant, MySQL을 컨테이너 단위로 묶어 로컬과 서버 환경의 실행 차이를 줄입니다.</p>
                </article>
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img src="/aws-mark.svg" alt="" />
                    <strong>AWS</strong>
                  </div>
                  <p>AWS 서버에 Docker 기반으로 배포하고, 구매한 도메인을 연결해 외부에서 접속 가능한 서비스로 호스팅합니다.</p>
                </article>
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img src="https://cdn.simpleicons.org/github/ffffff" alt="" />
                    <strong>GitHub</strong>
                  </div>
                  <p>소스 코드 버전 관리와 배포 확장을 위한 협업 기반으로 사용합니다.</p>
                </article>
                <article className="tech-stack-card">
                  <div className="stack-title">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/2/23/Naver_Logotype.svg"
                      alt=""
                    />
                    <strong>Naver Shopping API</strong>
                  </div>
                  <p>상품명, 쇼핑몰, 가격, 링크 등 검색 결과에 필요한 상품 정보를 제공합니다.</p>
                </article>
              </div>
            </section>
          </div>
          </div>
        </section>
      </div>
    </main>
  )
}
