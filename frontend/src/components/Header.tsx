import type { AuthUser } from '../types';

interface HeaderProps {
  activePage?: 'generate' | 'dashboard' | 'login';
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
}

export default function Header({
  activePage = 'generate',
  currentUser = null,
  onLoginClick,
  onLogout,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <img src="/logo.png" alt="Nutrition Label Pal" className="header-logo" />
        <h1 className="header-title">Nutrition Label Pal</h1>
      </div>
      <nav className="header-nav">
        <a
          href="#"
          className={`nav-link ${activePage === 'generate' ? 'active' : ''}`}
        >
          Generate
        </a>
        <a
          href="#"
          className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </a>

        {currentUser ? (
          <div className="header-user">
            <span className="header-username">{currentUser.full_name}</span>
            <button
              type="button"
              className="nav-link nav-logout-btn"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
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
