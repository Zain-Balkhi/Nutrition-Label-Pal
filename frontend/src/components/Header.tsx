import { useState } from 'react';
import type { AuthUser } from '../types';

interface HeaderProps {
  activePage?: 'home' | 'generate' | 'dashboard' | 'login' | 'account';
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
  onLogoClick?: () => void;
  onGenerateClick?: () => void;
  onDashboardClick?: () => void;
  onAccountClick?: () => void;
}

export default function Header({
  activePage = 'generate',
  currentUser = null,
  onLoginClick,
  onLogout,
  onLogoClick,
  onGenerateClick,
  onDashboardClick,
  onAccountClick,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Far-right button logic:
  // Not logged in → "Login"
  // Logged in, on account page → "Logout"
  // Logged in, not on account → "Account"
  const renderFarRight = () => {
    if (!currentUser) {
      return (
        <button
          type="button"
          className={`nav-link nav-btn ${activePage === 'login' ? 'active' : ''}`}
          onClick={() => { setMenuOpen(false); onLoginClick?.(); }}
        >
          Login
        </button>
      );
    }
    if (activePage === 'account') {
      return (
        <button type="button" className="nav-link nav-btn" onClick={() => { setMenuOpen(false); onLogout?.(); }}>
          Logout
        </button>
      );
    }
    return (
      <button
        type="button"
        className={`nav-link nav-btn`}
        onClick={() => { setMenuOpen(false); onAccountClick?.(); }}
      >
        Account
      </button>
    );
  };

  return (
    <header className="header">
      <button type="button" className="header-left header-home-btn" onClick={onLogoClick}>
        <img src="/logo.png" alt="Nutrition Label Pal" className="header-logo" />
        <h1 className="header-title">Nutrition Label Pal</h1>
      </button>
      <button
        type="button"
        className="hamburger-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle navigation"
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>
      <nav className={`header-nav ${menuOpen ? 'nav-open' : ''}`}>
        <button
          type="button"
          className={`nav-link nav-btn ${activePage === 'generate' ? 'active' : ''}`}
          onClick={() => { setMenuOpen(false); (onGenerateClick ?? onLogoClick)?.(); }}
        >
          Generate
        </button>
        <button
          type="button"
          className={`nav-link nav-btn ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setMenuOpen(false); onDashboardClick?.(); }}
        >
          Recipes
        </button>

        {renderFarRight()}
      </nav>
    </header>
  );
}
