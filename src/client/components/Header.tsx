import React from 'react'
import ProfileDropdown from './ProfileDropdown'

type Page = 'home' | 'about' | 'contact' | 'profile' | 'teams' | 'calendar' | 'dashboard'

interface HeaderProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange }) => {
  return (
    <header className="main-header">
      <h1>
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault()
            onPageChange('home')
          }}
        >
          Zentropy
        </a>
      </h1>
      <nav id="nav-container" className="nav-container">
        <ul className="nav-menu">
          <li>
            <a 
              href="#"
              className={currentPage === 'about' ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault()
                onPageChange('about')
              }}
            >
              About
            </a>
          </li>
          <li>
            <a 
              href="#"
              className={currentPage === 'contact' ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault()
                onPageChange('contact')
              }}
            >
              Contact
            </a>
          </li>
        </ul>
        <div className="nav-auth">
          <ProfileDropdown onPageChange={onPageChange} />
        </div>
      </nav>
    </header>
  )
}

export default Header