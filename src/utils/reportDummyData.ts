import type { MoodType } from '../constants/moods';

export type MoodDistribution = {
  type: MoodType;
  count: number;          // 그 감정의 일기 수
  percent: number;        // 0~100
};

export type ReportData = {
  startDate: string;       // 'YYYY-MM-DD'
  endDate: string;
  totalEntries: number;
  activityScore: number;   // 0~100
  mostFrequentMood: MoodType;
  moodDistribution: MoodDistribution[];
  aiSummary: string;
};

/**
 * 임시 더미 데이터 생성
 * TODO: 백엔드 연동 후 — GET /reports/weekly, /reports/monthly로 교체
 */
export const getDummyWeeklyReport = (): ReportData => {
  return {
    startDate: '2026-04-22',
    endDate: '2026-04-28',
    totalEntries: 6,
    activityScore: 78,
    mostFrequentMood: 'CALM',
    moodDistribution: [
      { type: 'GREAT', count: 1, percent: 17 },
      { type: 'CALM', count: 3, percent: 50 },
      { type: 'UNKNOWN', count: 0, percent: 0 },
      { type: 'SAD', count: 1, percent: 17 },
      { type: 'ANGRY', count: 0, percent: 0 },
      { type: 'PAIN', count: 1, percent: 17 },
    ],
    aiSummary:
      '지난 한 주는 평온한 날들이 많았어요. 동네 산책과 가족과의 통화가 마음을 편안하게 해 주었네요. 하루는 몸이 안 좋으셨다고 하셨는데, 무리하지 않으신 게 좋았어요.',
  };
};

export const getDummyMonthlyReport = (): ReportData => {
  return {
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    totalEntries: 22,
    activityScore: 72,
    mostFrequentMood: 'CALM',
    moodDistribution: [
      { type: 'GREAT', count: 5, percent: 23 },
      { type: 'CALM', count: 9, percent: 41 },
      { type: 'UNKNOWN', count: 2, percent: 9 },
      { type: 'SAD', count: 3, percent: 14 },
      { type: 'ANGRY', count: 1, percent: 5 },
      { type: 'PAIN', count: 2, percent: 9 },
    ],
    aiSummary:
      '4월 한 달은 전반적으로 평온한 흐름이었어요. 봄 날씨와 함께 산책하시는 날이 많아 활동 점수도 좋네요. 가끔 컨디션이 안 좋은 날이 있었지만, 잘 회복하셨어요.',
  };
};