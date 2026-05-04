import type { Gender } from '../types/user';

/**
 * 호칭 + 멘트 사전.
 *
 * - 호칭: userNickname(설정에서 직접 입력) 우선, 없으면 성별 자동.
 * - 멘트: 가장 최근 일기의 mood.key를 받아 그에 맞는 한 마디.
 *
 * mood.key 값은 `MidDiaryScreen`의 `MOODS` 정의와 일치해야 함:
 *   best / calm / unsure / sad / angry / sick
 *
 * (백엔드 ENUM `MoodType`(GREAT/CALM/UNKNOWN/SAD/ANGRY/PAIN)과는 별개. 향후 통합 작업 필요.)
 */

export const getDefaultNickname = (
  gender: Gender | null | undefined,
): string => {
  if (gender === 'MALE') return '할아버지';
  if (gender === 'FEMALE') return '할머니';
  return '어르신';
};

/** 사용자가 설정한 호칭이 있으면 그걸, 아니면 성별 기준 자동 호칭. */
export const resolveNickname = (
  customNickname: string | null | undefined,
  gender: Gender | null | undefined,
): string => {
  const trimmed = customNickname?.trim();
  if (trimmed && trimmed.length > 0) return trimmed;
  return getDefaultNickname(gender);
};

/** 일기 0건일 때 손주가 건네는 첫 인사. */
export const EMPTY_DAY_GREETING = '오늘 어떠세요?';

/** 최종 일기까지 작성한 후의 마무리 멘트. */
export const FINAL_DONE_GREETING = '오늘도 수고하셨어요.';

/** mood.key 매칭 안 되거나 mood가 null일 때의 fallback. */
export const DEFAULT_AFTER_DIARY_GREETING = '마음을 적어주셔서 고마워요.';

/** 가장 최근 일반 일기의 기분에 따른 한마디. nickname은 호출하는 쪽에서 prefix로 붙임. */
export const MOOD_GREETING_TEXT: Record<string, string> = {
  best: '좋은 하루를 보내고 계시네요!',
  calm: '편안한 하루를 보내고 계시네요.',
  unsure: '천천히 가셔도 괜찮아요.',
  sad: '마음이 무거우셨군요. 곁에 있을게요.',
  angry: '속상한 일이 있으셨나봐요. 깊게 숨 한 번 쉬어요.',
  sick: '몸 잘 챙기시고 푹 쉬세요.',
};
