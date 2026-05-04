import { apiClient, extractApiErrorMessage } from './client';
import type { MoodType } from '../constants/moods';

/**
 * Segment = 하루 안의 "중간 기록". MidDiaryScreen에서 작성하는 일반 일기 한 건이
 * segment 한 건에 대응한다. 한 일기(diary) 안에 여러 segment가 stepOrder 순으로 쌓인다.
 *
 * 본문 표시 규칙:
 *   isEdited === true  → userContent (사용자가 편집한 본문)
 *   isEdited === false → aiDraft     (AI 초안 — 사용자가 OK 한 상태)
 *
 * userContent 필드의 의미는 시점에 따라 다르다:
 *   - 생성 시점:  한 줄 메모 (AI 프롬프트에 들어가는 키워드)
 *   - 편집 시점:  사용자가 다듬은 본문 (생성 시 메모를 덮어씀)
 */

/** 응답에서 받는 사진 한 장의 메타. photoOrder 오름차순으로 정렬되어 옴. */
export interface SegmentPhotoResponse {
  photoId: number | null;
  photoOrder: number;
  photoUrl: string;
  /** ISO 8601. */
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  createdAt: string | null;
}

/** 요청에서 보내는 사진 한 장의 메타. photoUrl 필수 — /files/images로 업로드한 결과 url. */
export interface SegmentPhotoRequest {
  photoUrl: string;
  /** ISO 8601 (OffsetDateTime). */
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export interface SegmentResponse {
  segmentId: number;
  stepOrder: number;
  moodSnapshot: MoodType;

  /** 첫 번째 사진의 url (호환용 mirror). 다중 사진 클라이언트는 photos 사용. */
  photoUrl: string | null;
  /** ISO 8601. */
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;

  aiDraft: string | null;
  userContent: string | null;
  isEdited: boolean;
  createdAt: string;

  /** 첨부된 모든 사진. 비어있을 수 있음. */
  photos: SegmentPhotoResponse[];
}

export interface SegmentCreateRequest {
  moodSnapshot: MoodType;
  /** 다중 사진. 비어있으면 단일 photoUrl 경로로 폴백. */
  photos?: SegmentPhotoRequest[];

  // 단일 사진 호환 경로 — 새 코드는 photos 사용.
  photoUrl?: string;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;

  /** 한 줄 메모. AI 초안 생성 품질에 직접 영향. */
  userContent?: string;
}

export interface SegmentUpdateRequest {
  moodSnapshot?: MoodType;
  /** 사용자가 편집한 본문. 백엔드는 이 값으로 userContent를 덮어쓰고 isEdited=true 처리. */
  userContent?: string;
}

export const createSegment = async (
  diaryId: number,
  body: SegmentCreateRequest,
): Promise<SegmentResponse> => {
  try {
    const { data } = await apiClient.post<SegmentResponse>(
      `/diaries/${diaryId}/segments`,
      body,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 저장하지 못했습니다.'));
  }
};

export const getSegments = async (
  diaryId: number,
): Promise<SegmentResponse[]> => {
  try {
    const { data } = await apiClient.get<SegmentResponse[]>(
      `/diaries/${diaryId}/segments`,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 불러오지 못했습니다.'));
  }
};

export const updateSegment = async (
  diaryId: number,
  segmentId: number,
  body: SegmentUpdateRequest,
): Promise<SegmentResponse> => {
  try {
    const { data } = await apiClient.patch<SegmentResponse>(
      `/diaries/${diaryId}/segments/${segmentId}`,
      body,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 수정하지 못했습니다.'));
  }
};

export const deleteSegment = async (
  diaryId: number,
  segmentId: number,
): Promise<void> => {
  try {
    await apiClient.delete(`/diaries/${diaryId}/segments/${segmentId}`);
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '중간 기록을 삭제하지 못했습니다.'));
  }
};

/**
 * 단일 segment에 대한 AI 초안 생성/재생성.
 * 호출 시 segment의 userContent(=한 줄 메모)와 mood/사진 정보가 프롬프트로 들어가고,
 * 백엔드가 user의 이름/성별/나이를 추가해 호칭/나이대까지 자동 주입한다.
 */
export const generateSegmentAiDraft = async (
  diaryId: number,
  segmentId: number,
): Promise<SegmentResponse> => {
  try {
    const { data } = await apiClient.post<SegmentResponse>(
      `/diaries/${diaryId}/segments/${segmentId}/ai-draft`,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, 'AI 초안을 만들지 못했습니다.'));
  }
};
