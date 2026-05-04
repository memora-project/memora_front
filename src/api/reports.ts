import { apiClient, extractApiErrorMessage } from './client';
import type { MoodType } from '../constants/moods';

/**
 * 백엔드 ReportResponse — GET /reports/weekly, /reports/monthly 응답.
 * moodDistribution은 MoodType.name() → count 매핑. 일기가 0개인 기분도 0으로 포함.
 * mostFrequentMood는 작성된 (마무리) 일기가 0건이면 null.
 */
export interface ReportResponse {
  reportId: number;
  /** 'YYYY-MM-DD' */
  startDate: string;
  /** 'YYYY-MM-DD' */
  endDate: string;
  mostFrequentMood: MoodType | null;
  activityScore: number;
  aiAnalysisSummary: string | null;
  isShared: boolean;
  moodDistribution: Record<string, number>;
  totalDiaries: number;
  /** ISO-8601 OffsetDateTime */
  createdAt: string;
}

export const getWeeklyReport = async (): Promise<ReportResponse> => {
  try {
    const { data } = await apiClient.get<ReportResponse>('/reports/weekly');
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '주간 리포트를 불러오지 못했습니다.'));
  }
};

export const getMonthlyReport = async (): Promise<ReportResponse> => {
  try {
    const { data } = await apiClient.get<ReportResponse>('/reports/monthly');
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '월간 리포트를 불러오지 못했습니다.'));
  }
};
