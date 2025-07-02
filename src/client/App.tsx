import React, { useState } from 'react'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import TeamsPage from './pages/TeamsPage'
import CalendarPage from './pages/CalendarPage'
import ProfilePage from './pages/ProfilePage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TeamConfigurationPage from './pages/TeamConfigurationPage'

type Page = 'home' | 'about' | 'contact' | 'profile' | 'teams' | 'calendar' | 'dashboard' | 'login' | 'register' | 'team-configuration'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const renderPage = (): React.JSX.Element => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'about':
        return <AboutPage />
      case 'contact':
        return <ContactPage />
      case 'teams':
        return <TeamsPage />
      case 'calendar':
        return <CalendarPage />
      case 'profile':
        return <ProfilePage />
      case 'dashboard':
        return <DashboardPage />
      case 'login':
        return <LoginPage />
      case 'register':
        return <RegisterPage />
      case 'team-configuration':
        return <TeamConfigurationPage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      {renderPage()}
      <footer className="bg-gray-50 border-t border-gray-200 px-8 py-6 text-center text-gray-600 text-sm mt-auto">
        <p className="max-w-[3840px] mx-auto m-0">&copy; 2025 Zentropy. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App