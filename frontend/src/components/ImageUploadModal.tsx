import { useState, type ChangeEvent } from 'react'

type ImageUploadModalProps = {
  onClose: () => void
  onSearch: (imageUrl: string) => void
}

export function ImageUploadModal({
  onClose,
  onSearch,
}: ImageUploadModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSearch = () => {
    if (!previewUrl) {
      return
    }

    onSearch(previewUrl)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Upload</p>
            <h2 id="upload-modal-title">이미지 업로드</h2>
          </div>
          <button className="text-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <label className="file-field">
          <span>파일 선택</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        <div className="modal-preview">
          {previewUrl ? (
            <img src={previewUrl} alt="선택한 이미지 미리보기" />
          ) : (
            <p>선택한 이미지가 여기에 표시됩니다.</p>
          )}
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={handleSearch}
            disabled={!previewUrl}
          >
            검색하기
          </button>
        </div>
      </section>
    </div>
  )
}
