import type { Member } from '../api/members'

type IntroScreenProps = {
  member: Member | null
  onStart: () => void
  onLogin: () => void
  onSignup: () => void
  onLogout: () => void
}

const discoverySteps = [
  {
    number: '01',
    title: '사진 선택',
    description: '저장해 둔 사진이나 직접 찍은 사진을 올립니다.',
  },
  {
    number: '02',
    title: '검색할 옷 확인',
    description: '자동으로 찾은 의류 영역을 확인하고 필요한 부분만 선택합니다.',
  },
  {
    number: '03',
    title: '결과 확인',
    description: '색상과 형태가 비슷한 이미지를 유사도 순으로 확인합니다.',
  },
]

export function IntroScreen({ member, onStart, onLogin, onSignup, onLogout }: IntroScreenProps) {
  return (
    <main className="fashion-home">
      <header className="fashion-nav">
        <a className="fashion-logo" href="#top" aria-label="Style Finder 홈">
          STYLE FINDER
        </a>

        <nav aria-label="메인 메뉴">
          <a href="#service">서비스 소개</a>
          <a href="#how">사용 방법</a>
          <a
            href="https://github.com/cora1022/fashion-portfolio-project"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>

        <div className="fashion-member-actions">
          {member ? (
            <>
              <span>{member.displayName}님</span>
              <button type="button" className="fashion-auth-link" onClick={onLogout}>로그아웃</button>
            </>
          ) : (
            <>
              <button type="button" className="fashion-auth-link" onClick={onLogin}>로그인</button>
              <button type="button" className="fashion-auth-link" onClick={onSignup}>회원가입</button>
            </>
          )}
          <button type="button" className="fashion-search-link" onClick={onStart}>
            이미지 검색
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <section className="fashion-hero" id="top" aria-labelledby="fashion-hero-title">
        <img
          className="fashion-hero-image"
          src="/style-finder-hero-v2.png"
          alt="버건디 재킷과 크림색 팬츠 스타일링"
        />
        <div className="fashion-hero-shade" aria-hidden="true" />

        <div className="fashion-hero-content">
          <p className="fashion-overline">이미지로 비슷한 옷 찾기</p>
          <h1 id="fashion-hero-title">
            이미지로 찾는
            <span>패션 유사도<br />검사 서비스</span>
          </h1>
          <p className="fashion-hero-copy">
            저장해 둔 코디 사진이나 직접 찍은 사진을 올려주세요.<br className="fashion-desktop-break" />
            찾고 싶은 옷을 고르면 비슷한 이미지를 보여드립니다.
          </p>
          <div className="fashion-hero-actions">
            <button type="button" onClick={onStart}>
              이미지 선택하기
              <span aria-hidden="true">→</span>
            </button>
            <a href="#how">검색 방법 보기</a>
          </div>
        </div>

        <div className="fashion-hero-flow" aria-label="이미지 검색 순서">
          <div><span>01</span><strong>사진 업로드</strong></div>
          <div><span>02</span><strong>의류 영역 확인</strong></div>
          <div><span>03</span><strong>유사 이미지 검색</strong></div>
        </div>

      </section>

      <section className="fashion-intro" id="service" aria-labelledby="fashion-intro-title">
        <div className="fashion-section-label">
          <span>01</span>
          <p>서비스 소개</p>
        </div>
        <div className="fashion-intro-copy">
          <h2 id="fashion-intro-title">
            사진 속 옷의 특징을 비교해<br />
            비슷한 이미지를 찾습니다.
          </h2>
          <p>
            사진을 올리면 서버가 이미지에서 의류 영역을 찾습니다. 사용자가 검색할
            부분을 확인하면, 해당 영역과 특징이 비슷한 이미지를 순서대로 보여줍니다.
          </p>
        </div>
      </section>

      <section className="fashion-process" id="how" aria-labelledby="fashion-process-title">
        <div className="fashion-process-heading">
          <div className="fashion-section-label fashion-section-label-light">
            <span>02</span>
            <p>사용 방법</p>
          </div>
          <h2 id="fashion-process-title">사진을 올리고<br />찾고 싶은 옷을 선택하세요.</h2>
        </div>

        <div className="fashion-step-list">
          {discoverySteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fashion-demo" aria-labelledby="fashion-demo-title">
        <div className="fashion-demo-copy">
          <div className="fashion-section-label">
            <span>03</span>
            <p>검색해 보기</p>
          </div>
          <h2 id="fashion-demo-title">가지고 있는 사진으로<br />직접 검색해 보세요.</h2>
          <p>
            JPG 또는 PNG 파일을 올린 다음 검색할 영역을 확인하면 됩니다.
            결과 화면에서는 각 이미지의 유사도도 함께 확인할 수 있습니다.
          </p>
          <button type="button" onClick={onStart}>
            검색 화면 열기
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="fashion-search-preview" aria-label="이미지 검색 결과 예시">
          <div className="fashion-preview-header">
            <span>STYLE FINDER / 이미지 검색</span>
            <span>01—03</span>
          </div>
          <div className="fashion-preview-content">
            <figure>
              <img src="/style-finder-hero.png" alt="검색할 파란색 셔츠" />
              <span className="fashion-select-frame" aria-hidden="true" />
              <figcaption>선택한 영역</figcaption>
            </figure>
            <div className="fashion-preview-results">
              <p>비슷한 결과</p>
              <div className="fashion-result-row">
                <span className="fashion-color-chip chip-cobalt" />
                <div><strong>파란색 오버핏 셔츠</strong><small>여유로운 핏 · 면</small></div>
                <em>94%</em>
              </div>
              <div className="fashion-result-row">
                <span className="fashion-color-chip chip-navy" />
                <div><strong>남색 린넨 셔츠</strong><small>오버핏 · 린넨</small></div>
                <em>89%</em>
              </div>
              <div className="fashion-result-row">
                <span className="fashion-color-chip chip-stone" />
                <div><strong>그레이 블루 셔츠</strong><small>기본핏 · 면</small></div>
                <em>84%</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="fashion-project-note" aria-label="포트폴리오 프로젝트 안내">
        <p>개인 포트폴리오 프로젝트</p>
        <strong>React, Spring Boot, FastAPI를 분리해 구성하고 있습니다.</strong>
        <span>회원 인증과 사용자 활동 기능을 단계적으로 통합하고 있습니다.</span>
        <a
          href="https://github.com/cora1022/fashion-portfolio-project"
          target="_blank"
          rel="noreferrer"
        >
          GitHub에서 코드 보기 ↗
        </a>
      </aside>

      <footer className="fashion-footer">
        <a className="fashion-logo" href="#top">STYLE FINDER</a>
        <p>사진으로 비슷한 옷 찾기</p>
        <span>© 2026</span>
      </footer>
    </main>
  )
}
