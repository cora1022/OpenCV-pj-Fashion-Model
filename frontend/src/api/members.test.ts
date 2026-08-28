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
  it('restores a member using the HttpOnly refresh cookie', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'restored-access', tokenType: 'Bearer', expiresIn: 900 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1, email: 'member@example.com', displayName: '회원', role: 'USER' }))
    vi.stubGlobal('fetch', fetchMock)
    const { restoreSession, session } = await import('./members')

    const member = await restoreSession()

    expect(member?.email).toBe('member@example.com')
    expect(session.token).toBe('restored-access')
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/members/token/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(fetchMock.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer restored-access')
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
