import { apiClient, extractApiErrorMessage } from './client';
import type { MoodType } from './diaries';

/**
 * 백엔드 SegmentResponse와 일치. 한 일기 안의 "중간 기록" 한 건.
 *
 * - moodSnapshot: 그 시점 사용자가 고른 기분
 * - photoUrl: 백엔드 업로드 후 받은 URL (file:// 가 아님)
 * - takenAt/latitude/longitude/locationName: 사진 EXIF 또는 디바이스 GPS에서 추출
 * - aiDraft: 이 segment에 대한 AI 초안 (POST .../ai-draft 호출 후 채워짐)
 * - userContent: 사용자가 작성/수정한 본문
 */
export interface SegmentResponse {
  segmentId: number;
  stepOrder: number;
  moodSnapshot: MoodType;
  photoUrl: string | null;
  takenAt: string | null; // ISO OffsetDateTime
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  aiDraft: string | null;
  userContent: string | null;
  isEdited: boolean;
  createdAt: string;
}

export interface SegmentCreateRequest {
  moodSnapshot: MoodType;
  photoUrl?: string;
  takenAt?: string; // ISO
  latitude?: number;
  longitude?: number;
  locationName?: string;
  /**
   * 한 줄 메모 (있으면 AI 프롬프트에 반영됨).
   * ⚠️ 백엔드 SegmentService.createSegment()가 이 필드를 builder에 누락하는 사전 버그 있음.
   * 다음 백엔드 PR에서 수정 예정. 우선 보내두면 그쪽 수정 후 즉시 동작.
   */
  userContent?: string;
}

export interface SegmentUpdateRequest {
  moodSnapshot?: MoodType;
  userContent?: string;
}

/**
 * POST /diaries/{diaryId}/segments — 중간 기록 추가.
 * stepOrder는 백엔드가 자동 부여 (현재 개수 + 1).
 */
export const createSegment = async (
  diaryId: number,
  request: SegmentCreateRequest,
): Promise<SegmentResponse> => {
  try {
    const { data } = await apiClient.post<SegmentResponse>(
      `/diaries/${diaryId}/segments`,
      request,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 저장하지 못했어요.'));
  }
};

/**
 * GET /diaries/{diaryId}/segments — 중간 기록 목록 (stepOrder 오름차순).
 */
export const getSegments = async (
  diaryId: number,
): Promise<SegmentResponse[]> => {
  try {
    const { data } = await apiClient.get<SegmentResponse[]>(
      `/diaries/${diaryId}/segments`,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 불러오지 못했어요.'));
  }
};

/**
 * PATCH /diaries/{diaryId}/segments/{segmentId} — 중간 기록 수정.
 * 사용자가 AI 초안을 다듬어 자기 표현으로 바꿀 때 호출.
 */
export const updateSegment = async (
  diaryId: number,
  segmentId: number,
  request: SegmentUpdateRequest,
): Promise<SegmentResponse> => {
  try {
    const { data } = await apiClient.patch<SegmentResponse>(
      `/diaries/${diaryId}/segments/${segmentId}`,
      request,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 수정하지 못했어요.'));
  }
};

/**
 * DELETE /diaries/{diaryId}/segments/{segmentId} — 중간 기록 삭제.
 * 삭제 후 남은 segments의 stepOrder가 자동 재정렬됨.
 */
export const deleteSegment = async (
  diaryId: number,
  segmentId: number,
): Promise<void> => {
  try {
    await apiClient.delete(`/diaries/${diaryId}/segments/${segmentId}`);
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 삭제하지 못했어요.'));
  }
};
