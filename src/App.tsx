import React, { useState, useEffect } from 'react';
import './index.css';
import { auth, db } from './firebase';
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
  getDocs,
  query,  // 쿼리를 위해 추가
  where,  // 필터링을 위해 추가
  type Timestamp
} from 'firebase/firestore';


// --- 타입 정의 ---
interface UserProfile { 
  name: string; 
  email: string; 
  competencies: string[]; 
  grade?: number;
  major?: string;
}

interface Activity { 
  id: string; 
  title: string; 
  content: string; 
  requiredCompetencies: string[]; 
  companyName: string;
  employmentType: string;
  location: string;
  applicationDeadline: Timestamp;
  createdAt: Timestamp;
  targetMajors: string[]; // ✅ 타겟 전공 필드 추가
}

interface RoadmapStep {
  grade: number;
  title: string;
  description: string;
  recommendations: string[];
  recommendedCompetencies: string[];
}


// --- 컴포넌트 정의 ---

const Header = ({ user, onSignOut }: { user: User | null; onSignOut: () => void; }) => (
    <header className="header">
        <nav className="nav">
            <h1>공대생 취업 로드맵</h1>
            {user && (
                <button onClick={onSignOut} className="button button-logout">로그아웃</button>
            )}
        </nav>
    </header>
);

const AuthForm = ({ view, setView, onSignUp, onSignIn, error }: {
    view: 'signIn' | 'signUp';
    setView: (view: 'signIn' | 'signUp') => void;
    onSignUp: (event: React.FormEvent<HTMLFormElement>) => void;
    onSignIn: (event: React.FormEvent<HTMLFormElement>) => void;
    error: string;
}) => (
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
            {view === 'signIn' ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
            <button onClick={() => setView(view === 'signIn' ? 'signUp' : 'signIn')} type="button" className="button button-link">
                {view === 'signIn' ? '회원가입' : '로그인'}
            </button>
        </p>
    </div>
);

const Profile = ({ userProfile, uid, setView }: { userProfile: UserProfile, uid: string, setView: (view: 'dashboard') => void }) => {
    const [competencies, setCompetencies] = useState(userProfile.competencies.join(', '));
    const [message, setMessage] = useState('');

    const getPlaceholderText = () => {
        switch (userProfile.major) {
            case '컴퓨터공학/소프트웨어':
                return '예: react, typescript, 정보처리기사';
            case '기계공학':
                return '예: 일반기계기사, catia, autocad';
            case '전자전기공학':
                return '예: 회로이론, 전기기사, pspice';
            default:
                return '보유한 역량을 쉼표로 구분하여 입력하세요';
        }
    };
    
    const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const competenciesArray = competencies.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const userDocRef = doc(db, "users", uid);
        try {
            await setDoc(userDocRef, { competencies: competenciesArray }, { merge: true });
            setMessage('프로필이 성공적으로 업데이트되었습니다!');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error("Profile update error: ", error);
            setMessage('업데이트에 실패했습니다.');
        }
    };

    return (
        <div className="auth-form-container" style={{ maxWidth: '600px' }}>
            <h2>프로필 수정</h2>
            <form onSubmit={handleProfileUpdate}>
                <div className="input-group">
                    <label htmlFor="competencies">나의 역량 (자격증, 사용 툴 등)</label>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                        {getPlaceholderText()}
                    </p>
                    <input
                        id="competencies"
                        type="text"
                        value={competencies}
                        onChange={(e) => setCompetencies(e.target.value)}
                        className="input"
                        placeholder="쉼표로 구분하여 역량을 입력하세요"
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                    <button type="submit" className="button button-primary" style={{ width: 'auto' }}>
                        저장하기
                    </button>
                    <button onClick={() => setView('dashboard')} type="button" className="button button-secondary">
                        돌아가기
                    </button>
                </div>
            </form>
            {message && <p style={{ marginTop: '1rem', textAlign: 'center', fontWeight: '600', color: '#16a34a' }}>{message}</p>}
        </div>
    );
};

