export type ApiErrorCode =
  | 'INVALID_IMAGE'
  | 'UNSUPPORTED_IMAGE_TYPE'
  | 'IMAGE_TOO_LARGE'
  | 'IMAGE_DIMENSIONS_EXCEEDED'
  | 'CATALOG_NOT_READY'
  | 'CATALOG_ITEM_NOT_FOUND'
  | 'SEARCH_BUSY'
  | 'SEARCH_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'ACCESS_TOKEN_EXPIRED'
  | 'ACCESS_TOKEN_INVALID'

const messages: Record<ApiErrorCode, string> = {
  INVALID_IMAGE: '올바른 이미지 파일을 선택해주세요.',
  UNSUPPORTED_IMAGE_TYPE: 'JPEG 또는 PNG 이미지만 선택해주세요.',
  IMAGE_TOO_LARGE: '10MB 이하의 이미지를 선택해주세요.',
  IMAGE_DIMENSIONS_EXCEEDED: '이미지 해상도는 1,600만 픽셀 이하여야 합니다.',
  CATALOG_NOT_READY: '카탈로그가 아직 준비되지 않았습니다.',
  CATALOG_ITEM_NOT_FOUND: '카탈로그 항목을 찾을 수 없습니다.',
  SEARCH_BUSY: '검색 요청이 많습니다. 잠시 후 다시 시도해주세요.',
  SEARCH_UNAVAILABLE: '검색 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
  INTERNAL_ERROR: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
  AUTHENTICATION_REQUIRED: '로그인이 필요합니다.',
  ACCESS_TOKEN_EXPIRED: '로그인이 만료되었습니다. 다시 로그인해주세요.',
  ACCESS_TOKEN_INVALID: '로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.',
}

export async function toUserError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: { code?: ApiErrorCode } }
    if (body.error?.code && body.error.code in messages) {
      return new Error(messages[body.error.code])
    }
  } catch {
    // A non-JSON response still receives a safe, generic client message.
  }
  return new Error(fallback)
}
