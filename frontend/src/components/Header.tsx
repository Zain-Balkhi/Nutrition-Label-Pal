import type { AuthUser } from '../types';

interface HeaderProps {
  activePage?: 'generate' | 'dashboard' | 'login';
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
  onLogoClick?: () => void;
}

export default function Header({
  activePage = 'generate',
  currentUser = null,
  onLoginClick,
  onLogout,
  onLogoClick,
}: HeaderProps) {
  return (
    <header className="header">
      <button type="button" className="header-left header-home-btn" onClick={onLogoClick}>
        <img src="/logo.png" alt="Nutrition Label Pal" className="header-logo" />
        <h1 className="header-title">Nutrition Label Pal</h1>
      </button>
      <nav className="header-nav">
        <button
          type="button"
          className={`nav-link nav-btn ${activePage === 'generate' ? 'active' : ''}`}
          onClick={onLogoClick}
        >
          Generate
        </button>
        <a
          href="#"
          className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </a>

        {currentUser ? (
          <button
            type="button"
            className="nav-link nav-btn"
            onClick={onLogout}
          >
            Logout
          </button>
        ) : (
          <button
            type="button"
            className={`nav-link nav-btn ${activePage === 'login' ? 'active' : ''}`}
            onClick={onLoginClick}
          >
            Login
          </button>
        )}
      </nav>
    </header>
  );
}