const OnboardingForm = ({ user, onComplete }: { user: User, onComplete: (updatedProfile: UserProfile) => void; }) => {
    const [grade, setGrade] = useState('');
    const [major, setMajor] = useState('');
    
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!grade || !major) {
            alert('모든 항목을 선택해주세요.');
            return;
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const currentProfile = userDoc.data() as UserProfile;
            const updatedProfile: UserProfile = {
                ...currentProfile,
                grade: parseInt(grade),
                major: major,
            };

            try {
                await setDoc(userDocRef, updatedProfile, { merge: true });
                alert('정보가 저장되었습니다!');
                onComplete(updatedProfile);
            } catch (error) {
                console.error("Onboarding error: ", error);
                alert('정보 저장에 실패했습니다.');
            }
        }
    };

    return (
        <div className="auth-form-container" style={{ textAlign: 'center' }}>
            <h2>환영합니다!</h2>
            <p style={{ marginBottom: '2rem', color: '#4b5563' }}>
                정확한 로드맵 추천을 위해 추가 정보를 입력해주세요.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="input-group" style={{ textAlign: 'left' }}>
                    <label htmlFor="grade">학년</label>
                    <select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="input" required>
                        <option value="" disabled>학년을 선택하세요</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                        <option value="4">4학년</option>
                        <option value="5">졸업생</option>
                    </select>
                </div>
                <div className="input-group" style={{ textAlign: 'left' }}>
                    <label htmlFor="major">전공 계열</label>
                    <select id="major" value={major} onChange={(e) => setMajor(e.target.value)} className="input" required>
                        <option value="" disabled>전공 계열을 선택하세요</option>
                        <option value="컴퓨터공학/소프트웨어">컴퓨터공학/소프트웨어</option>
                        <option value="기계공학">기계공학</option>
                        <option value="전자전기공학">전자전기공학</option>
                        <option value="화학공학">화학공학</option>
                    </select>
                </div>
                <button type="submit" className="button button-primary" style={{ marginTop: '1rem' }}>
                    로드맵 추천 시작하기
                </button>
            </form>
        </div>
    );
};

const BuildingIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" style={{height: '1rem', width: '1rem', marginRight: '0.375rem', color: '#6b7280'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> );
const LocationIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" style={{height: '1rem', width: '1rem', marginRight: '0.375rem', color: '#6b7280'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const convertFirestoreTimestampToDate = (timestamp: Timestamp): Date => { if (!timestamp || typeof timestamp.toDate !== 'function') return new Date(); return timestamp.toDate(); };
const calculateDday = (deadline: Timestamp) => { const today = new Date(); const deadlineDate = convertFirestoreTimestampToDate(deadline); today.setHours(0, 0, 0, 0); deadlineDate.setHours(0, 0, 0, 0); const diffTime = deadlineDate.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays < 0) return <span style={{color: '#ef4444', fontWeight: 'bold'}}>마감</span>; if (diffDays === 0) return <span style={{color: '#f59e0b', fontWeight: 'bold'}}>D-Day</span>; return <span style={{color: '#22c55e', fontWeight: 'bold'}}>D-{diffDays}</span>; };

