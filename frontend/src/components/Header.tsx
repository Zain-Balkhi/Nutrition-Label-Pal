interface HeaderProps {
  activePage?: 'generate' | 'dashboard' | 'login';
}

export default function Header({ activePage = 'generate' }: HeaderProps) {
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
        <a
          href="#"
          className={`nav-link ${activePage === 'login' ? 'active' : ''}`}
        >
          Login
        </a>
      </nav>
    </header>
  );
}