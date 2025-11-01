// src/pages/AuthPage.tsx
import React from 'react';

interface AuthPageProps {
  view: 'signIn' | 'signUp';
  setView: (v: 'signIn' | 'signUp') => void;
  onSignIn: (e: React.FormEvent<HTMLFormElement>) => void;
  onSignUp: (e: React.FormEvent<HTMLFormElement>) => void;
  error: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ view, setView, onSignIn, onSignUp, error }) => {
  return (
    <div className="auth-form-container">
      <h2>{view === 'signIn' ? '로그인' : '회원가입'}</h2>
      <form onSubmit={view === 'signIn' ? onSignIn : onSignUp}>
        {view === 'signUp' && (
          <div className="input-group">
            <label htmlFor="name">이름</label>
            <input className="input" type="text" id="name" name="name" required />
          </div>
        )}
        <div className="input-group">
          <label htmlFor="email">이메일</label>
          <input className="input" type="email" id="email" name="email" required />
        </div>
        <div className="input-group">
          <label htmlFor="password">비밀번호</label>
          <input className="input" type="password" id="password" name="password" required />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="button button-primary">
          {view === 'signIn' ? '로그인' : '회원가입'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
        {view === 'signIn' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
        <button onClick={() => setView(view === 'signIn' ? 'signUp' : 'signIn')} className="button button-link" type="button">
          {view === 'signIn' ? '회원가입' : '로그인'}
        </button>
      </p>
    </div>
  );
};

export default AuthPage;
