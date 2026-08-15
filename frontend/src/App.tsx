import { useState } from 'react'
import './App.css'
import './styles/landing.css'
import { IntroScreen } from './components/IntroScreen'
import { SearchScreen } from './components/SearchScreen'

type Screen = 'intro' | 'search'

function App() {
  const [screen, setScreen] = useState<Screen>('intro')

  const screenNode =
    screen === 'intro' ? (
      <IntroScreen onStart={() => setScreen('search')} />
    ) : (
      <SearchScreen onBack={() => setScreen('intro')} />
    )

  return screenNode
}

export default App
