// src/pages/AdminPage.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import type { Activity } from '../types';

interface AdminPageProps {
  onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  // 👉 이게 “지금 수정 중인 활동 id” (null이면 신규 등록 모드)
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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
  });

  // 리스트 불러오기
  const fetchActivities = async () => {
    const snap = await getDocs(collection(db, 'activities'));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Activity[];
    setActivities(data);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // 공통 입력 핸들러
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 날짜(Timestamp) → input[type=date] 에 넣을 문자열로
  const toDateInputValue = (ts: Timestamp) => {
    const d = ts.toDate();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 등록/수정 공통 submit
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

    // 문자열 → 배열
    const targetMajors = formData.targetMajors
      ? formData.targetMajors
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    const requiredCompetencies = formData.requiredCompetencies
      ? formData.requiredCompetencies
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    // 공통 필드
    const baseData = {
      title: formData.title,
      companyName: formData.companyName,
      content: formData.content,
      employmentType: formData.employmentType,
      location: formData.location,
      category: formData.category as Activity['category'],
      targetMajors,
      requiredCompetencies,
      applicationDeadline: Timestamp.fromDate(new Date(formData.applicationDeadline)),
      applyUrl: formData.applyUrl || '',
    };

    // ✅ 수정 모드
    if (editingId) {
      await updateDoc(doc(db, 'activities', editingId), {
        ...baseData,
        // createdAt 은 원래 거 유지하고 싶으면 안 넣는다
      });
      alert('활동이 수정되었습니다.');
    } else {
      // ✅ 신규 등록 모드
      await addDoc(collection(db, 'activities'), {
        ...baseData,
        createdAt: Timestamp.now(),
      });
      alert('새 활동이 등록되었습니다.');
    }

    // 폼 초기화 + 수정모드 해제
    setFormData({
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
    });
    setEditingId(null);

    // 리스트 다시
    fetchActivities();
  };

  // 🔵 카드에서 “수정” 눌렀을 때: 폼에 값 채워넣기
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
    // 이제 위 폼이 이 활동 데이터로 바뀐다
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    await deleteDoc(doc(db, 'activities', id));
    // 혹시 이걸 수정중이었으면 폼도 리셋
    if (editingId === id) {
      setEditingId(null);
      setFormData({
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
      });
    }
    fetchActivities();
  };

  // 수정 취소 버튼용
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
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
    });
  };

  return (
    <div className="admin-container">
      <div className="mypage-header">
        <h2 className="mypage-title">활동 관리 (Admin)</h2>
        <button onClick={onBack} type="button" className="button button-secondary">
          대시보드로 돌아가기
        </button>
      </div>

      {/* 폼 박스 */}
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
<h3 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>현재 등록된 활동</h3>
<div className="activity-grid">
  {activities.length > 0 ? (
    activities.map((act) => (
      <div key={act.id} className="activity-card">
        <span className="activity-type-badge">{act.category}</span>
        <h4 className="activity-title">{act.title}</h4>
        <p>{act.content}</p>
        {/* 마감일은 관리자 화면에서는 숨김 */}
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
      <p>등록된 활동이 없습니다.</p>
    </div>
  )}
</div>
 </div>
  );
};

export default AdminPage;
