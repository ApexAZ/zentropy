import React, { useState, useRef, useEffect } from 'react'

type Page = 'home' | 'about' | 'contact' | 'profile' | 'teams' | 'calendar' | 'dashboard'

interface ProfileDropdownProps {
  onPageChange: (page: Page) => void
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onPageChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        toggleRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleMenuItemClick = (page: Page) => {
    setIsOpen(false)
    onPageChange(page)
  }

  const handleLogout = () => {
    setIsOpen(false)
    // Implement logout logic here
    console.log('Logout clicked')
    alert('Logout functionality would be implemented here')
  }

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        ref={toggleRef}
        className="profile-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={handleToggle}
        aria-label="Profile menu"
      >
        <svg className="profile-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </button>
      
      {isOpen && (
        <>
          <button
            className="profile-close-overlay"
            onClick={() => setIsOpen(false)}
            aria-label="Close profile menu"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          <div className="profile-menu-backdrop" onClick={() => setIsOpen(false)}></div>
          <div className="profile-menu show" role="menu">
        <div className="profile-menu-header">
          <button
            className="profile-menu-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close profile menu"
          >
            <svg className="profile-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </button>
          <div className="profile-info">
            <div className="profile-user-name">John Doe</div>
            <div className="profile-user-email">john@example.com</div>
          </div>
        </div>
        
        <div className="profile-menu-divider"></div>
        
        <button 
          className="profile-menu-item" 
          role="menuitem"
          onClick={() => handleMenuItemClick('profile')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span>My Profile</span>
        </button>
        
        <button 
          className="profile-menu-item" 
          role="menuitem"
          onClick={() => handleMenuItemClick('teams')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4h2v-7H7v2H4V8h3V7H2v11h2zm11-1c-1.11 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm-1-9v3h2v-3h-2z"/>
          </svg>
          <span>My Teams</span>
        </button>
        
        <button 
          className="profile-menu-item" 
          role="menuitem"
          onClick={() => handleMenuItemClick('calendar')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          <span>Calendar</span>
        </button>
        
        <button 
          className="profile-menu-item" 
          role="menuitem"
          onClick={() => handleMenuItemClick('dashboard')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Dashboard</span>
        </button>
        
        <div className="profile-menu-divider"></div>
        
        <button 
          className="profile-menu-item profile-logout" 
          role="menuitem"
          onClick={handleLogout}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
          <span>Sign Out</span>
        </button>
        </div>
        </>
      )}
    </div>
  )
}

export default ProfileDropdown