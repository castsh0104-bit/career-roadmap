import React, { useEffect, useState } from 'react';
import './index.css';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Header from './components/Header';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import MyPage from './pages/MyPage';
import AdminPage from './pages/AdminPage'; 
import type { UserProfile } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authView, setAuthView] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState('');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [appView, setAppView] = useState<'dashboard' | 'mypage' | 'admin'>('dashboard');

  // 로그인 상태 
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setNeedsOnboarding(false);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // 유저 프로필 가져오기
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setIsLoading(true);
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const prof = snap.data() as UserProfile;
        if (!prof.competencies) prof.competencies = [];
        if (!prof.completedActivities) prof.completedActivities = [];
        if (!prof.likedActivityIds) prof.likedActivityIds = [];
        setUserProfile(prof);
        setNeedsOnboarding(!prof.grade);
      } else {
        setUserProfile(null);
        setNeedsOnboarding(false);
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);

  // 좋아요 토글
  const handleToggleLike = async (activityId: string) => {
    if (!user || !userProfile) return;
    const current = userProfile.likedActivityIds || [];
    let newLikes: string[] = [];
    if (current.includes(activityId)) {
      newLikes = current.filter((id) => id !== activityId);
    } else {
      newLikes = [...current, activityId];
    }
    // optimistic
    setUserProfile({ ...userProfile, likedActivityIds: newLikes });
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { likedActivityIds: newLikes }, { merge: true });
    } catch (e) {
      console.error(e);
      setUserProfile(userProfile);
    }
  };

  // 회원가입
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, email, password } = e.currentTarget.elements as any;
    try {
      setError('');
      const cred = await createUserWithEmailAndPassword(auth, email.value, password.value);
      const ref = doc(db, 'users', cred.user.uid);
      await setDoc(ref, {
        name: name.value,
        email: email.value,
        competencies: [],
        completedActivities: [],
        likedActivityIds: [],
        role: 'user',
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 로그인
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { email, password } = e.currentTarget.elements as any;
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 로그아웃
  const handleSignOut = async () => {
    await signOut(auth);
    setAuthView('signIn');
    setAppView('dashboard');
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setNeedsOnboarding(false);
  };

  // 로딩 화면
  if (isLoading) {
    return (
      <>
        <Header user={user} onSignOut={handleSignOut} />
        <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          Loading...
        </main>
      </>
    );
  }

  // 비로그인
  if (!user) {
    return (
      <>
        <Header user={null} onSignOut={handleSignOut} />
        <main className="container">
          <AuthPage view={authView} setView={setAuthView} onSignIn={handleSignIn} onSignUp={handleSignUp} error={error} />
        </main>
      </>
    );
  }

  // 온보딩 필요
  if (needsOnboarding || !userProfile) {
    return (
      <>
        <Header user={user} onSignOut={handleSignOut} />
        <main className="container">
          <OnboardingPage user={user} onComplete={handleOnboardingComplete} />
        </main>
      </>
    );
  }

  // 여기부터 로그인 + 프로필 있음
  const isAdmin = userProfile.role === 'admin';

  return (
    <>
      <Header user={user} onSignOut={handleSignOut} />
      <main className="container">
        {appView === 'dashboard' && (
          <DashboardPage
            userProfile={userProfile}
            uid={user.uid}
            onToggleLike={handleToggleLike}
            onGoMyPage={() => setAppView('mypage')}
            onGoAdmin={isAdmin ? () => setAppView('admin') : undefined}
          />
        )}
        {appView === 'mypage' && (
          <MyPage userProfile={userProfile} uid={user.uid} onToggleLike={handleToggleLike} onBack={() => setAppView('dashboard')} />
        )}
        {appView === 'admin' && isAdmin && (
          <AdminPage onBack={() => setAppView('dashboard')} /> 
        )}
      </main>
    </>
  );
}

export default App;
