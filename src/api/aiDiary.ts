import { apiClient, extractApiErrorMessage } from './client';
import type { DiaryResponse } from './diaries';
import type { SegmentResponse } from './segments';

/**
 * AI 일기 초안 생성 — 모든 OpenRouter 호출이 백엔드를 통해 일어난다.
 * 클라이언트는 OpenRouter 키도, 시스템 프롬프트도 모른다.
 *
 * 백엔드의 분당 10회 rate limit에 걸리면 HTTP 429와 함께
 * "AI 요청이 너무 많습니다" 메시지가 옴. extractApiErrorMessage가 그대로 노출.
 */

/**
 * POST /diaries/{diaryId}/segments/{segmentId}/ai-draft
 * 단일 중간 기록에 대한 3~4문장 일기 초안 생성/재생성.
 * 응답으로 aiDraft 필드가 채워진 SegmentResponse 반환.
 */
export const generateSegmentAiDraft = async (
  diaryId: number,
  segmentId: number,
): Promise<SegmentResponse> => {
  try {
    const { data } = await apiClient.post<SegmentResponse>(
      `/diaries/${diaryId}/segments/${segmentId}/ai-draft`,
      // body 없음. AI 호출은 30초까지 걸릴 수 있어서 timeout 늘림.
      undefined,
      { timeout: 45000 },
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, 'AI 초안을 만들지 못했어요.'));
  }
};

/**
 * POST /diaries/{diaryId}/ai-draft
 * 그날의 모든 segments를 종합해 final 일기 본문 생성/재생성.
 * 응답으로 aiDraft 필드가 채워진 DiaryResponse 반환.
 *
 * 호출 전 최소 1개 segment 필요 (백엔드가 0개면 400 반환).
 */
export const generateDiaryAiDraft = async (
  diaryId: number,
): Promise<DiaryResponse> => {
  try {
    const { data } = await apiClient.post<DiaryResponse>(
      `/diaries/${diaryId}/ai-draft`,
      undefined,
      { timeout: 60000 },
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, 'AI 일기를 종합하지 못했어요.'));
  }
};
