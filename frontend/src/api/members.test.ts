import { beforeEach, describe, expect, it, vi } from 'vitest'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('member session API', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })
  it('clears memory after refresh failure without writing browser storage', async () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'REFRESH_TOKEN_INVALID' } }, 401),
    ))
    const { restoreSession, session } = await import('./members')

    expect(await restoreSession()).toBeNull()
    expect(session.token).toBeNull()
    expect(storageSpy).not.toHaveBeenCalled()
  })
})
