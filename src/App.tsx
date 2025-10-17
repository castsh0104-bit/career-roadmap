/*
  IT 커리어 로드맵 빌더 - 구조 개선 최종 버전
  - 분리된 CSS와 Firebase 설정을 불러와서 사용합니다.
*/
import { useState, useEffect } from 'react';

// ✨ 1단계: 분리된 파일들을 정확하게 불러옵니다.
import './index.css'; // 분리된 CSS 파일을 불러옵니다.
import { auth, db } from './firebase'; // 분리된 Firebase 설정을 불러옵니다.

// ✨ 2단계: 나머지 필요한 Firebase 함수들을 불러옵니다.
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  type User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';

// 데이터 타입 정의
interface UserProfile { 
  name: string; 
  email: string; 
  skills: string[]; 
}
interface Activity { 
  id: string; 
  title: string; 
  content: string; 
  requiredSkills: string[]; 
}

// 메인 앱 컴포넌트
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authView, setAuthView] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { name, email, password } = event.currentTarget.elements as any;
    try {
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userDocRef, { name: name.value, email: email.value, skills: [] }); 
      setAuthView('signIn');
    } catch (err: any) { 
      setError(err.message); 
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { email, password } = event.currentTarget.elements as any;
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } catch (err: any) { 
      setError(err.message); 
    }
  };

  const handleSignOut = async () => { 
    await signOut(auth); 
  };

  if (isLoading) { 
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>; 
  }

  return (
    <>
      <Header user={user} onSignOut={handleSignOut} />
      <main className="container">
        {user && userProfile ? (
          <Dashboard userProfile={userProfile} uid={user.uid} />
        ) : (
          <AuthForm 
            view={authView} 
            setView={setAuthView}
            onSignUp={handleSignUp}
            onSignIn={handleSignIn}
            error={error}
          />
        )}
      </main>
    </>
  );
}

// 나머지 모든 컴포넌트 코드는 이전과 동일합니다.
const Header = ({ user, onSignOut }: { user: User | null; onSignOut: () => void; }) => (
  <header className="header">
    <nav className="nav">
      <h1>IT 커리어 로드맵</h1>
      {user && (
        <button onClick={onSignOut} className="button button-logout">로그아웃</button>
      )}
    </nav>
  </header>
);

const AuthForm = ({ view, setView, onSignUp, onSignIn, error }: any) => (
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
    <p style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
      {view === 'signIn' ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
      <button onClick={() => setView(view === 'signIn' ? 'signUp' : 'signIn')} className="button button-link">
        {view === 'signIn' ? '회원가입' : '로그인'}
      </button>
    </p>
  </div>
);

const Dashboard = ({ userProfile, uid }: { userProfile: UserProfile, uid: string }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard');

  useEffect(() => {
    const fetchActivities = async () => {
      const activitiesCollection = collection(db, "activities");
      const activitySnapshot = await getDocs(activitiesCollection);
      const activityList = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(activityList);
    };
    fetchActivities();
  }, []);

  if (view === 'profile') {
    return <Profile userProfile={userProfile} uid={uid} setView={setView} />;
  }

  return (
    <div>
      <div className="dashboard-header">
        <h2>대시보드</h2>
        <button onClick={() => setView('profile')} className="button button-secondary">
          프로필 수정
        </button>
      </div>
      <p style={{ fontSize: '1.125rem', marginBottom: '2rem' }}>
        <span style={{fontWeight: 'bold'}}>{userProfile.name}</span>님, 환영합니다! 회원님의 스킬과 맞는 활동들을 확인해보세요.
      </p>
      <div className="activity-grid">
        {activities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} userSkills={userProfile.skills} />
        ))}
      </div>
    </div>
  );
};

const Profile = ({ userProfile, uid, setView }: { userProfile: UserProfile, uid: string, setView: (view: 'dashboard') => void }) => {
    const [skills, setSkills] = useState(userProfile.skills.join(', '));
    const [message, setMessage] = useState('');

    const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
        const userDocRef = doc(db, "users", uid);
        try {
            await setDoc(userDocRef, { name: userProfile.name, email: userProfile.email, skills: skillsArray }, { merge: true });
            setMessage('프로필이 성공적으로 업데이트되었습니다!');
            setTimeout(() => {
                setMessage('');
                window.location.reload(); 
            }, 1500);
        } catch (error) {
            setMessage('업데이트에 실패했습니다.');
        }
    };

    return (
        <div className="auth-form-container" style={{ maxWidth: '600px' }}>
            <h2>프로필 수정</h2>
            <form onSubmit={handleProfileUpdate}>
                <div className="input-group">
                    <label htmlFor="skills">나의 기술 스택 (쉼표로 구분)</label>
                    <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem'}}>
                        예시: React, TypeScript, Firebase, Node.js
                    </p>
                    <input
                        id="skills"
                        type="text"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="input"
                        placeholder="보유한 기술을 입력하세요"
                    />
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                    <button type="submit" className="button button-primary" style={{width: 'auto'}}>
                        저장하기
                    </button>
                    <button onClick={() => setView('dashboard')} type="button" className="button button-secondary">
                        돌아가기
                    </button>
                </div>
            </form>
            {message && <p style={{marginTop: '1rem', textAlign: 'center', fontWeight: '600', color: '#16a34a'}}>{message}</p>}
        </div>
    );
};
    
const ActivityCard = ({ activity, userSkills }: { activity: Activity, userSkills: string[] }) => {
    const calculateMatchRate = () => {
        if (!userSkills || !userSkills.length || !activity.requiredSkills || !activity.requiredSkills.length) return 0;
        const matchCount = activity.requiredSkills.filter(skill => userSkills.includes(skill)).length;
        return Math.round((matchCount / activity.requiredSkills.length) * 100);
    };
    const matchRate = calculateMatchRate();
    
    let barColor = '#ef4444'; 
    if (matchRate > 70) barColor = '#22c55e';
    else if (matchRate > 40) barColor = '#f59e0b';

    return (
        <div className="activity-card">
            <h3>{activity.title}</h3>
            <p style={{marginTop: '0.5rem', color: '#4b5563'}}>{activity.content}</p>
            <div style={{marginTop: '1rem'}}>
                <h4 style={{fontWeight: '600'}}>요구 스킬:</h4>
                <div style={{marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap' }}>
                    {activity.requiredSkills?.map(skill => (
                        <span key={skill} className={userSkills?.includes(skill) ? "skill-tag skill-tag-match" : "skill-tag"}>
                            {skill}
                        </span>
                    )) || '요구 스킬 정보 없음'}
                </div>
            </div>
            <div style={{marginTop: '1.5rem'}}>
                <p style={{fontWeight: 'bold', fontSize: '1.125rem' }}>나의 스킬 매칭률: {matchRate}%</p>
                <div className="match-rate-bar-bg" style={{marginTop: '0.5rem'}}>
                    <div className="match-rate-bar" style={{width: `${matchRate}%`, backgroundColor: barColor}}></div>
                </div>
            </div>
        </div>
    );
};

export default App;