// src/pages/DashboardPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { Activity, ActivityCategory, ActivityWithMatchRate, UserProfile, RoadmapStep } from '../types';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import ActivityCard from '../components/ActivityCard';

interface DashboardPageProps {
  userProfile: UserProfile;
  uid: string;
  onToggleLike: (id: string) => void;
  onGoMyPage: () => void;
  onGoAdmin?: () => void; // admin일 때만 뜨게
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  userProfile,
  uid,
  onToggleLike,
  onGoMyPage,
  onGoAdmin,
}) => {
  const [activities, setActivities] = useState<ActivityWithMatchRate[]>([]);
  const [activeCategory, setActiveCategory] = useState<'전체' | ActivityCategory>('전체');
  const [sortOrder, setSortOrder] = useState<'default' | 'matchRateDesc'>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [roadmapStep, setRoadmapStep] = useState<RoadmapStep | null>(null);

  // 🔹 매칭률 계산 함수
  const getMatchRate = (activity: Activity, userCompetencies: string[]): number => {
    if (!userCompetencies?.length || !activity.requiredCompetencies?.length) return 0;
    const lowerUser = userCompetencies.map((s) => s.toLowerCase());
    const lowerReq = activity.requiredCompetencies.map((s) => s.toLowerCase());
    const matchCount = lowerReq.filter((c) => lowerUser.includes(c)).length;
    return Math.round((matchCount / lowerReq.length) * 100);
  };

  // 🔹 로드맵 불러오기
  useEffect(() => {
    const fetchRoadmap = async () => {
      if (!userProfile.major || !userProfile.grade) return;
      const roadmapId = userProfile.major.replace('/', ',');
      const ref = doc(db, 'roadmaps', roadmapId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as { steps: RoadmapStep[] };
        const current = (data.steps || []).find((s) => s.grade === userProfile.grade) || null;
        setRoadmapStep(current);
      } else {
        setRoadmapStep(null);
      }
    };
    fetchRoadmap();
  }, [userProfile.major, userProfile.grade]);

  // 🔹 활동 불러오기 (전공 + 카테고리 기준)
  useEffect(() => {
    const fetchActs = async () => {
      if (!userProfile.major) return;
      const actsRef = collection(db, 'activities');
      let q;
      if (activeCategory === '전체') {
        q = query(actsRef, where('targetMajors', 'array-contains', userProfile.major));
      } else {
        q = query(
          actsRef,
          where('targetMajors', 'array-contains', userProfile.major),
          where('category', '==', activeCategory),
        );
      }
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
      const withRate = list.map((a) => ({
        ...a,
        matchRate: getMatchRate(a, userProfile.competencies || []),
      }));
      setActivities(withRate);
    };
    fetchActs();
  }, [userProfile.major, activeCategory]); // ← 여기까지는 네 거랑 같음

  // 🔹 ❗역량이 바뀌었을 때만 매칭률 다시 계산 (DB 다시 안 불러옴)
  useEffect(() => {
    setActivities((prev) =>
      prev.map((a) => ({
        ...a,
        matchRate: getMatchRate(a, userProfile.competencies || []),
      })),
    );
  }, [userProfile.competencies]); // ← 이 부분이 추가된 부분

  // 🔹 화면에 보여줄 활동 계산 (검색 + 정렬)
  const displayedActivities = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim();
    const filtered = activities.filter((a) => {
      if (!lower) return true;
      const title = a.title.toLowerCase().includes(lower);
      const company = a.companyName.toLowerCase().includes(lower);
      const comp = (a.requiredCompetencies || []).some((c) => c.toLowerCase().includes(lower));
      return title || company || comp;
    });
    if (sortOrder === 'matchRateDesc') {
      return [...filtered].sort((a, b) => b.matchRate - a.matchRate);
    }
    return filtered;
  }, [activities, sortOrder, searchTerm]);

  const categories: ('전체' | ActivityCategory)[] = ['전체', '채용', '인턴', '공모전', '자격증'];

  return (
    <div>
      {/* 로드맵 영역 */}
      {roadmapStep ? (
        <div className="info-box" style={{ marginBottom: '2rem' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              borderBottom: '2px solid #2563eb',
              paddingBottom: '1rem',
              marginBottom: '1rem',
              marginTop: 0,
            }}
          >
            {userProfile.name}님을 위한 {roadmapStep.grade}학년 맞춤 로드맵
          </h2>
          <h3 className="activity-title">{roadmapStep.title}</h3>
          <p className="activity-content">{roadmapStep.description}</p>
          <h4 style={{ fontWeight: 'bold', marginTop: '1.5rem' }}>추천 활동:</h4>
          <ul style={{ paddingLeft: 20, listStyle: 'disc' }}>
            {(roadmapStep.recommendations || []).map((r, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                {r}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontWeight: 'bold' }}>추천 역량:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {(roadmapStep.recommendedCompetencies || []).map((c) => (
                <span key={c} className="skill-tag">
                  {c}
                </span>
              ))}
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
              이 역량들을 '프로필 수정'에 추가하고 관련 활동들을 찾아보세요!
            </p>
          </div>
        </div>
      ) : (
        <div className="info-box" style={{ marginBottom: '2rem' }}>
          <p>
            아직 {userProfile.major} 전공의 {userProfile.grade}학년 로드맵이 없습니다.
          </p>
        </div>
      )}

      {/* 상단 버튼들 */}
      <div className="dashboard-header">
        <h2 className="mypage-title">맞춤 통합 활동</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onGoMyPage} className="button button-secondary">
            마이페이지
          </button>
          {onGoAdmin && (
            <button onClick={onGoAdmin} className="button button-secondary">
              관리자
            </button>
          )}
        </div>
      </div>

      {/* 필터 영역 */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* 카테고리 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`button ${activeCategory === c ? 'button-primary' : 'button-secondary'}`}
              style={{ width: 'auto', color: activeCategory === c ? 'white' : '#111827' }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 검색 + 정렬 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginLeft: 'auto', alignItems: 'center' }}>
          <input
            placeholder="제목, 회사, 역량으로 검색..."
            className="input"
            style={{ width: 'auto', minWidth: '250px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'default' | 'matchRateDesc')}
            className="input"
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="default">기본 정렬</option>
            <option value="matchRateDesc">매칭률 높은 순</option>
          </select>
        </div>
      </div>

      {/* 활동 목록 */}
      <p style={{ fontSize: '1.125rem', marginBottom: '2rem' }}>
        <span style={{ fontWeight: 'bold' }}>{userProfile.name}</span>님, 환영합니다! 회원님의 역량과 맞는 활동들을
        확인해보세요.
      </p>

      <div className="activity-grid">
        {displayedActivities.length > 0 ? (
          displayedActivities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              userCompetencies={userProfile.competencies}
              isLiked={(userProfile.likedActivityIds || []).includes(a.id)}
              onToggleLike={onToggleLike}
            />
          ))
        ) : (
          <div className="info-box" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            {searchTerm.trim() ? <p>'{searchTerm}'에 대한 검색 결과가 없습니다.</p> : <p>해당 카테고리의 활동이 없습니다.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
