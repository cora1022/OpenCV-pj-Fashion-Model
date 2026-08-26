import type { SearchResult } from '../api/search'

type ResultGridProps = {
  results: SearchResult[]
  isLoading: boolean
  isLoadingMore: boolean
  revealKey: number
  saveStates?: Record<string, 'saving' | 'saved' | 'duplicate' | 'error'>
  onFindMore: () => void
  onFindSimilarResult: (item: SearchResult) => void
  onSaveResult?: (item: SearchResult) => void
}

export function ResultGrid({ results, isLoading, isLoadingMore, revealKey, saveStates = {}, onFindMore, onFindSimilarResult, onSaveResult }: ResultGridProps) {
  return (
    <section className="panel result-panel" aria-labelledby="result-title">
      <div className="panel-heading"><p className="eyebrow">Step 2</p><h2 id="result-title">검색 결과</h2></div>
      {isLoading ? <div className="empty-results"><p>검색 중입니다.</p></div> : results.length === 0 ? <div className="empty-results"><p>이미지를 업로드하고 검색하면 결과가 표시됩니다.</p></div> : <div>
        <div className="result-summary"><p>비슷한 이미지 {results.length}개를 찾았습니다.</p><button className="secondary-button" type="button" onClick={onFindMore} disabled={isLoadingMore}>{isLoadingMore ? '추가 검색 중...' : '다음 2개 더 찾기'}</button></div>
        <div className="result-grid result-grid-pop" key={revealKey}>{results.map((item) => <article className="result-card" key={item.catalogItemId}>
          <img src={item.imageUrl} alt={item.title} />
          <div className="result-card-body"><h3>{item.title}</h3><p className="mall-name">{item.metadata.category}</p><p className="price-text">{item.metadata.colors.join(', ') || '색상 정보 없음'}</p><p className="score-text">유사도 {(item.similarityScore * 100).toFixed(1)}%</p>
          {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">원본 보기</a> : <span className="disabled-link">로컬 카탈로그</span>}
          <div className="result-card-actions">
            <button className="save-result-button" type="button" onClick={() => onFindSimilarResult(item)}>비슷한 결과</button>
            {onSaveResult && <button
              className="save-result-button"
              type="button"
              disabled={saveStates[item.catalogItemId] === 'saving' || saveStates[item.catalogItemId] === 'saved'}
              onClick={() => onSaveResult(item)}
            >
              {saveStates[item.catalogItemId] === 'saving' ? '저장 중...' : saveStates[item.catalogItemId] === 'saved' ? '저장됨' : saveStates[item.catalogItemId] === 'duplicate' ? '이미 저장됨' : saveStates[item.catalogItemId] === 'error' ? '다시 저장' : '저장'}
            </button>}
          </div></div>
        </article>)}</div>
      </div>}
    </section>
  )
}
