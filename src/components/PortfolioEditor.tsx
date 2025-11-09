// src/components/PortfolioEditor.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

type Portfolio = {
  name: string;
  summary: string;       // 간단 소개
  skills: string;        // 쉼표로 구분된 문자열로 저장(간단)
  experience: string;    // 경력
  activities: string;    // 주요 활동
};

const DEFAULT: Portfolio = {
  name: '',
  summary: '',
  skills: '',
  experience: '',
  activities: '',
};

interface Props {
  uid: string;
  defaultName?: string;  // userProfile.name 로 기본값 채워주기용(선택)
  defaultEmail?: string; // 지금은 표시만, 저장 필드에는 포함 안 함
}

const PortfolioEditor: React.FC<Props> = ({ uid, defaultName }) => {
  // 단일 문서: users/{uid}/portfolio/profile
  const docRef = doc(db, 'users', uid, 'portfolio', 'profile');

  const [value, setValue] = useState<Portfolio>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 최초 로드
  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<Portfolio>;
          setValue({
            name: data.name ?? defaultName ?? '',
            summary: data.summary ?? '',
            skills: data.skills ?? '',
            experience: data.experience ?? '',
            activities: data.activities ?? '',
          });
        } else {
          // 문서가 없으면 기본값 + 이름만 채움
          setValue((v) => ({ ...v, name: defaultName ?? '' }));
        }
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const onChange =
    (key: keyof Portfolio) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(docRef, value, { merge: true });
      alert('포트폴리오가 저장되었습니다.');
    } catch (e) {
      console.error(e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('포트폴리오를 정말 삭제할까요?')) return;
    try {
      await deleteDoc(docRef);
      setValue({ ...DEFAULT, name: defaultName ?? '' });
      alert('삭제 완료');
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  };

  if (loading) {
    return <div className="info-box">포트폴리오 불러오는 중…</div>;
  }

  return (
    <div className="form-box">
      <h3>포트폴리오</h3>

      <div className="input-group">
        <label>성명</label>
        <input className="input" value={value.name} onChange={onChange('name')} placeholder="이름을 입력하세요" />
      </div>

      <div className="input-group">
        <label>간단 소개</label>
        <textarea className="input" value={value.summary} onChange={onChange('summary')} placeholder="간단한 자기소개" />
      </div>

      <div className="input-group">
        <label>보유 기술 및 자격증</label>
        <textarea
          className="input"
          value={value.skills}
          onChange={onChange('skills')}
          placeholder="예) Java, Spring, React, MySQL"
        />
        <p style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
          • 쉼표로 구분해 적어도 되고, 여러 줄로 적어도 됩니다.
        </p>
      </div>

      <div className="input-group">
        <label>경력</label>
        <textarea className="input" value={value.experience} onChange={onChange('experience')} placeholder="인턴/근무/동아리 등" />
      </div>

      <div className="input-group">
        <label>주요 활동</label>
        <textarea
          className="input"
          value={value.activities}
          onChange={onChange('activities')}
          placeholder="프로젝트/공모전 등 중요한 활동"
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="button button-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto' }}>
          {saving ? '저장 중…' : '저장'}
        </button>
        <button className="button button-danger" onClick={handleDelete} type="button" style={{ width: 'auto' }}>
          삭제
        </button>
      </div>
    </div>
  );
};

export default PortfolioEditor;
