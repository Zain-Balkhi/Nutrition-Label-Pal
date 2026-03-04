import type { AuthUser } from '../types';

interface HeaderProps {
  activePage?: 'generate' | 'dashboard' | 'login' | 'account';
  currentUser?: AuthUser | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
  onLogoClick?: () => void;
  onDashboardClick?: () => void;
  onAccountClick?: () => void;
}

export default function Header({
  activePage = 'generate',
  currentUser = null,
  onLoginClick,
  onLogout,
  onLogoClick,
  onDashboardClick,
  onAccountClick,
}: HeaderProps) {
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
          onClick={onLoginClick}
        >
          Login
        </button>
      );
    }
    if (activePage === 'account') {
      return (
        <button type="button" className="nav-link nav-btn" onClick={onLogout}>
          Logout
        </button>
      );
    }
    return (
      <button
        type="button"
        className={`nav-link nav-btn`}
        onClick={onAccountClick}
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
      <nav className="header-nav">
        <button
          type="button"
          className={`nav-link nav-btn ${activePage === 'generate' ? 'active' : ''}`}
          onClick={onLogoClick}
        >
          Generate
        </button>
        <button
          type="button"
          className={`nav-link nav-btn ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={onDashboardClick}
        >
          Dashboard
        </button>

        {renderFarRight()}
      </nav>
    </header>
  );
}
