import type { ImageFeatureAnalysis, SearchResult } from '../api/search'

type ResultGridProps = {
  results: SearchResult[]
  imageFeatures: ImageFeatureAnalysis | null
  isLoading: boolean
  isLoadingMore: boolean
  revealKey: number
  onFindMore: () => void
  onSaveResult: (item: SearchResult) => void
  onFindSimilarResult: (item: SearchResult) => void
}

function formatScore(score: number) {
  if (score <= 1) {
    return `${(score * 100).toFixed(1)}%`
  }

  return score.toFixed(3)
}

function formatPrice(item: SearchResult) {
  const price = item.price || item.lprice || item.hprice

  if (!price) {
    return '가격 정보 없음'
  }

  const numericPrice = Number(price)
  if (Number.isNaN(numericPrice)) {
    return price
  }

  return `${numericPrice.toLocaleString('ko-KR')}원`
}

export function ResultGrid({
  results,
  imageFeatures,
  isLoading,
  isLoadingMore,
  revealKey,
  onFindMore,
  onSaveResult,
  onFindSimilarResult,
}: ResultGridProps) {
  return (
    <section className="panel result-panel" aria-labelledby="result-title">
      <div className="panel-heading">
        <p className="eyebrow">Step 2</p>
        <h2 id="result-title">유사도 검색 결과</h2>
      </div>

      {isLoading ? (
        <div className="empty-results">
          <p>검색 파이프라인을 실행하고 있습니다.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-results">
          <p>이미지를 업로드하고 검색하면 유사한 패션 아이템이 표시됩니다.</p>
        </div>
      ) : (
        <div>
          <FeatureSummary imageFeatures={imageFeatures} />

          <div className="result-summary">
            <p>
              {results.length <= 2
                ? '가장 가까운 상품 2개를 찾았습니다.'
                : `유사한 패션 상품 ${results.length}개를 찾았습니다.`}
            </p>
            <button
              className="secondary-button"
              type="button"
              onClick={onFindMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? '추가 검색 중...' : '다음 2개 더 찾기'}
            </button>
          </div>

          <div className="result-grid result-grid-pop" key={revealKey}>
            {results.map((item) => (
              <article
                className="result-card"
                key={`${item.product_id || item.link || item.title}-${item.score}`}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title || '유사 상품 이미지'} />
                ) : (
                  <div className="missing-image">이미지 없음</div>
                )}
                <div className="result-card-body">
                  <h3>{item.title || '상품명 없음'}</h3>
                  <p className="mall-name">{item.mall_name || '쇼핑몰 정보 없음'}</p>
                  <p className="price-text">{formatPrice(item)}</p>
                  <p className="score-text">유사도 {formatScore(item.score)}</p>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      상품 보러가기
                    </a>
                  ) : (
                    <span className="disabled-link">상품 링크 없음</span>
                  )}
                  <button
                    className="save-result-button"
                    type="button"
                    disabled={!item.image_url}
                    onClick={() => onFindSimilarResult(item)}
                  >
                    이 상품으로 유사 검색
                  </button>
                  <button
                    className="save-result-button"
                    type="button"
                    onClick={() => onSaveResult(item)}
                  >
                    저장
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function FeatureSummary({
  imageFeatures,
}: {
  imageFeatures: ImageFeatureAnalysis | null
}) {
  if (!imageFeatures) {
    return null
  }

  if (!imageFeatures.available) {
    return (
      <div className="feature-summary is-muted">
        <div>
          <p className="eyebrow">Gemini Image Features</p>
          <h3>이미지 특징 분석 대기 중</h3>
        </div>
        <p>{imageFeatures.error || '분석 결과를 불러오지 못했습니다.'}</p>
      </div>
    )
  }

  const chips = [
    ...(imageFeatures.colors || []),
    ...(imageFeatures.materials || []),
    ...(imageFeatures.patterns || []),
    ...(imageFeatures.style_keywords || []),
    ...(imageFeatures.search_keywords || []),
  ].slice(0, 12)

  return (
    <div className="feature-summary">
      <div className="feature-summary-heading">
        <div>
          <p className="eyebrow">Gemini Image Features</p>
          <h3>{formatFeatureTitle(imageFeatures)}</h3>
        </div>
        <span>분석</span>
      </div>
      {imageFeatures.summary && <p>{imageFeatures.summary}</p>}
      {chips.length > 0 && (
        <div className="feature-chip-list">
          {chips.map((chip) => (
            <span key={chip}>{chip}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function formatFeatureTitle(imageFeatures: ImageFeatureAnalysis) {
  const itemType = normalizeFeatureText(imageFeatures.item_type)

  if (itemType) {
    return `${itemType} 이미지의 특징을 분석했습니다.`
  }

  const firstKeyword = [
    ...(imageFeatures.search_keywords || []),
    ...(imageFeatures.style_keywords || []),
  ]
    .map(normalizeFeatureText)
    .find(Boolean)

  if (firstKeyword) {
    return `${firstKeyword} 스타일 이미지의 특징을 분석했습니다.`
  }

  return '패션 이미지의 특징을 분석했습니다.'
}

function normalizeFeatureText(value?: string | null) {
  if (!value) {
    return ''
  }

  return value
    .replace(/^\s*\[/, '')
    .replace(/\]\s*$/, '')
    .replace(/['"]/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ')
}
