const MAX_BYTES = 10 * 1024 * 1024
const MAX_PIXELS = 16_000_000
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png'])

export async function validateImageFile(file: File): Promise<void> {
  if (!SUPPORTED_TYPES.has(file.type)) throw new Error('JPEG 또는 PNG 이미지만 선택해주세요.')
  if (file.size > MAX_BYTES) throw new Error('10MB 이하의 이미지를 선택해주세요.')
  const bitmap = await createImageBitmap(file)
  const pixels = bitmap.width * bitmap.height
  bitmap.close()
  if (pixels > MAX_PIXELS) throw new Error('이미지 해상도는 1,600만 픽셀 이하여야 합니다.')
}
