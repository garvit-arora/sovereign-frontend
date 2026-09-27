import { StrictMode } from 'react'
import { MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import '@/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root was not found in index.html')

createRoot(container).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><App /></MotionConfig>
  </StrictMode>,
)
