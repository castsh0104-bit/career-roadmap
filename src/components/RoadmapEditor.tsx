// src/components/RoadmapEditor.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { RoadmapStep } from '../types';

const MAJORS = ['컴퓨터공학/소프트웨어', '기계공학', '전자전기공학', '화학공학'] as const;
type Major = (typeof MAJORS)[number];

const mapMajorToDocId = (m: string) => m.replace('/', ',');

const emptyStep: RoadmapStep = {
  grade: 1,
  title: '',
  description: '',
  recommendations: [],
  recommendedCompetencies: [],
};

const RoadmapEditor: React.FC = () => {
  const [major, setMajor] = useState<Major>('컴퓨터공학/소프트웨어');
  const [steps, setSteps] = useState<RoadmapStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<RoadmapStep>(emptyStep);
  const [searchGrade, setSearchGrade] = useState<number | ''>('');

  // 로드맵 불러오기
  const fetchRoadmap = async (m: string) => {
    setIsLoading(true);
    try {
      const id = mapMajorToDocId(m);
      const ref = doc(db, 'roadmaps', id);
      const snap = await getDoc(ref);
      const s = snap.exists() ? ((snap.data().steps || []) as RoadmapStep[]) : [];
      setSteps(s);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap(major);
  }, [major]);

  const filtered = useMemo(
    () => (searchGrade ? steps.filter((s) => s.grade === Number(searchGrade)) : steps),
    [steps, searchGrade],
  );

  // 폼 핸들러
  const updateFormField = (k: keyof RoadmapStep, v: any) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const parseLines = (raw: string) =>
    raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  // 편집 시작
  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    setForm({ ...steps[idx] });
  };

  // 폼 리셋
  const resetForm = () => {
    setEditingIndex(null);
    setForm(emptyStep);
  };

  // 저장(추가/수정)
  const saveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('제목은 필수입니다.');
      return;
    }
    const payload: RoadmapStep = {
      grade: Number(form.grade),
      title: form.title.trim(),
      description: form.description.trim(),
      recommendations: Array.isArray(form.recommendations)
        ? form.recommendations
        : parseLines(String(form.recommendations || '')),
      recommendedCompetencies: Array.isArray(form.recommendedCompetencies)
        ? form.recommendedCompetencies
        : parseLines(String(form.recommendedCompetencies || '')),
    };

    const next = [...steps];
    if (editingIndex !== null) next[editingIndex] = payload;
    else next.push(payload);

    // grade 오름차순
    next.sort((a, b) => a.grade - b.grade);

    const id = mapMajorToDocId(major);
    await setDoc(doc(db, 'roadmaps', id), { steps: next }, { merge: true });
    setSteps(next);
    resetForm();
  };

  const deleteStep = async (idx: number) => {
    if (!confirm('정말 삭제할까요?')) return;
    const next = steps.filter((_, i) => i !== idx);
    const id = mapMajorToDocId(major);
    await setDoc(doc(db, 'roadmaps', id), { steps: next }, { merge: true });
    setSteps(next);
    if (editingIndex === idx) resetForm();
  };

  return (
    <div className="info-box" style={{ marginTop: '2rem' }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>로드맵 관리</h3>

      {/* 상단 컨트롤바 */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select
          className="input"
          value={major}
          onChange={(e) => setMajor(e.target.value as Major)}
          style={{ width: 240 }}
        >
          {MAJORS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={String(searchGrade)}
          onChange={(e) => setSearchGrade(e.target.value ? Number(e.target.value) : '')}
          style={{ width: 140 }}
        >
          <option value="">전체 학년</option>
          <option value="1">1학년</option>
          <option value="2">2학년</option>
          <option value="3">3학년</option>
          <option value="4">4학년</option>
          <option value="5">졸업생</option>
        </select>

        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '0.875rem' }}>
          {isLoading ? '불러오는 중…' : `총 ${filtered.length}개`}
        </span>
      </div>

      {/* 목록 */}
      <div className="admin-grid" style={{ marginBottom: '1.5rem' }}>
        {filtered.length ? (
          filtered.map((s, i) => (
            <div key={i} className="activity-card">
              <span className="activity-type-badge">
  {s.grade === 5 ? '졸업생' : `${s.grade}학년`}
</span>
              <h4 className="activity-title">{s.title}</h4>
              <p className="activity-content">{s.description}</p>

              <h5 style={{ marginTop: '0.5rem' }}>추천 활동</h5>
              <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                {(s.recommendations || []).map((r, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {r}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '0.75rem' }}>
                <h5>추천 역량</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {(s.recommendedCompetencies || []).map((c) => (
                    <span key={c} className="skill-tag">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="button button-secondary" onClick={() => startEdit(steps.indexOf(s))}>
                  수정
                </button>
                <button className="button button-danger" onClick={() => deleteStep(steps.indexOf(s))}>
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="info-box" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            {isLoading ? '불러오는 중…' : '로드맵 항목이 없습니다.'}
          </div>
        )}
      </div>

      {/* 폼 */}
      <form onSubmit={saveStep} className="form-box" style={{ margin: 0 }}>
        <h4 style={{ marginTop: 0 }}>{editingIndex !== null ? '로드맵 수정' : '로드맵 추가'}</h4>

        <div className="input-group">
          <label>학년</label>
          <select
            className="input"
            value={form.grade}
            onChange={(e) => updateFormField('grade', Number(e.target.value))}
            required
          >
            <option value={1}>1학년</option>
            <option value={2}>2학년</option>
            <option value={3}>3학년</option>
            <option value={4}>4학년</option>
            <option value={5}>졸업생</option>
          </select>
        </div>

        <div className="input-group">
          <label>제목</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => updateFormField('title', e.target.value)}
            placeholder="예: 프로그래밍 기초 다지기"
            required
          />
        </div>

        <div className="input-group">
          <label>설명</label>
          <textarea
            className="input"
            value={form.description}
            onChange={(e) => updateFormField('description', e.target.value)}
            placeholder="해당 학년 로드맵에 대한 간단한 설명"
          />
        </div>

        <div className="input-group">
          <label>추천 활동 (줄바꿈으로 구분)</label>
          <textarea
            className="input"
            value={Array.isArray(form.recommendations) ? form.recommendations.join('\n') : (form.recommendations as any)}
            onChange={(e) => updateFormField('recommendations', e.target.value)}
            placeholder={'예:\nC언어/Python 프로그래밍 수업 수강\n동아리 활동'}
            style={{ minHeight: 100 }}
          />
        </div>

        <div className="input-group">
          <label>추천 역량 (줄바꿈으로 구분)</label>
          <textarea
            className="input"
            value={
              Array.isArray(form.recommendedCompetencies)
                ? form.recommendedCompetencies.join('\n')
                : (form.recommendedCompetencies as any)
            }
            onChange={(e) => updateFormField('recommendedCompetencies', e.target.value)}
            placeholder={'예:\npython\nc'}
            style={{ minHeight: 100 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="button button-primary" style={{ width: 'auto' }}>
            {editingIndex !== null ? '수정하기' : '추가하기'}
          </button>
          {editingIndex !== null && (
            <button type="button" className="button button-secondary" onClick={resetForm}>
              수정 취소
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RoadmapEditor;
