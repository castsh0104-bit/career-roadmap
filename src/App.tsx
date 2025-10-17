  /*
      IT 커리어 로드맵 빌더 (React + TypeScript + Firebase)
      이 파일 하나에 우리 프로젝트의 모든 MVP 기능과 '순수 CSS 스타일'이 담겨 있습니다.
      더 이상의 외부 CSS 설정 없이 이 파일 하나로 모든 것이 작동합니다.
    */
    import { useState, useEffect } from 'react';
    import { initializeApp } from 'firebase/app';
    import { 
      getAuth, 
      createUserWithEmailAndPassword, 
      signInWithEmailAndPassword, 
      onAuthStateChanged, 
      signOut,
      type User 
    } from 'firebase/auth';
    import { 
      getFirestore, 
      doc, 
      setDoc, 
      getDoc, 
      collection, 
      getDocs 
    } from 'firebase/firestore';
    
    // ===================================================================================
    // 🔥 STEP 1: Firebase 설정 붙여넣기
    // ===================================================================================
    const firebaseConfig = {
      apiKey: "AIzaSyDONQQV1l8xI97p4Q_BroPPQYYJz4t3_DM",
  authDomain: "career-roadmap-b48cc.firebaseapp.com",
  projectId: "career-roadmap-b48cc",
  storageBucket: "career-roadmap-b48cc.firebasestorage.app",
  messagingSenderId: "380566630637",
  appId: "1:380566630637:web:ddac49473ff9115d065ce4",
    };
    // ===================================================================================
    
    // Firebase 앱 초기화
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    // ===================================================================================
    // 🔥 STEP 2: 순수 CSS 스타일 코드
    // 복잡한 설정 없이 여기에 모든 디자인을 정의합니다.
    // ===================================================================================
    const styles = `
      body { 
        margin: 0; 
        font-family: sans-serif; 
        background-color: #f9fafb; 
        color: #111827;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }
      /* 헤더 */
      .header {
        background-color: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        padding: 1rem 2rem;
      }
      .nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
      }
      .nav h1 {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2563eb;
      }
      /* 버튼 */
      .button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.375rem;
        color: white;
        cursor: pointer;
        font-weight: 600;
      }
      .button-logout {
        background-color: #ef4444;
      }
      .button-logout:hover {
        background-color: #dc2626;
      }
      .button-primary {
        background-color: #2563eb;
        width: 100%;
        padding: 0.75rem;
      }
      .button-primary:hover {
        background-color: #1d4ed8;
      }
      .button-secondary {
        background-color: #e5e7eb;
        color: #111827;
      }
      .button-secondary:hover {
        background-color: #d1d5db;
      }
      .button-link {
        background: none;
        color: #2563eb;
        font-weight: 600;
        margin-left: 0.25rem;
      }
      .button-link:hover {
        text-decoration: underline;
      }
      /* 인증 폼 */
      .auth-form-container {
        max-width: 400px;
        margin: 2rem auto;
        background-color: white;
        padding: 2rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .auth-form-container h2 {
        text-align: center;
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
      }
      .input-group {
        margin-bottom: 1rem;
      }
      .input-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
      }
      .input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        box-sizing: border-box; /* 중요! */
      }
      .error-message {
        color: #ef4444;
        text-align: center;
        margin-bottom: 1rem;
      }
      /* 대시보드 */
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .dashboard-header h2 {
        font-size: 2rem;
        font-weight: bold;
      }
      .activity-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }
      /* 활동 카드 */
      .activity-card {
        background-color: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1.5rem;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .activity-card h3 {
        font-size: 1.25rem;
        font-weight: bold;
      }
      .skill-tag {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        margin: 0.25rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        background-color: #e5e7eb;
      }
      .skill-tag-match {
        background-color: #bfdbfe;
        color: #1e40af;
      }
      .match-rate-bar-bg {
        width: 100%;
        background-color: #e5e7eb;
        height: 8px;
        border-radius: 9999px;
      }
      .match-rate-bar {
        height: 100%;
        border-radius: 9999px;
      }
    `;
    // ===================================================================================
    
    // 데이터 타입 정의
    interface UserProfile { email: string; skills: string[]; }
    interface Activity { id: string; title: string; content: string; requiredSkills: string[]; }
    
    function App() {
      // (기존의 모든 React/Firebase 로직은 그대로 유지됩니다)
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
        const { email, password } = event.currentTarget.elements as any;
        try {
          setError('');
          const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
          const userDocRef = doc(db, "users", userCredential.user.uid);
          await setDoc(userDocRef, { email: email.value, skills: [] });
          setAuthView('signIn');
        } catch (err: any) { setError(err.message); }
      };
    
      const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { email, password } = event.currentTarget.elements as any;
        try {
          setError('');
          await signInWithEmailAndPassword(auth, email.value, password.value);
        } catch (err: any) { setError(err.message); }
      };
    
      const handleSignOut = async () => { await signOut(auth); };
    
      if (isLoading) { return <div className="loading">Loading...</div>; }
    
      return (
        <>
          <style>{styles}</style> {/* 이 한 줄로 모든 CSS를 적용합니다! */}
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
    
    // (이하 모든 컴포넌트는 className을 사용합니다. Tailwind가 아니어도 이름은 그대로 쓸 수 있습니다.)
    
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
        <p style={{textAlign: 'center', marginTop: '1rem'}}>
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
          <p>
            <span style={{fontWeight: 'bold'}}>{userProfile.email}</span>님, 환영합니다! 회원님의 스킬과 맞는 활동들을 확인해보세요.
          </p>
          <div className="activity-grid" style={{marginTop: '1.5rem'}}>
            {activities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} userSkills={userProfile.skills} />
            ))}
          </div>
        </div>
      );
    };
    
    const Profile = ({ userProfile, uid, setView }: { userProfile: UserProfile, uid: string, setView: (view: 'dashboard') => void }) => {
        // (프로필 컴포넌트 로직은 기존과 동일)
        const [skills, setSkills] = useState(userProfile.skills.join(', '));
        const [message, setMessage] = useState('');

        const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
            const userDocRef = doc(db, "users", uid);
            try {
                await setDoc(userDocRef, { email: userProfile.email, skills: skillsArray }, { merge: true });
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
            <div className="auth-form-container">
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
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
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
            if (!userSkills.length || !activity.requiredSkills.length) return 0;
            const matchCount = activity.requiredSkills.filter(skill => userSkills.includes(skill)).length;
            return Math.round((matchCount / activity.requiredSkills.length) * 100);
        };
        const matchRate = calculateMatchRate();
        
        let barColor = '#ef4444'; // red
        if (matchRate > 70) barColor = '#22c55e'; // green
        else if (matchRate > 40) barColor = '#f59e0b'; // yellow

        return (
            <div className="activity-card">
                <h3>{activity.title}</h3>
                <p style={{marginTop: '0.5rem', color: '#4b5563'}}>{activity.content}</p>
                <div style={{marginTop: '1rem'}}>
                    <h4 style={{fontWeight: '600'}}>요구 스킬:</h4>
                    <div style={{marginTop: '0.5rem'}}>
                        {activity.requiredSkills.map(skill => (
                            <span key={skill} className={userSkills.includes(skill) ? "skill-tag skill-tag-match" : "skill-tag"}>
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{marginTop: '1.5rem'}}>
                    <p style={{fontWeight: 'bold'}}>나의 스킬 매칭률: {matchRate}%</p>
                    <div className="match-rate-bar-bg" style={{marginTop: '0.5rem'}}>
                        <div className="match-rate-bar" style={{width: `${matchRate}%`, backgroundColor: barColor}}></div>
                    </div>
                </div>
            </div>
        );
    };
    
    export default App;
    