import { useEffect, useRef, useState } from 'react'
import type { AdminUser } from '../api/auth'
import { saveFashion } from '../api/savedFashion'
import {
  cropImage,
  searchImage,
  searchImageUrl,
  type CropBox,
  type ImageFeatureAnalysis,
  type SearchResult,
} from '../api/search'
import { ResultGrid } from './ResultGrid'
import { SearchLoadingOverlay } from './SearchLoadingOverlay'
import { UploadPanel } from './UploadPanel'

type SearchScreenProps = {
  admin: AdminUser | null
  authToken: string | null
  similarSearchTarget: SimilarSearchTarget | null
  onSimilarSearchConsumed: () => void
  onBack: () => void
  onLoginClick: () => void
  onLogout: () => void
  onSavedListClick: () => void
  onRequireLogin: (reason?: string) => void
}

type AutoCropMeta = {
  cropApplied: boolean
  cropBox: CropBox | null
  originalSize: string | null
  cropSize: string | null
  detector: string | null
}

export type SimilarSearchTarget = {
  key: number
  imageUrl: string
  title?: string | null
}

const MIN_SEARCH_LOADING_MS = 4200
const MIN_MORE_LOADING_MS = 3200
const MIN_CROP_LOADING_MS = 1800

export function SearchScreen({
  admin,
  authToken,
  similarSearchTarget,
  onSimilarSearchConsumed,
  onBack,
  onLoginClick,
  onLogout,
  onSavedListClick,
  onRequireLogin,
}: SearchScreenProps) {
  const originalUrlRef = useRef<string | null>(null)
  const searchUrlRef = useRef<string | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [searchFile, setSearchFile] = useState<File | null>(null)
  const [similarImageUrl, setSimilarImageUrl] = useState<string | null>(null)
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null)
  const [searchPreviewUrl, setSearchPreviewUrl] = useState<string | null>(null)
  const [cropMode, setCropMode] = useState<'auto' | 'manual'>('auto')
  const [autoCropMeta, setAutoCropMeta] = useState<AutoCropMeta | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const [imageFeatures, setImageFeatures] = useState<ImageFeatureAnalysis | null>(null)
  const [requestedTopK, setRequestedTopK] = useState(2)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<1 | 2>(1)
  const [resultRevealKey, setResultRevealKey] = useState(0)
  const [uploadRevealKey, setUploadRevealKey] = useState(0)

  useEffect(() => {
    return () => {
      cleanupObjectUrls()
    }
  }, [])

  const cleanupObjectUrls = () => {
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current)
    }
    if (
      searchUrlRef.current &&
      searchUrlRef.current !== originalUrlRef.current
    ) {
      URL.revokeObjectURL(searchUrlRef.current)
    }
    originalUrlRef.current = null
    searchUrlRef.current = null
  }

  const setSearchPreview = (url: string | null) => {
    if (
      searchUrlRef.current &&
      searchUrlRef.current !== originalUrlRef.current &&
      searchUrlRef.current !== url
    ) {
      URL.revokeObjectURL(searchUrlRef.current)
    }

    searchUrlRef.current = url
    setSearchPreviewUrl(url)
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    cleanupObjectUrls()

    const nextPreviewUrl = URL.createObjectURL(file)
    originalUrlRef.current = nextPreviewUrl
    searchUrlRef.current = nextPreviewUrl
    setOriginalFile(file)
    setSearchFile(null)
    setSimilarImageUrl(null)
    setOriginalPreviewUrl(nextPreviewUrl)
    setSearchPreviewUrl(nextPreviewUrl)
    setCropMode('auto')
    setAutoCropMeta(null)
    setResults([])
    setImageFeatures(null)
    setRequestedTopK(2)
    setErrorMessage(null)
    setActiveStep(1)
    setResultRevealKey(0)
    setUploadRevealKey((current) => current + 1)
    window.setTimeout(() => {
      document
        .querySelector('.crop-mode-tabs')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 420)
  }

  const handleCropModeChange = (mode: 'auto' | 'manual') => {
    setCropMode(mode)

    if (mode === 'auto' && originalFile && originalPreviewUrl) {
      if (searchPreviewUrl && searchPreviewUrl !== originalPreviewUrl) {
        URL.revokeObjectURL(searchPreviewUrl)
      }
      setSearchFile(null)
      setSimilarImageUrl(null)
      searchUrlRef.current = originalPreviewUrl
      setSearchPreviewUrl(originalPreviewUrl)
      setAutoCropMeta(null)
    }
  }

  const handleAutoCrop = async () => {
    if (!originalFile) {
      setErrorMessage('자동 크롭할 이미지를 먼저 선택해주세요.')
      return
    }

    setIsCropping(true)
    setErrorMessage(null)

    try {
      const [cropResult] = await Promise.all([
        cropImage(originalFile),
        wait(MIN_CROP_LOADING_MS),
      ])
      const croppedFile = cropResult.file
      const croppedPreviewUrl = URL.createObjectURL(croppedFile)

      if (searchPreviewUrl && searchPreviewUrl !== originalPreviewUrl) {
        URL.revokeObjectURL(searchPreviewUrl)
      }

      setCropMode('auto')
      setSearchFile(croppedFile)
      setSimilarImageUrl(null)
      setSearchPreview(croppedPreviewUrl)
      setAutoCropMeta({
        cropApplied: cropResult.cropApplied,
        cropBox: cropResult.cropBox,
        originalSize: cropResult.originalSize,
        cropSize: cropResult.cropSize,
        detector: cropResult.detector,
      })
      setResults([])
      setImageFeatures(null)
      setRequestedTopK(2)
      window.setTimeout(() => {
        document
          .querySelector('.opencv-crop-review')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 120)
    } catch (error) {
      setSimilarImageUrl(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'OpenCV 자동 크롭 중 오류가 발생했습니다.',
      )
    } finally {
      setIsCropping(false)
    }
  }

  const handleManualCrop = (file: File, previewUrl: string) => {
    setCropMode('manual')
    setAutoCropMeta(null)
    setSearchFile(file)
    setSimilarImageUrl(null)
    setSearchPreview(previewUrl)
    setResults([])
    setImageFeatures(null)
    setRequestedTopK(2)
    setErrorMessage(null)
  }

  const handleSearch = async () => {
    if (!searchFile) {
      setErrorMessage('검색 전에 크롭 영역을 먼저 확정해주세요.')
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
    setIsLoading(true)
    setErrorMessage(null)
    let didSucceed = false

    try {
      const [searchResponse] = await Promise.all([
        searchImage(searchFile, 2, false),
        wait(MIN_SEARCH_LOADING_MS),
      ])
      setResults(searchResponse.results)
      setImageFeatures(searchResponse.image_features ?? null)
      setRequestedTopK(2)
      setSimilarImageUrl(null)
      setActiveStep(2)
      didSucceed = true
    } catch (error) {
      setResults([])
      setImageFeatures(null)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '이미지 검색 중 오류가 발생했습니다.',
      )
    } finally {
      setIsLoading(false)
      if (didSucceed) {
        window.setTimeout(() => {
          setResultRevealKey((current) => current + 1)
          document
            .querySelector('.step-two-modal')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 120)
      }
    }
  }

  const handleFindMore = async () => {
    if (!searchFile && !similarImageUrl) {
      setErrorMessage('추가 검색할 이미지를 먼저 선택해주세요.')
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
    setIsLoadingMore(true)
    setErrorMessage(null)
    const nextTopK = requestedTopK + 2
    let didSucceed = false

    try {
      const searchPromise = similarImageUrl
        ? searchImageUrl(similarImageUrl, nextTopK)
        : searchImage(searchFile as File, nextTopK, false)

      const [searchResponse] = await Promise.all([
        searchPromise,
        wait(MIN_MORE_LOADING_MS),
      ])
      setResults(searchResponse.results)
      setImageFeatures(searchResponse.image_features ?? imageFeatures)
      setRequestedTopK(nextTopK)
      didSucceed = true
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '추가 패션 이미지를 찾는 중 오류가 발생했습니다.',
      )
    } finally {
      setIsLoadingMore(false)
      if (didSucceed) {
        window.setTimeout(() => {
          setResultRevealKey((current) => current + 1)
          document
            .querySelector('.result-grid')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 120)
      }
    }
  }

  const handleSaveResult = async (item: SearchResult) => {
    if (!authToken) {
      onRequireLogin('저장하려면 admin 로그인이 필요합니다.')
      return
    }

    try {
      await saveFashion(item, authToken)
      setSaveMessage('저장되었습니다.')
      window.setTimeout(() => setSaveMessage(null), 1800)
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.',
      )
    }
  }

  const handleFindSimilarFromResult = async (item: SearchResult) => {
    if (!item.image_url) {
      setErrorMessage('이 상품에는 검색할 이미지가 없습니다.')
      return
    }

    await runImageUrlSearch(item.image_url, item.title || '선택한 상품')
  }

  const runImageUrlSearch = async (imageUrl: string, title: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveStep(2)
    setIsLoading(true)
    setIsLoadingMore(false)
    setErrorMessage(null)
    setResults([])
    setImageFeatures(null)
    setRequestedTopK(2)
    setSimilarImageUrl(imageUrl)
    let didSucceed = false

    try {
      const [searchResponse] = await Promise.all([
        searchImageUrl(imageUrl, 2),
        wait(MIN_SEARCH_LOADING_MS),
      ])
      setResults(searchResponse.results)
      setImageFeatures(searchResponse.image_features ?? null)
      setRequestedTopK(2)
      setSaveMessage(`${title} 기준으로 유사 상품을 찾았습니다.`)
      window.setTimeout(() => setSaveMessage(null), 1800)
      didSucceed = true
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '상품 이미지로 유사 상품을 찾는 중 오류가 발생했습니다.',
      )
    } finally {
      setIsLoading(false)
      if (didSucceed) {
        window.setTimeout(() => {
          setResultRevealKey((current) => current + 1)
          document
            .querySelector('.step-two-modal')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 120)
      }
    }
  }

  useEffect(() => {
    if (!similarSearchTarget) {
      return
    }

    onSimilarSearchConsumed()
    void runImageUrlSearch(
      similarSearchTarget.imageUrl,
      similarSearchTarget.title || '저장된 상품',
    )
  }, [similarSearchTarget])

  return (
    <main className="search-screen">
      <header className="app-header">
        <div>
          <p className="eyebrow">Fashion Similarity Search</p>
          <h1>비슷한 패션 아이템 찾기</h1>
        </div>
        <div className="header-actions">
          <button className="text-button" type="button" onClick={onBack}>
            처음으로
          </button>
          {admin && (
            <button className="text-button" type="button" onClick={onSavedListClick}>
              저장된 패션 목록
            </button>
          )}
          {admin ? (
            <button className="text-button" type="button" onClick={onLogout}>
              {admin.display_name} 로그아웃
            </button>
          ) : (
            <button className="text-button" type="button" onClick={onLoginClick}>
              로그인
            </button>
          )}
        </div>
      </header>

      <section className="step-modal-shell" aria-label="이미지 유사도 검색">
        <div className="step-rail" aria-label="검색 단계">
          <button
            className={activeStep === 1 ? 'step-pill is-active' : 'step-pill'}
            type="button"
            onClick={() => setActiveStep(1)}
          >
            <span>Step 1</span>
            이미지 검색
          </button>
          <button
            className={activeStep === 2 ? 'step-pill is-active' : 'step-pill'}
            type="button"
            onClick={() => setActiveStep(2)}
            disabled={results.length === 0 && !isLoading}
          >
            <span>Step 2</span>
            쇼핑 나열
          </button>
        </div>

        {activeStep === 1 ? (
          <div className="step-modal step-one-modal">
            <UploadPanel
              sourceImageUrl={originalPreviewUrl}
              previewImageUrl={searchPreviewUrl}
              cropMode={cropMode}
              uploadRevealKey={uploadRevealKey}
              autoCropMeta={autoCropMeta}
              canSearch={Boolean(searchFile)}
              isLoading={isLoading}
              isCropping={isCropping}
              errorMessage={errorMessage}
              onFileSelect={handleFileSelect}
              onCropModeChange={handleCropModeChange}
              onAutoCrop={handleAutoCrop}
              onApplyManualCrop={handleManualCrop}
              onError={setErrorMessage}
              onSearch={handleSearch}
            />
          </div>
        ) : (
          <div className="step-modal step-two-modal">
            <div className="result-modal-toolbar">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2>유사 상품 쇼핑 리스트</h2>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setActiveStep(1)}
              >
                이미지 다시 선택
              </button>
            </div>
            <ResultGrid
              results={results}
              imageFeatures={imageFeatures}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              revealKey={resultRevealKey}
              onFindMore={handleFindMore}
              onSaveResult={handleSaveResult}
              onFindSimilarResult={handleFindSimilarFromResult}
            />
            {saveMessage && <p className="save-toast">{saveMessage}</p>}
          </div>
        )}
      </section>
      <SearchLoadingOverlay
        isVisible={isLoading || isLoadingMore}
        mode={isLoadingMore ? 'more' : 'initial'}
        targetCount={isLoadingMore ? requestedTopK + 2 : 2}
      />
    </main>
  )
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
