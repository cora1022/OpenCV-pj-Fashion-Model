export type SearchResult = {
  score: number
  title?: string | null
  link?: string | null
  image_url?: string | null
  mall_name?: string | null
  price?: string | null
  lprice?: string | null
  hprice?: string | null
  product_id?: string | null
  query?: string | null
  crop_used?: boolean | null
  saved_image_path?: string | null
  embedding_model?: string | null
}

export type ImageFeatureAnalysis = {
  available: boolean
  summary?: string | null
  item_type?: string | null
  colors?: string[]
  materials?: string[]
  patterns?: string[]
  style_keywords?: string[]
  search_keywords?: string[]
  error?: string | null
}

type ImageSearchResponse = {
  results: SearchResult[]
  image_features?: ImageFeatureAnalysis | null
}

export type CropBox = {
  x: number
  y: number
  width: number
  height: number
}

export type CropImageResult = {
  file: File
  cropApplied: boolean
  cropBox: CropBox | null
  originalSize: string | null
  cropSize: string | null
  detector: string | null
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  ''

export async function searchImage(file: File, topK = 2, crop = true) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(
    `${API_BASE_URL}/api/search/image?top_k=${topK}&crop=${crop}`,
    {
      method: 'POST',
      body: formData,
    },
  )

  if (!response.ok) {
    let message = '이미지 검색 중 오류가 발생했습니다.'

    try {
      const errorBody = (await response.json()) as { detail?: string }
      if (errorBody.detail) {
        message = errorBody.detail
      }
    } catch {
      message = `${message} (${response.status})`
    }

    throw new Error(message)
  }

  const data = (await response.json()) as ImageSearchResponse
  return data
}

export async function searchImageUrl(imageUrl: string, topK = 2) {
  const response = await fetch(
    `${API_BASE_URL}/api/search/image-url?top_k=${topK}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: imageUrl }),
    },
  )

  if (!response.ok) {
    let message = '상품 이미지로 유사 상품을 찾는 중 오류가 발생했습니다.'

    try {
      const errorBody = (await response.json()) as { detail?: string }
      if (errorBody.detail) {
        message = errorBody.detail
      }
    } catch {
      message = `${message} (${response.status})`
    }

    throw new Error(message)
  }

  const data = (await response.json()) as ImageSearchResponse
  return data
}

export async function cropImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/api/crop/image`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let message = 'OpenCV 자동 크롭 중 오류가 발생했습니다.'

    try {
      const errorBody = (await response.json()) as { detail?: string }
      if (errorBody.detail) {
        message = errorBody.detail
      }
    } catch {
      message = `${message} (${response.status})`
    }

    throw new Error(message)
  }

  const blob = await response.blob()
  const cropBoxHeader = response.headers.get('X-Crop-Box')

  return {
    file: new File([blob], `opencv-crop-${Date.now()}.jpg`, {
      type: blob.type || 'image/jpeg',
    }),
    cropApplied: response.headers.get('X-Crop-Applied') === 'true',
    cropBox: cropBoxHeader ? (JSON.parse(cropBoxHeader) as CropBox) : null,
    originalSize: response.headers.get('X-Original-Size'),
    cropSize: response.headers.get('X-Crop-Size'),
    detector: response.headers.get('X-Crop-Detector'),
  }
}
