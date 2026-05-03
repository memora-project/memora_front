import { apiClient, extractApiErrorMessage } from './client';

export type MoodType = 'GREAT' | 'CALM' | 'UNKNOWN' | 'SAD' | 'ANGRY' | 'PAIN';
export type DiaryStatus = 'IN_PROGRESS' | 'COMPLETED';

/**
 * 백엔드 DiaryResponse와 일치.
 * - aiDraft: AI가 생성한 final 일기 초안 (POST /diaries/{id}/ai-draft 호출 후 채워짐)
 * - finalContent: 사용자가 최종 확정한 일기 본문
 * - status: IN_PROGRESS → 작성 중, COMPLETED → 완료 처리됨
 */
export interface DiaryResponse {
  diaryId: number;
  targetDate: string; // 'YYYY-MM-DD'
  finalMood: MoodType | null;
  aiDraft: string | null;
  finalContent: string | null;
  isEdited: boolean;
  status: DiaryStatus;
  createdAt: string; // ISO OffsetDateTime
  updatedAt: string;
}

export interface DiaryUpdateRequest {
  finalMood?: MoodType;
  finalContent?: string;
}

/**
 * POST /diaries — 오늘 날짜로 일기 생성. 이미 있으면 기존 일기 반환.
 * 1일 1개 강제. 중간 기록(Segment)은 이 일기 ID 아래에 추가됨.
 */
export const createTodayDiary = async (): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.post<DiaryResponse>('/diaries');
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '오늘 일기를 시작할 수 없어요.'));
  }
};

/**
 * GET /diaries?month=YYYY-MM — 월별 일기 목록 (캘린더용).
 */
export const getDiariesByMonth = async (
  month: string, // 'YYYY-MM'
): Promise<DiaryResponse[]> => {
  try {
    const { data } = await apiClient.get<DiaryResponse[]>('/diaries', {
      params: { month },
    });
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기 목록을 불러오지 못했어요.'));
  }
};

/**
 * GET /diaries/{diaryId} — 일기 상세 조회.
 */
export const getDiary = async (diaryId: number): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.get<DiaryResponse>(`/diaries/${diaryId}`);
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기를 불러오지 못했어요.'));
  }
};

/**
 * PATCH /diaries/{diaryId} — final 일기 수정 (사용자가 AI 초안 다듬기).
 */
export const updateDiary = async (
  diaryId: number,
  request: DiaryUpdateRequest,
): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.patch<DiaryResponse>(
      `/diaries/${diaryId}`,
      request,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기를 수정하지 못했어요.'));
  }
};

/**
 * POST /diaries/{diaryId}/complete — final 일기 완료 처리 (status: COMPLETED).
 * finalMood가 비어있으면 백엔드가 400 반환.
 */
export const completeDiary = async (diaryId: number): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.post<DiaryResponse>(
      `/diaries/${diaryId}/complete`,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기를 마무리하지 못했어요.'));
  }
};

/**
 * DELETE /diaries/{diaryId} — 일기 삭제 (해당 segments까지 cascade).
 */
export const deleteDiary = async (diaryId: number): Promise<void> => {
  try {
    await apiClient.delete(`/diaries/${diaryId}`);
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '일기를 삭제하지 못했어요.'));
  }
};
