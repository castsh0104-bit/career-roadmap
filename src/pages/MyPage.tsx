// src/pages/MyPage.tsx
import React, { useEffect, useState } from 'react';
import type { UserProfile, MyActivity, Activity, ActivityWithMatchRate } from '../types';
import { db } from '../firebase';
import { collection, doc, getDocs, query, setDoc, where, documentId } from 'firebase/firestore';
import ActivityCard from '../components/ActivityCard';

interface MyPageProps {
  userProfile: UserProfile;
  uid: string;
  onToggleLike: (id: string) => void;
  onBack: () => void;
}

const MyPage: React.FC<MyPageProps> = ({ userProfile, uid, onToggleLike, onBack }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'likes'>('info');
  const [competencies, setCompetencies] = useState((userProfile.competencies || []).join(', '));
  const [myActivities, setMyActivities] = useState<MyActivity[]>(userProfile.completedActivities || []);
  const [message, setMessage] = useState('');
  const [newActivityType, setNewActivityType] = useState<'인턴' | '공모전' | '자격증' | '기타'>('인턴');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDate, setNewActivityDate] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [likedActivities, setLikedActivities] = useState<ActivityWithMatchRate[]>([]);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const getMatchRate = (activity: Activity, userCompetencies: string[]): number => {
    if (!userCompetencies?.length || !activity.requiredCompetencies?.length) return 0;
    const lowerUser = userCompetencies.map((s) => s.toLowerCase());
    const lowerReq = activity.requiredCompetencies.map((s) => s.toLowerCase());
    const matchCount = lowerReq.filter((c) => lowerUser.includes(c)).length;
    return Math.round((matchCount / lowerReq.length) * 100);
  };

  // 관심 활동 불러오기
  useEffect(() => {
    if (activeTab !== 'likes') return;

    const fetchLiked = async () => {
      setIsLikeLoading(true);
      const likedIds = userProfile.likedActivityIds || [];
      if (likedIds.length === 0) {
        setLikedActivities([]);
        setIsLikeLoading(false);
        return;
      }
      try {
        const activitiesRef = collection(db, 'activities');
        const MAX_IN = 10;
        const all: ActivityWithMatchRate[] = [];
        for (let i = 0; i < likedIds.length; i += MAX_IN) {
          const chunk = likedIds.slice(i, i + MAX_IN);
          const q = query(activitiesRef, where(documentId(), 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const act = { id: docSnap.id, ...docSnap.data() } as Activity;
            all.push({
              ...act,
              matchRate: getMatchRate(act, userProfile.competencies || []),
            });
          });
        }
        setLikedActivities(all);
      } catch (e) {
        console.error(e);
        setLikedActivities([]);
      } finally {
        setIsLikeLoading(false);
      }
    };

    fetchLiked();
  }, [activeTab, userProfile]);

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

  const handleCompetencyUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const arr = competencies
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { competencies: arr }, { merge: true });
      setMessage('역량 정보가 성공적으로 업데이트되었습니다!');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) {
      console.error(e);
      setMessage('업데이트에 실패했습니다.');
    }
  };

  const handleAddActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newActivityTitle.trim() || !newActivityDate.trim()) {
      alert('활동 이름과 기간은 필수입니다.');
      return;
    }
    const newAct: MyActivity = {
      id: `act_${Date.now()}`,
      type: newActivityType,
      title: newActivityTitle.trim(),
      date: newActivityDate.trim(),
      description: newActivityDesc.trim(),
    };
    const updated = [...myActivities, newAct];
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { completedActivities: updated }, { merge: true });
      setMyActivities(updated);
      setNewActivityType('인턴');
      setNewActivityTitle('');
      setNewActivityDate('');
      setNewActivityDesc('');
    } catch (e) {
      console.error(e);
      alert('활동 추가에 실패했습니다.');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!window.confirm('정말 삭제할까요?')) return;
    const updated = myActivities.filter((a) => a.id !== id);
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { completedActivities: updated }, { merge: true });
      setMyActivities(updated);
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };

  return (
    <div className="mypage-container">
      <div className="mypage-header">
        <h2 className="mypage-title">마이페이지</h2>
        <button onClick={onBack} type="button" className="button button-secondary">
          대시보드로 돌아가기
        </button>
      </div>

      <div className="tab-menu">
        <button
          onClick={() => setActiveTab('info')}
          className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
        >
          내 정보
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          나의 활동 기록
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`tab-button ${activeTab === 'likes' ? 'active' : ''}`}
        >
          관심 활동
        </button>
      </div>

      {activeTab === 'info' && (
        <div>
          <div className="info-box">
            <h3>기본 정보</h3>
            <p>
              <strong>이름:</strong> {userProfile.name}
            </p>
            <p>
              <strong>이메일:</strong> {userProfile.email}
            </p>
            <p>
              <strong>학년:</strong> {userProfile.grade}학년
            </p>
            <p>
              <strong>전공 계열:</strong> {userProfile.major}
            </p>
          </div>
          <form onSubmit={handleCompetencyUpdate} className="auth-form-container form-box">
            <h3>나의 역량 수정</h3>
            <div className="input-group">
              <label htmlFor="competencies">나의 역량</label>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                {getPlaceholderText()}
              </p>
              <input
                id="competencies"
                value={competencies}
                onChange={(e) => setCompetencies(e.target.value)}
                className="input"
              />
            </div>
            <button type="submit" className="button button-primary" style={{ width: 'auto' }}>
              역량 정보 저장하기
            </button>
            {message && (
              <p style={{ marginTop: '1rem', fontWeight: 600, color: '#16a34a' }}>{message}</p>
            )}
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <form onSubmit={handleAddActivity} className="auth-form-container form-box">
            <h3>새 활동 추가하기</h3>
            <div className="input-group">
              <label>활동 종류</label>
              <select
                value={newActivityType}
                onChange={(e) => setNewActivityType(e.target.value as any)}
                className="input"
              >
                <option value="인턴">인턴</option>
                <option value="공모전">공모전</option>
                <option value="자격증">자격증</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div className="input-group">
              <label>활동 이름</label>
              <input
                value={newActivityTitle}
                onChange={(e) => setNewActivityTitle(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="input-group">
              <label>활동 기간</label>
              <input
                value={newActivityDate}
                onChange={(e) => setNewActivityDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="input-group">
              <label>간단한 설명</label>
              <textarea
                value={newActivityDesc}
                onChange={(e) => setNewActivityDesc(e.target.value)}
                className="input"
                style={{ minHeight: 80 }}
              />
            </div>
            <button type="submit" className="button button-primary" style={{ width: 'auto' }}>
              활동 기록 추가
            </button>
          </form>

          <h3 className="mypage-title" style={{ fontSize: '1.25rem' }}>
            완료한 활동 목록
          </h3>
          {myActivities.length > 0 ? (
            myActivities.map((act) => (
              <div key={act.id} className="activity-list-item">
                <span className="activity-type-badge">{act.type}</span>
                <h4 className="activity-title">{act.title}</h4>
                <p className="activity-date">{act.date}</p>
                <p className="activity-desc">{act.description}</p>
                <button onClick={() => handleDeleteActivity(act.id)} className="delete-button">
                  &times;
                </button>
              </div>
            ))
          ) : (
            <div className="info-box" style={{ textAlign: 'center' }}>
              <p>아직 기록된 활동이 없습니다. 새 활동을 추가해보세요!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'likes' && (
        <div>
          <h3 className="mypage-title" style={{ fontSize: '1.25rem' }}>
            내가 관심있는 활동
          </h3>
          {isLikeLoading ? (
            <div className="info-box" style={{ textAlign: 'center' }}>
              <p>관심 활동을 불러오는 중입니다...</p>
            </div>
          ) : likedActivities.length > 0 ? (
            <div className="activity-grid">
              {likedActivities.map((act) => (
                <ActivityCard
                  key={act.id}
                  activity={act}
                  // 🔽 여기만 변경
                  userCompetencies={competencies.split(',').map((s) => s.trim()).filter(Boolean)}
                  isLiked={(userProfile.likedActivityIds || []).includes(act.id)}
                  onToggleLike={onToggleLike}
                />
              ))}
            </div>
          ) : (
            <div className="info-box" style={{ textAlign: 'center' }}>
              <p>아직 관심 활동으로 표시한 내역이 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyPage;
