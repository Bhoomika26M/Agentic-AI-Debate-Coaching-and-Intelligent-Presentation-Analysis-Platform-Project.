import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop Component
 * =====================
 * Automatically resets scroll position to the top (0, 0) whenever the route or search parameters change.
 * Specifically handles the inner scrollable container (.page-content) used by the dashboard layout.
 */
export function resetScrollTop() {
  window.scrollTo(0, 0)
  const pageContent = document.querySelector('.page-content')
  if (pageContent) {
    pageContent.scrollTop = 0
  }
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.scrollTop = 0
  }
}

export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    resetScrollTop()
  }, [pathname, search])

  return null
}

