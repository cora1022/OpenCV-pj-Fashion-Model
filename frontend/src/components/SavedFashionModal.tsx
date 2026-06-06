import { useEffect, useState } from 'react'
import {
  deleteSavedFashion,
  fetchSavedFashions,
  type SavedFashion,
} from '../api/savedFashion'

type SavedFashionModalProps = {
  isOpen: boolean
  authToken: string | null
  onClose: () => void
  onRequireLogin: (reason?: string) => void
  onFindSimilar: (item: SavedFashion) => void
}

export function SavedFashionModal({
  isOpen,
  authToken,
  onClose,
  onRequireLogin,
  onFindSimilar,
}: SavedFashionModalProps) {
  const [items, setItems] = useState<SavedFashion[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    fetchSavedFashions()
      .then(setItems)
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '저장 목록을 불러오지 못했습니다.',
        )
      })
      .finally(() => setIsLoading(false))
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleDelete = async (id: number) => {
    if (!authToken) {
      onRequireLogin('삭제하려면 admin 로그인이 필요합니다.')
      return
    }

    try {
      await deleteSavedFashion(id, authToken)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.',
      )
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="saved-modal" aria-labelledby="saved-modal-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Saved Fashion</p>
            <h2 id="saved-modal-title">저장된 패션 목록</h2>
          </div>
          <button className="text-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        {isLoading ? (
          <div className="empty-results">저장 목록을 불러오는 중입니다.</div>
        ) : errorMessage ? (
          <p className="error-message">{errorMessage}</p>
        ) : items.length === 0 ? (
          <div className="empty-results">아직 저장된 패션 상품이 없습니다.</div>
        ) : (
          <div className="saved-grid">
            {items.map((item) => (
              <article className="saved-card" key={item.id}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title || '저장 상품 이미지'} />
                ) : (
                  <div className="missing-image">이미지 없음</div>
                )}
                <div className="saved-card-body">
                  <h3>{item.title || '상품명 없음'}</h3>
                  <p>{item.mall_name || '쇼핑몰 정보 없음'}</p>
                  <strong>{formatPrice(item)}</strong>
                  <small>
                    {item.saved_by.display_name} ·{' '}
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </small>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer">
                      상품 링크
                    </a>
                  )}
                  <button
                    className="text-button delete-button"
                    type="button"
                    disabled={!item.image_url}
                    onClick={() => onFindSimilar(item)}
                  >
                    유사 상품 찾기
                  </button>
                  <button
                    className="text-button delete-button"
                    type="button"
                    onClick={() => handleDelete(item.id)}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatPrice(item: SavedFashion) {
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
