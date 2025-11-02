import React from 'react';
import type { ActivityWithMatchRate } from '../types';
import { Timestamp } from 'firebase/firestore';

const BuildingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ height: '1rem', width: '1rem', marginRight: '0.375rem', color: '#6b7280' }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const LocationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ height: '1rem', width: '1rem', marginRight: '0.375rem', color: '#6b7280' }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LikeIcon = ({ isLiked }: { isLiked: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style={{ height: '1.5rem', width: '1.5rem' }}
    viewBox="0 0 20 20"
    fill={isLiked ? '#ef4444' : 'currentColor'}
    stroke={isLiked ? '#ef4444' : 'currentColor'}
    strokeWidth={isLiked ? 0 : 1.5}
  >
    <path
      fillRule="evenodd"
      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
      clipRule="evenodd"
    />
  </svg>
);

// ── util
const convertFirestoreTimestampToDate = (timestamp: Timestamp): Date => {
  if (!timestamp || typeof (timestamp as any).toDate !== 'function') return new Date();
  return timestamp.toDate();
};

const calculateDday = (deadline: Timestamp) => {
  const today = new Date();
  const deadlineDate = convertFirestoreTimestampToDate(deadline);
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>마감</span>;
  if (diffDays === 0) return <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>D-Day</span>;
  return <span style={{ color: '#22c55e', fontWeight: 'bold' }}>D-{diffDays}</span>;
};

// ✅ 카테고리 → 색상 클래스 매핑
const categoryClass = (c?: string) => {
  switch (c) {
    case '채용':   return 'badge-hire';
    case '인턴':   return 'badge-intern';
    case '공모전': return 'badge-contest';
    case '자격증': return 'badge-cert';
    default:       return '';
  }
};

interface ActivityCardProps {
  activity: ActivityWithMatchRate;
  userCompetencies: string[];
  isLiked: boolean;
  onToggleLike: (id: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, userCompetencies, isLiked, onToggleLike }) => {
  const deadlineDate = convertFirestoreTimestampToDate(activity.applicationDeadline);
  const formattedDeadline = `${deadlineDate.getFullYear()}.${String(deadlineDate.getMonth() + 1).padStart(2, '0')}.${String(
    deadlineDate.getDate(),
  ).padStart(2, '0')}`;
  const lowerUserCompetencies = (userCompetencies || []).map((s) => s.toLowerCase());
  const { matchRate } = activity;

  return (
    <div className="activity-card" style={{ position: 'relative' }}>
      {/* 좋아요 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLike(activity.id);
        }}
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#9ca3af',
        }}
      >
        <LikeIcon isLiked={isLiked} />
      </button>

      {/* 상단 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
            <BuildingIcon />
            <span>{activity.companyName || '회사정보 없음'}</span>
          </div>

          {/* ✅ 카테고리 배지(색상 적용) */}
          <span className={`activity-type-badge ${categoryClass(activity.category)}`}>
            {activity.category || '카테고리'}
          </span>

          {/* (보조) 고용형태 텍스트 */}
          {activity.employmentType && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 6 }}>
              {activity.employmentType}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right', paddingRight: '2rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.125rem' }}>{calculateDday(activity.applicationDeadline)}</div>
          <p className="activity-date">~{formattedDeadline}</p>
        </div>
      </div>

      <h3 className="activity-title">{activity.title}</h3>
      <p className="activity-content">{activity.content}</p>

      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        <LocationIcon />
        <span>{activity.location || '근무지 정보 없음'}</span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>요구 역량:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(activity.requiredCompetencies || []).map((competency) => (
            <span
              key={competency}
              className={lowerUserCompetencies.includes(competency.toLowerCase()) ? 'skill-tag skill-tag-match' : 'skill-tag'}
            >
              {competency}
            </span>
          )) || '요구 역량 정보 없음'}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <p style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>나의 역량 매칭률: {matchRate}%</p>
        <div className="match-rate-bar-bg" style={{ marginTop: '0.5rem' }}>
          <div
            className="match-rate-bar"
            style={{
              width: `${matchRate}%`,
              backgroundColor: matchRate > 70 ? '#22c55e' : matchRate > 40 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* 지원하기 */}
      {activity.applyUrl && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <a
            href={activity.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-apply"
            onClick={(e) => e.stopPropagation()}
          >
            지원하기
          </a>
        </div>
      )}
    </div>
  );
};

export default ActivityCard;
