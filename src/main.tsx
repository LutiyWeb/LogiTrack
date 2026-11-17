import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/labels.scss'
import './index.scss'
import { hydrateFromServer } from './store/remote.ts'

// Состояние тянем с сервера до создания стора, поэтому App подключаем после.

async function start() {
  await hydrateFromServer()
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
