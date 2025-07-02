import React from 'react'
import ProfileDropdown from './ProfileDropdown'

type Page = 'home' | 'about' | 'contact' | 'profile' | 'teams' | 'calendar' | 'dashboard' | 'login' | 'register' | 'team-configuration'

interface HeaderProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange }) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm py-4 px-8 flex justify-between items-center w-full">
      <h1 className="m-0 text-3xl flex-shrink-0">
        <button 
          onClick={() => onPageChange('home')}
          className="no-underline text-blue-500 font-bold bg-transparent border-none cursor-pointer text-3xl p-0"
        >
          Zentropy
        </button>
      </h1>
      <nav id="nav-container" className="flex justify-end items-center flex-grow">
        <ul className="flex list-none gap-8 m-0 p-0">
          <li>
            <button 
              className={`no-underline font-medium py-2 px-4 rounded-md transition-all duration-200 border-none cursor-pointer ${
                currentPage === 'about' 
                  ? 'text-blue-500 bg-gray-50' 
                  : 'text-gray-600 hover:text-blue-500 hover:bg-gray-50'
              }`}
              onClick={() => onPageChange('about')}
            >
              About
            </button>
          </li>
          <li>
            <button 
              className={`no-underline font-medium py-2 px-4 rounded-md transition-all duration-200 border-none cursor-pointer ${
                currentPage === 'contact' 
                  ? 'text-blue-500 bg-gray-50' 
                  : 'text-gray-600 hover:text-blue-500 hover:bg-gray-50'
              }`}
              onClick={() => onPageChange('contact')}
            >
              Contact
            </button>
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