const ActivityCard = ({ activity, userCompetencies }: { activity: Activity, userCompetencies: string[] }) => {
    const calculateMatchRate = () => {
        if (!userCompetencies?.length || !activity.requiredCompetencies?.length) return 0;
        const lowerUserCompetencies = userCompetencies.map(s => s.toLowerCase());
        const lowerRequiredCompetencies = activity.requiredCompetencies.map(s => s.toLowerCase());
        const matchCount = lowerRequiredCompetencies.filter(c => lowerUserCompetencies.includes(c)).length;
        return Math.round((matchCount / lowerRequiredCompetencies.length) * 100);
    };
    const matchRate = calculateMatchRate();
    const deadlineDate = convertFirestoreTimestampToDate(activity.applicationDeadline);
    const formattedDeadline = `${deadlineDate.getFullYear()}.${String(deadlineDate.getMonth() + 1).padStart(2, '0')}.${String(deadlineDate.getDate()).padStart(2, '0')}`;
    return (
        <div className="activity-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem'}}>
                <div>
                    <div style={{display: 'flex', alignItems: 'center', fontSize: '1rem', fontWeight: 'bold'}}><BuildingIcon /><span>{activity.companyName || '회사정보 없음'}</span></div>
                    <span style={{display: 'inline-block', marginTop: '0.25rem', backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', fontWeight: '600', padding: '0.25rem 0.75rem', borderRadius: '9999px'}}>{activity.employmentType || '정보 없음'}</span>
                </div>
                <div style={{textAlign: 'right'}}>
                   <div style={{fontWeight: '800', fontSize: '1.125rem'}}>{calculateDday(activity.applicationDeadline)}</div>
                   <p style={{fontSize: '0.75rem', color: '#6b7280', margin: 0}}>~{formattedDeadline}</p>
                </div>
            </div>
            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', margin: '0.5rem 0'}}>{activity.title}</h3>
            <p style={{color: '#374151', margin: '0 0 1rem 0'}}>{activity.content}</p>
            <div style={{display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#4b5563', marginBottom: '1rem'}}><LocationIcon /><span>{activity.location || '근무지 정보 없음'}</span></div>
            <div style={{marginTop: 'auto'}}>
                <h4 style={{fontWeight: '600', marginBottom: '0.5rem'}}>요구 역량:</h4>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {activity.requiredCompetencies?.map(competency => (
                        <span key={competency} className={userCompetencies?.map(s=>s.toLowerCase()).includes(competency.toLowerCase()) ? "skill-tag skill-tag-match" : "skill-tag"}>
                            {competency}
                        </span>
                    )) || '요구 역량 정보 없음'}
                </div>
            </div>
            <div style={{marginTop: '1.5rem'}}>
                <p style={{fontWeight: 'bold', fontSize: '1.125rem' }}>나의 역량 매칭률: {matchRate}%</p>
                <div className="match-rate-bar-bg" style={{marginTop: '0.5rem'}}>
                    <div className="match-rate-bar" style={{width: `${matchRate}%`, backgroundColor: matchRate > 70 ? '#22c55e' : (matchRate > 40 ? '#f59e0b' : '#ef4444')}}></div>
                </div>
            </div>
        </div>
    );
};

const RoadmapGuide = ({ userProfile }: { userProfile: UserProfile }) => {
  const [roadmapStep, setRoadmapStep] = useState<RoadmapStep | null>(null);

  useEffect(() => {
    const fetchRoadmap = async () => {
      if (userProfile.major && userProfile.grade) {
        const roadmapId = userProfile.major.replace('/', ',');
        const roadmapDocRef = doc(db, "roadmaps", roadmapId);
        const roadmapDoc = await getDoc(roadmapDocRef);

        if (roadmapDoc.exists()) {
          const roadmapData = roadmapDoc.data();
          const currentStep = roadmapData.steps.find(
            (step: RoadmapStep) => step.grade === userProfile.grade
          );
          setRoadmapStep(currentStep || null);
        } else {
          console.log(`No roadmap found for: ${roadmapId}`);
          setRoadmapStep(null);
        }
      }
    };
    fetchRoadmap();
  }, [userProfile]);

  if (!roadmapStep) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
        <p>아직 {userProfile.major} 전공의 {userProfile.grade}학년 로드맵이 준비되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', borderBottom: '2px solid #2563eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
        {userProfile.name}님을 위한 {roadmapStep.grade}학년 맞춤 로드맵
      </h2>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{roadmapStep.title}</h3>
      <p style={{ color: '#4b5563', lineHeight: '1.6' }}>{roadmapStep.description}</p>
      <h4 style={{ fontWeight: 'bold', marginTop: '1.5rem' }}>추천 활동:</h4>
      <ul style={{ paddingLeft: '20px', listStyle: 'disc' }}>
        {roadmapStep.recommendations.map((rec, index) => (
          <li key={index} style={{ marginBottom: '0.5rem' }}>{rec}</li>
        ))}
      </ul>
      <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ fontWeight: 'bold' }}>추천 역량:</h4>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {roadmapStep.recommendedCompetencies.map(comp => (
                <span key={comp} className="skill-tag">{comp}</span>
            ))}
          </div>
          <p style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem'}}>
            이 역량들을 '프로필 수정'에 추가하고 관련 활동들을 찾아보세요!
          </p>
      </div>
    </div>
  );
};


const Dashboard = ({ userProfile, uid }: { userProfile: UserProfile, uid: string }) => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [view, setView] = useState<'dashboard' | 'profile'>('dashboard');

    useEffect(() => {
        const fetchActivities = async () => {
            if (!userProfile.major) return;

            const activitiesCollection = collection(db, "activities");
            const q = query(activitiesCollection, where("targetMajors", "array-contains", userProfile.major));

            try {
                const activitySnapshot = await getDocs(q);
                const activityList = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
                setActivities(activityList);
            } catch (error) {
                console.error("Error fetching activities: ", error);
                // Firestore 색인 생성 오류가 발생할 수 있습니다.
                // 콘솔의 에러 메시지에 포함된 링크를 클릭하여 색인을 생성해야 합니다.
            }
        };
        fetchActivities();
    }, [userProfile]);

    if (view === 'profile') {
        return <Profile userProfile={userProfile} uid={uid} setView={setView} />;
    }

    return (
        <div>
            <RoadmapGuide userProfile={userProfile} />
            <div className="dashboard-header">
                <h2>대시보드</h2>
                <button onClick={() => setView('profile')} className="button button-secondary">
                    프로필 수정
                </button>
            </div>
            <p style={{ fontSize: '1.125rem', marginBottom: '2rem' }}>
                <span style={{fontWeight: 'bold'}}>{userProfile.name}</span>님, 환영합니다! 회원님의 역량과 맞는 활동들을 확인해보세요.
            </p>
            <div className="activity-grid">
                {activities.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} userCompetencies={userProfile.competencies} />
                ))}
            </div>
        </div>
    );
};


