import { useState } from 'react'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'

type Page = 'home' | 'about' | 'contact' | 'profile' | 'teams' | 'calendar' | 'dashboard'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'about':
        return <AboutPage />
      case 'contact':
        return <ContactPage />
      case 'profile':
      case 'teams':
      case 'calendar':
      case 'dashboard':
        return (
          <main className="main-content">
            <div className="page-header">
              <h2>{currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}</h2>
            </div>
            <section className="content-section">
              <p>This page is under development. Coming soon!</p>
            </section>
          </main>
        )
      default:
        return <HomePage />
    }
  }

  return (
    <div className="app-container">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      {renderPage()}
      <footer className="main-footer">
        <p>&copy; 2025 Zentropy. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App