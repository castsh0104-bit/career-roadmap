// src/types.ts

import { Timestamp } from 'firebase/firestore';

export interface MyActivity {
  id: string;
  type: '인턴' | '공모전' | '자격증' | '기타';
  title: string;
  date: string;
  description: string;
}

export interface UserProfile {
  name: string;
  email: string;
  competencies: string[];
  grade?: number;
  major?: string;
  completedActivities?: MyActivity[];
  likedActivityIds?: string[];
  role?: string; // "admin" 같은 거
}

export type ActivityCategory = '채용' | '인턴' | '공모전' | '자격증';

export interface Activity {
  id: string;
  title: string;
  content: string;
  requiredCompetencies: string[];
  companyName: string;
  employmentType: string;
  location: string;
  applicationDeadline: Timestamp;
  createdAt: Timestamp;
  targetMajors: string[];
  category: ActivityCategory;
  applyUrl?: string; // optional
}

export interface ActivityWithMatchRate extends Activity {
  matchRate: number;
}

export interface RoadmapStep {
  grade: number;
  title: string;
  description: string;
  recommendations: string[];
  recommendedCompetencies: string[];
}

// 자기소개서 문서 타입
export interface Essay {
  id: string;
  title: string;
  body: string;      // plain text or markdown
  updatedAt: number; // epoch(ms) - 정렬/표시용
}

