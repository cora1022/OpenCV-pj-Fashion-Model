import { useEffect, useState } from 'react'
import './App.css'
import { fetchMe, loginAdmin, type AdminUser } from './api/auth'
import { IntroScreen } from './components/IntroScreen'
import { LoginModal } from './components/LoginModal'
import { SavedFashionModal } from './components/SavedFashionModal'
import { SearchScreen, type SimilarSearchTarget } from './components/SearchScreen'
import type { SavedFashion } from './api/savedFashion'

type Screen = 'intro' | 'search'

const TOKEN_STORAGE_KEY = 'fashion-admin-token'

function App() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  )
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSavedOpen, setIsSavedOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<string | null>(null)
  const [similarSearchTarget, setSimilarSearchTarget] =
    useState<SimilarSearchTarget | null>(null)

  useEffect(() => {
    if (!authToken) {
      setAdmin(null)
      return
    }

    fetchMe(authToken)
      .then(setAdmin)
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setAuthToken(null)
        setAdmin(null)
      })
  }, [authToken])

  const handleLogin = async (username: string, password: string) => {
    const response = await loginAdmin(username, password)
    localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token)
    setAuthToken(response.access_token)
    setAdmin(response.admin)
    setLoginReason(null)
    setIsLoginOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setAuthToken(null)
    setAdmin(null)
    setIsSavedOpen(false)
  }

  const requestLogin = (reason?: string) => {
    setLoginReason(reason || null)
    setIsLoginOpen(true)
  }

  const sharedActions = {
    admin,
    onLoginClick: () => requestLogin(),
    onLogout: handleLogout,
    onSavedListClick: () => setIsSavedOpen(true),
  }

  const handleFindSimilarSavedFashion = (item: SavedFashion) => {
    if (!item.image_url) {
      return
    }

    setIsSavedOpen(false)
    setScreen('search')
    setSimilarSearchTarget({
      key: Date.now(),
      imageUrl: item.image_url,
      title: item.title,
    })
  }

  const screenNode =
    screen === 'intro' ? (
      <IntroScreen onStart={() => setScreen('search')} {...sharedActions} />
    ) : (
      <SearchScreen
        onBack={() => setScreen('intro')}
        authToken={authToken}
        similarSearchTarget={similarSearchTarget}
        onSimilarSearchConsumed={() => setSimilarSearchTarget(null)}
        onRequireLogin={requestLogin}
        {...sharedActions}
      />
    )

  return (
    <>
      {screenNode}
      <LoginModal
        isOpen={isLoginOpen}
        reason={loginReason}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLogin}
      />
      <SavedFashionModal
        isOpen={isSavedOpen}
        authToken={authToken}
        onClose={() => setIsSavedOpen(false)}
        onRequireLogin={requestLogin}
        onFindSimilar={handleFindSimilarSavedFashion}
      />
    </>
  )
}

export default App
