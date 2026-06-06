import type { CSSProperties } from 'react'

type FeatureBarStyle = CSSProperties & {
  '--bar-size': string
}

type VectorPointStyle = CSSProperties & {
  '--x': string
  '--y': string
  '--delay': string
}

type SearchLoadingOverlayProps = {
  isVisible: boolean
  mode: 'initial' | 'more'
  targetCount: number
}

export function SearchLoadingOverlay({
  isVisible,
  mode,
  targetCount,
}: SearchLoadingOverlayProps) {
  if (!isVisible) {
    return null
  }

  return (
    <div className="search-loading-overlay" role="status" aria-live="polite">
      <div className="fashion-loading-stage">
        <div className="fashion-loading-header">
          <span>FastAPI Backend Pipeline</span>
          <h2>
            {mode === 'initial'
              ? '서버에서 이미지를 벡터로 변환하고 Qdrant를 탐색합니다'
              : `Qdrant 벡터 그래프에서 후보 ${targetCount}개를 확장합니다`}
          </h2>
        </div>

        <div className="backend-flow-rail" aria-hidden="true">
          <span>Upload</span>
          <i />
          <span>FastAPI</span>
          <i />
          <span>OpenCV</span>
          <i />
          <span>CLIP</span>
          <i />
          <span>Qdrant</span>
        </div>

        <div className="fashion-search-flow">
          <section className="garment-scan-panel" aria-label="이미지 ROI 스캔">
            <div className="scan-device">
              <div className="scan-garment">
                <span className="garment-neck" />
                <span className="garment-body" />
                <span className="garment-sleeve sleeve-left" />
                <span className="garment-sleeve sleeve-right" />
              </div>
              <span className="scan-window" />
              <span className="scan-beam" />
              <span className="crop-corner corner-a" />
              <span className="crop-corner corner-b" />
              <span className="crop-corner corner-c" />
              <span className="crop-corner corner-d" />
            </div>
            <div className="stage-caption">
              <strong>백엔드 OpenCV 처리</strong>
              <span>업로드 이미지에서 의류 ROI를 정규화합니다</span>
            </div>
          </section>

          <section className="feature-vector-panel" aria-label="특징 벡터 추출">
            <div className="feature-vector-visual">
              <div className="feature-orb">
                <span className="orb-ring ring-a" />
                <span className="orb-ring ring-b" />
                <span className="orb-core">512</span>
              </div>
              <div className="feature-bars">
                <span style={{ '--bar-size': '72%' } as FeatureBarStyle} />
                <span style={{ '--bar-size': '48%' } as FeatureBarStyle} />
                <span style={{ '--bar-size': '86%' } as FeatureBarStyle} />
                <span style={{ '--bar-size': '61%' } as FeatureBarStyle} />
                <span style={{ '--bar-size': '78%' } as FeatureBarStyle} />
              </div>
            </div>
            <div className="vector-stream">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="stage-caption">
              <strong>FashionCLIP 변환</strong>
              <span>색상, 질감, 실루엣을 512차원 벡터로 투영합니다</span>
            </div>
          </section>

          <section className="ranking-panel" aria-label="Qdrant 벡터 그래프 검색">
            <div className="qdrant-vector-space">
              <span className="vector-axis axis-x" />
              <span className="vector-axis axis-y" />
              <span className="query-vector">Q</span>
              <span className="nearest-ring" />
              <span className="similarity-line line-a" />
              <span className="similarity-line line-b" />
              <span className="similarity-line line-c" />
              <span className="vector-point hit" style={{ '--x': '63%', '--y': '40%', '--delay': '0s' } as VectorPointStyle} />
              <span className="vector-point hit" style={{ '--x': '72%', '--y': '53%', '--delay': '0.2s' } as VectorPointStyle} />
              <span className="vector-point hit" style={{ '--x': '55%', '--y': '58%', '--delay': '0.4s' } as VectorPointStyle} />
              <span className="vector-point" style={{ '--x': '24%', '--y': '30%', '--delay': '0.1s' } as VectorPointStyle} />
              <span className="vector-point" style={{ '--x': '38%', '--y': '72%', '--delay': '0.3s' } as VectorPointStyle} />
              <span className="vector-point" style={{ '--x': '80%', '--y': '24%', '--delay': '0.5s' } as VectorPointStyle} />
              <span className="vector-point" style={{ '--x': '20%', '--y': '62%', '--delay': '0.7s' } as VectorPointStyle} />
            </div>
            <div className="stage-caption">
              <strong>Qdrant 벡터 그래프 탐색</strong>
              <span>쿼리 벡터 주변의 nearest neighbors를 찾습니다</span>
            </div>
          </section>
        </div>

        <div className="search-progress-steps">
          <div>
            <span className="step-dot active" />
            <strong>OpenCV ROI</strong>
          </div>
          <div>
            <span className="step-dot active delay-a" />
              <strong>CLIP Vector</strong>
          </div>
          <div>
            <span className="step-dot active delay-b" />
            <strong>Qdrant Search</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
