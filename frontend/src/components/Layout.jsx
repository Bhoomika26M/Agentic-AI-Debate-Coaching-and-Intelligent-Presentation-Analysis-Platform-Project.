import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return <div className="app-grid min-h-screen text-ink"><a href="#main-content" className="skip-link">Skip to content</a><Navbar onMenuClick={() => setSidebarOpen(true)} /><div className="flex min-h-[calc(100vh-4rem)]"><Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /><main id="main-content" className="flex min-w-0 flex-1 flex-col"><div className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"><Outlet /></div><Footer /></main></div></div>
}
