import { useCallback, useEffect, useRef, useState } from 'react'
import { cropImage, searchCatalogItem, searchImage, type CropBox, type SearchResult } from '../api/search'
import { ActivityApiError, createSavedResult, createSearchHistory } from '../api/activity'
import { validateImageFile } from '../utils/imageValidation'
import { ResultGrid } from './ResultGrid'
import { SearchLoadingOverlay } from './SearchLoadingOverlay'
import { UploadPanel } from './UploadPanel'

type Props = {
  onBack: () => void
  onMyPage: () => void
  initialCatalogItemId?: string | null
  onInitialCatalogConsumed?: () => void
}
type AutoCropMeta = { cropApplied: boolean; cropBox: CropBox | null; originalSize: string | null; cropSize: string | null; detector: string | null }

export function SearchScreen({ onBack, onMyPage, initialCatalogItemId, onInitialCatalogConsumed }: Props) {
  const originalUrl = useRef<string | null>(null)
  const searchUrl = useRef<string | null>(null)
  const initialSearchStarted = useRef<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [searchFile, setSearchFile] = useState<File | null>(null)
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null)
  const [searchPreviewUrl, setSearchPreviewUrl] = useState<string | null>(null)
  const [cropMode, setCropMode] = useState<'auto' | 'manual'>('auto')
  const [autoCropMeta, setAutoCropMeta] = useState<AutoCropMeta | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const [requestedTopK, setRequestedTopK] = useState(2)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<1 | 2>(1)
  const [resultRevealKey, setResultRevealKey] = useState(0)
  const [uploadRevealKey, setUploadRevealKey] = useState(0)
  const [saveStates, setSaveStates] = useState<Record<string, 'saving' | 'saved' | 'duplicate' | 'error'>>({})
  const [activityMessage, setActivityMessage] = useState<string | null>(null)

  const releaseUrls = useCallback(() => {
    if (originalUrl.current) URL.revokeObjectURL(originalUrl.current)
    if (searchUrl.current && searchUrl.current !== originalUrl.current) URL.revokeObjectURL(searchUrl.current)
    originalUrl.current = null; searchUrl.current = null
  }, [])
  useEffect(() => releaseUrls, [releaseUrls])
  const setSearchPreview = (url: string) => {
    if (searchUrl.current && searchUrl.current !== originalUrl.current && searchUrl.current !== url) URL.revokeObjectURL(searchUrl.current)
    searchUrl.current = url; setSearchPreviewUrl(url)
  }

  const handleFileSelect = async (file: File) => {
    try { await validateImageFile(file) } catch (error) { setErrorMessage(error instanceof Error ? error.message : '이미지를 확인할 수 없습니다.'); return }
    releaseUrls()
    const url = URL.createObjectURL(file)
    originalUrl.current = url; searchUrl.current = url
    setOriginalFile(file); setSearchFile(null); setOriginalPreviewUrl(url); setSearchPreviewUrl(url)
    setCropMode('auto'); setAutoCropMeta(null); setResults([]); setRequestedTopK(2); setErrorMessage(null); setActiveStep(1); setResultRevealKey(0); setUploadRevealKey((value) => value + 1)
  }

  const handleCropModeChange = (mode: 'auto' | 'manual') => {
    setCropMode(mode)
    if (mode === 'auto' && originalFile && originalPreviewUrl) { setSearchFile(null); setSearchPreview(originalPreviewUrl); setAutoCropMeta(null) }
  }
  const handleAutoCrop = async () => {
    if (!originalFile) return setErrorMessage('자동 크롭할 이미지를 먼저 선택해주세요.')
    setIsCropping(true); setErrorMessage(null)
    try {
      const result = await cropImage(originalFile); const url = URL.createObjectURL(result.file)
      setSearchFile(result.file); setSearchPreview(url); setAutoCropMeta(result); setResults([]); setRequestedTopK(2)
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : '자동 크롭 중 오류가 발생했습니다.') } finally { setIsCropping(false) }
  }
  const handleManualCrop = (file: File, url: string) => { setCropMode('manual'); setAutoCropMeta(null); setSearchFile(file); setSearchPreview(url); setResults([]); setRequestedTopK(2); setErrorMessage(null) }
  const handleSearch = async () => {
    if (!searchFile) return setErrorMessage('검색 전에 크롭 영역을 먼저 확정해주세요.')
    setIsLoading(true); setErrorMessage(null)
    try {
      const response = await searchImage(searchFile)
      setResults(response.results); setRequestedTopK(2); setActiveStep(2); setResultRevealKey((value) => value + 1)
      try {
        await createSearchHistory('IMAGE_UPLOAD', cropMode === 'auto' ? 'AUTO' : 'MANUAL')
      } catch {
        setActivityMessage('검색은 완료됐지만 검색 기록을 저장하지 못했습니다.')
      }
    } catch (error) { setResults([]); setErrorMessage(error instanceof Error ? error.message : '이미지 검색 중 오류가 발생했습니다.') } finally { setIsLoading(false) }
  }
  const handleFindMore = async () => {
    if (!searchFile) return
    const topK = requestedTopK + 2; setIsLoadingMore(true); setErrorMessage(null)
    try { const response = await searchImage(searchFile, topK); setResults(response.results); setRequestedTopK(topK); setResultRevealKey((value) => value + 1) } catch (error) { setErrorMessage(error instanceof Error ? error.message : '추가 검색 중 오류가 발생했습니다.') } finally { setIsLoadingMore(false) }
  }
  const handleFindSimilarResult = async (item: SearchResult) => {
    setIsLoading(true); setErrorMessage(null); setActiveStep(2)
    try {
      const response = await searchCatalogItem(item.catalogItemId)
      setResults(response.results); setRequestedTopK(2); setResultRevealKey((value) => value + 1)
      try { await createSearchHistory('CATALOG_ITEM', 'CATALOG') } catch { setActivityMessage('검색 기록을 저장하지 못했습니다.') }
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : '유사 이미지 검색 중 오류가 발생했습니다.') } finally { setIsLoading(false) }
  }

  const handleSaveResult = async (item: SearchResult) => {
    setSaveStates((current) => ({ ...current, [item.catalogItemId]: 'saving' }))
    setActivityMessage(null)
    try {
      await createSavedResult(item)
      setSaveStates((current) => ({ ...current, [item.catalogItemId]: 'saved' }))
    } catch (error) {
      const state = error instanceof ActivityApiError && error.code === 'DUPLICATE_SAVED_RESULT'
        ? 'duplicate'
        : 'error'
      setSaveStates((current) => ({ ...current, [item.catalogItemId]: state }))
      if (state === 'error') setActivityMessage('결과를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  useEffect(() => {
    if (!initialCatalogItemId || initialSearchStarted.current === initialCatalogItemId) return
    initialSearchStarted.current = initialCatalogItemId
    setIsLoading(true)
    setActiveStep(2)
    setErrorMessage(null)
    searchCatalogItem(initialCatalogItemId)
      .then(async (response) => {
        setResults(response.results)
        setRequestedTopK(2)
        setResultRevealKey((value) => value + 1)
        try { await createSearchHistory('CATALOG_ITEM', 'CATALOG') } catch { setActivityMessage('검색 기록을 저장하지 못했습니다.') }
      })
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : '저장 이미지 재검색에 실패했습니다.'))
      .finally(() => {
        setIsLoading(false)
        onInitialCatalogConsumed?.()
      })
  }, [initialCatalogItemId, onInitialCatalogConsumed])

  return (
    <main className="search-screen editorial-search">
      <header className="search-workspace-nav">
        <button className="search-workspace-logo" type="button" onClick={onBack}>
          STYLE FINDER
        </button>
        <p>IMAGE SEARCH</p>
        <div className="search-nav-actions">
          <button className="search-my-page-link" type="button" onClick={onMyPage}>마이페이지</button>
          <button className="search-home-link" type="button" onClick={onBack}>
            메인으로 <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <section className="search-workspace-heading">
        <div className="search-section-label"><span>01</span><p>이미지 검색</p></div>
        <div>
          <h1>찾고 싶은 옷이 있는<br />사진을 올려주세요.</h1>
          <p>사진을 선택하고 옷이 있는 영역을 확인하면<br />비슷한 이미지를 유사도 순서로 보여드립니다.</p>
        </div>
      </section>

      <section className="step-modal-shell" aria-label="이미지 유사도 검색">
        <div className="step-rail">
          <button className={activeStep === 1 ? 'step-pill is-active' : 'step-pill'} type="button" onClick={() => setActiveStep(1)}>
            <span>01</span><strong>사진 선택과 영역 확인</strong>
          </button>
          <button className={activeStep === 2 ? 'step-pill is-active' : 'step-pill'} type="button" onClick={() => setActiveStep(2)} disabled={results.length === 0 && !isLoading}>
            <span>02</span><strong>비슷한 이미지 보기</strong>
          </button>
        </div>

        {activeStep === 1 ? (
          <div className="step-modal step-one-modal">
            <UploadPanel sourceImageUrl={originalPreviewUrl} previewImageUrl={searchPreviewUrl} cropMode={cropMode} uploadRevealKey={uploadRevealKey} autoCropMeta={autoCropMeta} canSearch={Boolean(searchFile)} isLoading={isLoading} isCropping={isCropping} errorMessage={errorMessage} onFileSelect={handleFileSelect} onCropModeChange={handleCropModeChange} onAutoCrop={handleAutoCrop} onApplyManualCrop={handleManualCrop} onError={setErrorMessage} onSearch={handleSearch} />
          </div>
        ) : (
          <div className="step-modal step-two-modal">
            <div className="result-modal-toolbar">
              <div><p className="eyebrow">RESULT · {String(results.length).padStart(2, '0')}</p><h2>비슷한 이미지</h2></div>
              <button className="secondary-button" type="button" onClick={() => setActiveStep(1)}>다른 사진 선택</button>
            </div>
            <ResultGrid results={results} isLoading={isLoading} isLoadingMore={isLoadingMore} revealKey={resultRevealKey} saveStates={saveStates} onFindMore={handleFindMore} onFindSimilarResult={handleFindSimilarResult} onSaveResult={handleSaveResult} />
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {activityMessage && <p className="activity-message" role="status">{activityMessage}</p>}
          </div>
        )}
      </section>

      <footer className="search-workspace-footer">
        <span>REACT · FASTAPI · FASHIONCLIP · QDRANT</span>
        <span>STYLE FINDER © 2026</span>
      </footer>
      <SearchLoadingOverlay isVisible={isLoading || isLoadingMore} mode={isLoadingMore ? 'more' : 'initial'} targetCount={isLoadingMore ? requestedTopK + 2 : 2} />
    </main>
  )
}
