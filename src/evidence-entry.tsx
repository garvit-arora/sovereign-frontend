import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EvidencePage } from '@/components/EvidencePage'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Evidence root element is missing')
}

createRoot(root).render(
  <StrictMode>
    <EvidencePage />
  </StrictMode>,
)
