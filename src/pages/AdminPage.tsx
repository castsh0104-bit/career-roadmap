// src/pages/AdminPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import RoadmapEditor from '../components/RoadmapEditor';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import type { Activity } from '../types';

interface AdminPageProps {
  onBack: () => void;
}

/**
 * AdminPage
 * - activities 컬렉션 CRUD
 * - 검색(클라) + 카테고리 필터(서버)
 * - 정렬: createdAt desc 고정
 * - 인덱스: category == + createdAt desc (최초 1회 생성 필요)
 */

// 폼 기본값
const DEFAULT_FORM = {
  title: '',
  companyName: '',
  content: '',
  employmentType: '',
  location: '',
  category: '채용',
  targetMajors: '',
  requiredCompetencies: '',
  applicationDeadline: '',
  applyUrl: '',
};

// ✅ 카테고리 → 배지 색상 클래스 매핑
const categoryClass = (c?: string) => {
  switch (c) {
    case '채용':   return 'badge-hire';
    case '인턴':   return 'badge-intern';
    case '공모전': return 'badge-contest';
    case '자격증': return 'badge-cert';
    default:       return '';
  }
};

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  // 목록/검색/필터 상태
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] =
    useState<'전체' | '채용' | '인턴' | '공모전' | '자격증'>('전체');

  // 인덱스 에러 메시지
  const [indexError, setIndexError] = useState<string | null>(null);

  const MAX_FETCH = 200;

  // 서버 로드
  const fetchActivities = async () => {
    setIsLoading(true);
    setIndexError(null);
    try {
      const colRef = collection(db, 'activities');
      const clauses: any[] = [];
      if (categoryFilter !== '전체') {
        clauses.push(where('category', '==', categoryFilter));
      }
      clauses.push(orderBy('createdAt', 'desc'));
      clauses.push(limit(MAX_FETCH));

      const snap = await getDocs(query(colRef, ...clauses));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
      setActivities(rows);
    } catch (e: any) {
      console.error(e);
      setActivities([]);
      if (e?.code === 'failed-precondition') {
        setIndexError('이 쿼리는 Firestore 복합 인덱스가 필요합니다. 콘솔 에러의 링크로 이동해 한 번 생성해 주세요.');
      } else {
        setIndexError('목록을 불러오는 중 문제가 발생했습니다. 콘솔 로그를 확인하세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  // 현재 결과에서만 클라 검색
  const displayedActivities = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return activities;
    return activities.filter((a) => {
      const title = (a.title || '').toLowerCase();
      const company = (a.companyName || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const comps = (a.requiredCompetencies || []).join(',').toLowerCase();
      return (
        title.includes(s) ||
        company.includes(s) ||
        content.includes(s) ||
        comps.includes(s)
      );
    });
  }, [search, activities]);

  // CRUD 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  // Timestamp → yyyy-mm-dd
  const toDateInputValue = (ts: Timestamp) => {
    const d = ts.toDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('제목은 필수입니다.');
      return;
    }
    if (!formData.applicationDeadline) {
      alert('마감일을 입력하세요.');
      return;
    }

    const targetMajors = formData.targetMajors
      ? formData.targetMajors.split(',').map((v) => v.trim()).filter(Boolean)
      : [];
    const requiredCompetencies = formData.requiredCompetencies
      ? formData.requiredCompetencies.split(',').map((v) => v.trim()).filter(Boolean)
      : [];

    const baseData = {
      title: formData.title,
      companyName: formData.companyName,
      content: formData.content,
      employmentType: formData.employmentType,
      location: formData.location,
      category: formData.category as Activity['category'],
      targetMajors,
      requiredCompetencies,
      applicationDeadline: Timestamp.fromDate(
        new Date(`${formData.applicationDeadline}T00:00:00`)
      ),
      applyUrl: formData.applyUrl || '',
    };

    if (editingId) {
      await updateDoc(doc(db, 'activities', editingId), {
        ...baseData,
        updatedAt: serverTimestamp(),
      });
      alert('활동이 수정되었습니다.');
    } else {
      await addDoc(collection(db, 'activities'), {
        ...baseData,
        createdAt: Timestamp.now(),
      });
      alert('새 활동이 등록되었습니다.');
    }

    setFormData(DEFAULT_FORM);
    setEditingId(null);
    fetchActivities();
  };

  const handleEditClick = (activity: Activity) => {
    setEditingId(activity.id);
    setFormData({
      title: activity.title,
      companyName: activity.companyName,
      content: activity.content,
      employmentType: activity.employmentType,
      location: activity.location,
      category: activity.category,
      targetMajors: (activity.targetMajors || []).join(', '),
      requiredCompetencies: (activity.requiredCompetencies || []).join(', '),
      applicationDeadline: activity.applicationDeadline
        ? toDateInputValue(activity.applicationDeadline)
        : '',
      applyUrl: activity.applyUrl || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'activities', id));
    if (editingId === id) {
      setEditingId(null);
      setFormData(DEFAULT_FORM);
    }
    fetchActivities();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM);
  };

  // ── 렌더
  return (
    <div className="admin-container">
      <div className="mypage-header">
        <h2 className="mypage-title">활동 관리</h2>
        <button onClick={onBack} type="button" className="button button-secondary">
          대시보드로 돌아가기
        </button>
      </div>

      {/* 컨트롤 바 + 개수 */}
      <div
        className="info-box"
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        <input
          className="input"
          placeholder="제목/회사/내용/역량 검색(현재 결과)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 260, flex: '1 1 260px' }}
        />
        <select
          className="input"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as '전체' | '채용' | '인턴' | '공모전' | '자격증')
          }
          style={{ width: 160 }}
        >
          <option value="전체">전체</option>
          <option value="채용">채용</option>
          <option value="인턴">인턴</option>
          <option value="공모전">공모전</option>
          <option value="자격증">자격증</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#6b7280' }}>
          {isLoading ? '불러오는 중…' : `총 ${displayedActivities.length}건`}
        </span>
      </div>

      {/* 인덱스 안내 */}
      {indexError && (
        <div className="info-box" style={{ borderColor: '#fca5a5', background: '#fff1f2', marginBottom: '1rem' }}>
          <strong style={{ color: '#b91c1c' }}>인덱스 필요</strong>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            {indexError}
            <br />
            콘솔 에러의 링크로 이동해 “Create index”를 눌러 생성하세요. 생성 후 1~2분 내로 정상 조회됩니다.
          </p>
        </div>
      )}

      <h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>현재 등록된 활동</h3>

      {/* 목록 그리드 */}
      <div className="admin-grid" style={{ marginBottom: '2rem' }}>
        {displayedActivities.length > 0 ? (
          displayedActivities.map((act) => (
            <div key={act.id} className="activity-card">
              {/* ✅ 카테고리 배지(색상) */}
              <span className={`activity-type-badge ${categoryClass(act.category)}`}>
                {act.category}
              </span>

              <h4 className="activity-title" style={{ marginTop: 8 }}>{act.title}</h4>
              <p>{act.content}</p>

              {/* (보조) 고용형태 표기 */}
              {act.employmentType && (
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 6 }}>
                  {act.employmentType}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => handleEditClick(act)} className="button button-secondary">
                  수정
                </button>
                <button onClick={() => handleDelete(act.id)} className="button button-danger">
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="info-box" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            {isLoading ? <p>불러오는 중...</p> : <p>조건에 맞는 활동이 없습니다.</p>}
          </div>
        )}
      </div>

      {/* 폼 */}
      <div className="form-box" style={{ marginBottom: '2rem' }}>
        <h3>{editingId ? '활동 수정' : '새 활동 등록'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>제목</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input"
              placeholder="예: 네이버 인턴십"
              required
            />
          </div>

          <div className="input-group">
            <label>회사명</label>
            <input
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="input"
              placeholder="예: 네이버"
            />
          </div>

          <div className="input-group">
            <label>내용</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              className="input"
              placeholder="채용/인턴 설명을 입력하세요"
            />
          </div>

          <div className="input-group">
            <label>고용 형태</label>
            <input
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              className="input"
              placeholder="예: 신입, 인턴, 계약직..."
            />
          </div>

          <div className="input-group">
            <label>근무지</label>
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="input"
              placeholder="예: 서울시 강남구"
            />
          </div>

          <div className="input-group">
            <label>카테고리</label>
            <select name="category" value={formData.category} onChange={handleChange} className="input">
              <option value="채용">채용</option>
              <option value="인턴">인턴</option>
              <option value="공모전">공모전</option>
              <option value="자격증">자격증</option>
            </select>
          </div>

          <div className="input-group">
            <label>대상 전공 (쉼표로 구분)</label>
            <input
              name="targetMajors"
              value={formData.targetMajors}
              onChange={handleChange}
              className="input"
              placeholder="예: 컴퓨터공학/소프트웨어, 전자전기공학"
            />
          </div>

          <div className="input-group">
            <label>요구 역량 (쉼표로 구분)</label>
            <input
              name="requiredCompetencies"
              value={formData.requiredCompetencies}
              onChange={handleChange}
              className="input"
              placeholder="예: java, spring"
            />
          </div>

          <div className="input-group">
            <label>마감일</label>
            <input
              type="date"
              name="applicationDeadline"
              value={formData.applicationDeadline}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="input-group">
            <label>지원하기 URL (선택)</label>
            <input
              name="applyUrl"
              value={formData.applyUrl}
              onChange={handleChange}
              className="input"
              placeholder="https:// 로 시작"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="button button-primary" style={{ width: 'auto' }}>
              {editingId ? '수정하기' : '등록하기'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="button button-secondary">
                수정 취소
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 로드맵 편집 */}
      <RoadmapEditor />
    </div>
  );
};

export default AdminPage;