// --- 메인 App 컴포넌트 ---
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [authView, setAuthView] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string>('');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) { setUserProfile(null); setNeedsOnboarding(false); setIsLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
        setIsLoading(true);
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) { setUserProfile(userDoc.data() as UserProfile); } 
            else { setUserProfile(null); }
        }
        setIsLoading(false); 
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (userProfile && !userProfile.grade) { setNeedsOnboarding(true); } 
    else { setNeedsOnboarding(false); }
  }, [userProfile]);


  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const { name, email, password } = event.currentTarget.elements as any;
      try {
          setError('');
          const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
          const userDocRef = doc(db, "users", userCredential.user.uid);
          await setDoc(userDocRef, { name: name.value, email: email.value, competencies: [] });
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
      setAuthView('signIn');
  };
  
  const handleOnboardingComplete = (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
      setNeedsOnboarding(false);
  };

  if (isLoading) { return <div style={{display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>; }
 
  const renderContent = () => {
      if (user) {
          if (needsOnboarding) { return <OnboardingForm user={user} onComplete={handleOnboardingComplete} />; }
          if(userProfile){ return <Dashboard userProfile={userProfile} uid={user.uid} />; }
          return <div style={{display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center'}}>Loading Profile...</div>;
      }
      return ( <AuthForm view={authView} setView={setAuthView} onSignUp={handleSignUp} onSignIn={handleSignIn} error={error} /> );
  };

  return (
    <>
      <Header user={user} onSignOut={handleSignOut} />
      <main className="container">
        {renderContent()}
      </main>
    </>
  );
}

export default App;