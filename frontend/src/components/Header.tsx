import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AuthUser } from '../types';

interface HeaderProps {
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export default function Header({
  currentUser = null,
  onLogout,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const activePage = (() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/generate') return 'generate';
    if (path.startsWith('/recipes')) return 'dashboard';
    if (path === '/login' || path === '/register') return 'login';
    if (path === '/account') return 'account';
    return 'home';
  })();

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
          onClick={() => { setMenuOpen(false); navigate('/login'); }}
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
        onClick={() => { setMenuOpen(false); navigate('/account'); }}
      >
        Account
      </button>
    );
  };

  return (
    <header className="header">
      <button type="button" className="header-left header-home-btn" onClick={() => navigate('/')}>
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
          onClick={() => { setMenuOpen(false); navigate('/generate'); }}
        >
          Generate
        </button>
        <button
          type="button"
          className={`nav-link nav-btn ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setMenuOpen(false); navigate('/recipes'); }}
        >
          Recipes
        </button>

        {renderFarRight()}
      </nav>
    </header>
  );
}
