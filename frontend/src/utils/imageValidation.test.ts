import { describe, expect, it, vi } from 'vitest'
import { validateImageFile } from './imageValidation'

describe('validateImageFile', () => {
  it('rejects unsupported file types before upload', async () => {
    await expect(validateImageFile(new File(['x'], 'x.gif', { type: 'image/gif' }))).rejects.toThrow('JPEG 또는 PNG')
  })

  it('rejects files larger than 10MiB before decoding', async () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })
    await expect(validateImageFile(file)).rejects.toThrow('10MB')
  })

  it('rejects dimensions over 16 million pixels', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 5000, height: 5000, close: vi.fn() }))
    await expect(validateImageFile(new File(['x'], 'wide.jpg', { type: 'image/jpeg' }))).rejects.toThrow('1,600만')
    vi.unstubAllGlobals()
  })
})
