// src/pages/OnboardingPage.tsx
import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '../types';

interface OnboardingPageProps {
  user: User;
  onComplete: (u: UserProfile) => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ user, onComplete }) => {
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!grade || !major) {
      alert('모든 항목을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      const updated: UserProfile = {
        // 문서가 있으면 기존 정보 유지
        ...(snap.exists() ? (snap.data() as UserProfile) : {}),
        name: snap.exists() ? (snap.data() as UserProfile).name : user.displayName || '이름 없음',
        email: snap.exists() ? (snap.data() as UserProfile).email : user.email || '',
        grade: parseInt(grade, 10),
        major,
        // 없을 때 기본값 깔아주기
        competencies: snap.exists() ? (snap.data() as UserProfile).competencies || [] : [],
        completedActivities: snap.exists() ? (snap.data() as UserProfile).completedActivities || [] : [],
        likedActivityIds: snap.exists() ? (snap.data() as UserProfile).likedActivityIds || [] : [],
        role: snap.exists() ? (snap.data() as UserProfile).role : 'user',
      };

      await setDoc(userRef, updated, { merge: true });
      onComplete(updated);
    } catch (err) {
      console.error('Onboarding error:', err);
      alert('정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
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
          <select
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="input"
            required
          >
            <option value="" disabled>
              학년을 선택하세요
            </option>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
            <option value="4">4학년</option>
            <option value="5">졸업생</option>
          </select>
        </div>
        <div className="input-group" style={{ textAlign: 'left' }}>
          <label htmlFor="major">전공 계열</label>
          <select
            id="major"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="input"
            required
          >
            <option value="" disabled>
              전공 계열을 선택하세요
            </option>
            <option value="컴퓨터공학/소프트웨어">컴퓨터공학/소프트웨어</option>
            <option value="기계공학">기계공학</option>
            <option value="전자전기공학">전자전기공학</option>
            <option value="화학공학">화학공학</option>
          </select>
        </div>
        <button type="submit" className="button button-primary" style={{ marginTop: '1rem' }} disabled={loading}>
          {loading ? '저장 중...' : '로드맵 추천 시작하기'}
        </button>
      </form>
    </div>
  );
};

export default OnboardingPage;
