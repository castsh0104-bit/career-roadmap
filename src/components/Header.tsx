import React from 'react';
import type { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="header">
      <nav className="nav">
        <h1 style={{ cursor: 'pointer' }} onClick={() => window.location.reload()}>
          공대생 취업 로드맵
        </h1>
        {user && (
          <button onClick={onSignOut} className="button button-logout">
            로그아웃
          </button>
        )}
      </nav>
    </header>
  );
};

export default Header;
