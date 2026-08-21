type SearchLoadingOverlayProps = {
  isVisible: boolean
  mode: 'initial' | 'more'
  targetCount: number
}

export function SearchLoadingOverlay({ isVisible, mode, targetCount }: SearchLoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="search-loading-overlay" role="status" aria-live="polite">
      <section className="search-loading-card">
        <div className="search-loading-topline">
          <span>STYLE FINDER</span>
          <span>SEARCHING</span>
        </div>
        <p>잠시만 기다려주세요.</p>
        <h2>
          {mode === 'initial'
            ? '사진과 비슷한 이미지를 찾고 있습니다.'
            : `비슷한 이미지 ${targetCount}개를 다시 살펴보고 있습니다.`}
        </h2>
        <div className="search-loading-line" aria-hidden="true"><span /></div>
        <ol>
          <li><span>01</span>옷 영역 확인</li>
          <li><span>02</span>이미지 특징 비교</li>
          <li><span>03</span>검색 결과 정리</li>
        </ol>
      </section>
    </div>
  )
}
