import type { MoodType } from '../constants/moods';

/**
 * 프론트엔드의 mood key (MidDiary/FinalDiary 화면에서 사용)와
 * 백엔드의 MoodType ENUM 값을 양방향으로 변환한다.
 *
 * 프론트 → 백엔드 매핑:
 *   best   → GREAT
 *   calm   → CALM
 *   unsure → UNKNOWN
 *   sad    → SAD
 *   angry  → ANGRY
 *   sick   → PAIN
 *
 * 통합 안 하고 매퍼로 두는 이유:
 *  - moods.ts(MoodType, MOOD_INFO)는 인수인계 영역
 *  - MidDiary/FinalDiary 화면의 MOODS 배열도 손주 톤 라벨/이모지 따로 유지
 *  - 두 표현을 그대로 살리고 경계만 매퍼가 담당
 */

export type FrontMoodKey =
  | 'best'
  | 'calm'
  | 'unsure'
  | 'sad'
  | 'angry'
  | 'sick';

const FRONT_TO_SERVER: Record<FrontMoodKey, MoodType> = {
  best: 'GREAT',
  calm: 'CALM',
  unsure: 'UNKNOWN',
  sad: 'SAD',
  angry: 'ANGRY',
  sick: 'PAIN',
};

const SERVER_TO_FRONT: Record<MoodType, FrontMoodKey> = {
  GREAT: 'best',
  CALM: 'calm',
  UNKNOWN: 'unsure',
  SAD: 'sad',
  ANGRY: 'angry',
  PAIN: 'sick',
};

export const moodKeyToServer = (key: FrontMoodKey): MoodType =>
  FRONT_TO_SERVER[key];

export const moodServerToKey = (type: MoodType): FrontMoodKey =>
  SERVER_TO_FRONT[type];
