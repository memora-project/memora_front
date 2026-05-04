import { apiClient, extractApiErrorMessage } from './client';
import type { MoodType } from '../constants/moods';

/**
 * Diary는 "하루 단위 컨테이너". 그 안에 N개의 segment(중간 기록)가 들어간다.
 *
 * 흐름:
 *   - 작성 시작:  POST /diaries           → 오늘의 빈 일기 확보(이미 있으면 그 ID 반환)
 *   - 월별 조회:  GET  /diaries?month=    → 캘린더 점/리스트
 *   - 상세:       GET  /diaries/{id}      → final 일기 본문 + 메타
 *   - 최종 편집:  PATCH /diaries/{id}     → finalMood / finalContent
 *   - 마무리 확정: POST /diaries/{id}/complete → status = COMPLETED
 *   - 삭제:       DELETE /diaries/{id}
 *
 * 표시 규칙: isEdited === true → finalContent를 본문으로, false → aiDraft 사용.
 */

export type DiaryStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface DiaryResponse {
  diaryId: number;
  /** 'YYYY-MM-DD' (백엔드 LocalDate). */
  targetDate: string;
  finalMood: MoodType | null;
  aiDraft: string | null;
  finalContent: string | null;
  isEdited: boolean;
  status: DiaryStatus;
  /** ISO 8601 (OffsetDateTime). */
  createdAt: string;
  /** ISO 8601 (OffsetDateTime). */
  updatedAt: string;
}

export interface DiaryUpdateRequest {
  finalMood?: MoodType;
  finalContent?: string;
}

/** 오늘의 일기를 생성하거나, 이미 있으면 그것을 반환한다. */
export const createTodayDiary = async (): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.post<DiaryResponse>('/diaries');
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '오늘 일기를 시작하지 못했습니다.'));
  }
};

/**
 * 한 달치 일기 목록.
 * @param month 'YYYY-MM'
 */
export const getDiariesByMonth = async (
  month: string,
): Promise<DiaryResponse[]> => {
  try {
    const { data } = await apiClient.get<DiaryResponse[]>('/diaries', {
      params: { month },
    });
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '월별 일기를 불러오지 못했습니다.'));
  }
};

export const getDiary = async (diaryId: number): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.get<DiaryResponse>(`/diaries/${diaryId}`);
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기를 불러오지 못했습니다.'));
  }
};

export const updateDiary = async (
  diaryId: number,
  body: DiaryUpdateRequest,
): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.patch<DiaryResponse>(
      `/diaries/${diaryId}`,
      body,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기를 수정하지 못했습니다.'));
  }
};

/** 마무리 일기 확정 — status를 COMPLETED로 전환. */
export const completeDiary = async (
  diaryId: number,
): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.post<DiaryResponse>(
      `/diaries/${diaryId}/complete`,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '마무리 처리에 실패했습니다.'));
  }
};

export const deleteDiary = async (diaryId: number): Promise<void> => {
  try {
    await apiClient.delete(`/diaries/${diaryId}`);
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기를 삭제하지 못했습니다.'));
  }
};

/**
 * 마무리(final) 일기만 삭제 — 그날의 segments는 유지.
 * status=IN_PROGRESS로 되돌리고 finalMood/finalContent/aiDraft를 모두 null로 reset.
 */
export const deleteFinalDiary = async (
  diaryId: number,
): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.delete<DiaryResponse>(
      `/diaries/${diaryId}/final`,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '마무리 일기를 삭제하지 못했습니다.'));
  }
};

/**
 * 마무리(final) 일기에 대한 AI 종합 초안 생성/재생성.
 * 응답으로 aiDraft가 채워진 DiaryResponse가 온다.
 * 백엔드가 user 정보를 읽어 시스템 프롬프트에 호칭/나이대를 자동 주입.
 */
export const generateFinalAiDraft = async (
  diaryId: number,
): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.post<DiaryResponse>(
      `/diaries/${diaryId}/ai-draft`,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, 'AI 초안을 만들지 못했습니다.'));
  }
};
