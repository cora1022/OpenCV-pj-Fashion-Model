import type { ChangeEvent, DragEvent } from 'react'
import { ManualCropper } from './ManualCropper'
import type { CropBox } from '../api/search'

type AutoCropMeta = {
  cropApplied: boolean
  cropBox: CropBox | null
  originalSize: string | null
  cropSize: string | null
  detector: string | null
}

type UploadPanelProps = {
  sourceImageUrl: string | null
  previewImageUrl: string | null
  cropMode: 'auto' | 'manual'
  uploadRevealKey: number
  autoCropMeta: AutoCropMeta | null
  canSearch: boolean
  isLoading: boolean
  isCropping: boolean
  errorMessage: string | null
  onFileSelect: (file: File) => void | Promise<void>
  onCropModeChange: (mode: 'auto' | 'manual') => void
  onAutoCrop: () => void
  onApplyManualCrop: (file: File, previewUrl: string) => void
  onError: (message: string) => void
  onSearch: () => void
}

export function UploadPanel({
  sourceImageUrl,
  previewImageUrl,
  cropMode,
  uploadRevealKey,
  autoCropMeta,
  canSearch,
  isLoading,
  isCropping,
  errorMessage,
  onFileSelect,
  onCropModeChange,
  onAutoCrop,
  onApplyManualCrop,
  onError,
  onSearch,
}: UploadPanelProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      onFileSelect(file)
    }
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]

    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <section className="panel upload-panel" aria-labelledby="upload-title">
      <div className="panel-heading">
        <p className="eyebrow">SELECT IMAGE</p>
        <h2 id="upload-title">사진 선택</h2>
        <p className="panel-description">
          JPG 또는 PNG 사진을 올린 뒤 검색할 옷의 영역을 확인해주세요.
        </p>
      </div>

      <label
        className={previewImageUrl ? 'image-dropzone has-image' : 'image-dropzone'}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {previewImageUrl ? (
          <img
            src={previewImageUrl}
            alt="검색에 사용할 패션 이미지 미리보기"
            className="upload-preview-pop"
            key={uploadRevealKey}
          />
        ) : (
          <div className="empty-upload">
            <span aria-hidden="true">+</span>
            <p>사진을 선택해주세요.</p>
            <small>클릭하거나 이곳으로 끌어다 놓기</small>
          </div>
        )}
        <input type="file" accept="image/jpeg,image/png" onChange={handleInputChange} />
      </label>

      {sourceImageUrl && (
        <div className="crop-mode-tabs" aria-label="크롭 방식 선택">
          <button
            className={cropMode === 'auto' ? 'is-active' : ''}
            type="button"
            onClick={() => onCropModeChange('auto')}
          >
            자동으로 영역 찾기
          </button>
          <button
            className={cropMode === 'manual' ? 'is-active' : ''}
            type="button"
            onClick={() => onCropModeChange('manual')}
          >
            직접 영역 선택
          </button>
        </div>
      )}

      {sourceImageUrl && cropMode === 'manual' && (
        <ManualCropper
          imageUrl={sourceImageUrl}
          onApplyCrop={onApplyManualCrop}
          onError={onError}
        />
      )}

      {sourceImageUrl && cropMode === 'auto' && (
        <div
          className={
            isCropping || isLoading ? 'opencv-process is-running' : 'opencv-process'
          }
        >
          <div className="opencv-scan-preview">
            <img src={sourceImageUrl} alt="OpenCV 처리 대상 이미지" />
            <span />
            <div className="matrix-readout">
              <b>CV</b>
              <small>ROI</small>
            </div>
          </div>
          <ol>
            <li className={isCropping || isLoading ? 'is-active' : ''}>RGB 행렬 변환</li>
            <li className={isCropping || isLoading ? 'is-active' : ''}>의류 후보 영역 검출</li>
            <li className={isCropping || isLoading ? 'is-active' : ''}>ROI 좌표 보정</li>
            <li className={isLoading ? 'is-active' : ''}>FashionCLIP 벡터 검색</li>
          </ol>
          <button
            className="secondary-button auto-crop-button"
            type="button"
            onClick={onAutoCrop}
            disabled={isCropping || isLoading}
          >
            {isCropping ? '영역을 찾는 중...' : '자동으로 옷 영역 찾기'}
          </button>
        </div>
      )}

      {sourceImageUrl && previewImageUrl && cropMode === 'auto' && autoCropMeta && (
        <div className="opencv-crop-review">
          <div className="review-frame">
            <p>원본 ROI</p>
            <div className="review-image original-review-image">
              <img src={sourceImageUrl} alt="OpenCV 원본 ROI" />
              {autoCropMeta.cropBox && autoCropMeta.originalSize && (
                <span
                  className="detected-roi"
                  style={getRoiStyle(autoCropMeta.cropBox, autoCropMeta.originalSize)}
                />
              )}
            </div>
          </div>
          <div className="review-frame">
            <p>크롭 결과</p>
            <div className="review-image">
              <img src={previewImageUrl} alt="OpenCV 크롭 결과" />
            </div>
          </div>
          <div className="crop-metadata">
            <span>
              {autoCropMeta.cropApplied ? 'ROI detected' : 'Detection fallback'}
            </span>
            <span>{autoCropMeta.detector || 'detector unknown'}</span>
            <span>{autoCropMeta.cropSize || 'full image'}</span>
          </div>
        </div>
      )}

      {sourceImageUrl && !canSearch && !errorMessage && (
        <p className="pending-crop-message">
          검색 전에 자동 크롭 미리보기를 만들거나 직접 크롭 영역을 적용해주세요.
        </p>
      )}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <button
        className="primary-button search-button"
        type="button"
        onClick={onSearch}
        disabled={!previewImageUrl || !canSearch || isLoading || isCropping}
      >
        {isLoading ? '검색 중...' : '이 영역으로 검색하기'}
      </button>
    </section>
  )
}

function getRoiStyle(cropBox: CropBox, originalSize: string) {
  const [width, height] = originalSize.split('x').map(Number)

  if (!width || !height) {
    return {}
  }

  return {
    left: `${(cropBox.x / width) * 100}%`,
    top: `${(cropBox.y / height) * 100}%`,
    width: `${(cropBox.width / width) * 100}%`,
    height: `${(cropBox.height / height) * 100}%`,
  }
}
