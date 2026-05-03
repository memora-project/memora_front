/**
 * 백엔드 mood_type ENUM과 일치
 * - GREAT: 최고
 * - CALM: 평온
 * - UNKNOWN: 모르겠어요
 * - SAD: 슬퍼요
 * - ANGRY: 화나요
 * - PAIN: 몸이 안 좋아요
 */
export type MoodType = 'GREAT' | 'CALM' | 'UNKNOWN' | 'SAD' | 'ANGRY' | 'PAIN';

export type MoodInfo = {
  type: MoodType;
  label: string;        // 한국어 라벨
  emoji: string;
  color: string;        // 차트용 색상
  description: string;
};

export const MOOD_INFO: Record<MoodType, MoodInfo> = {
  GREAT: {
    type: 'GREAT',
    label: '최고',
    emoji: '😄',
    color: '#F4B860',     // 따뜻한 노란빛
    description: '기분 좋은 하루',
  },
  CALM: {
    type: 'CALM',
    label: '평온',
    emoji: '😌',
    color: '#7BB89C',     // 차분한 초록빛
    description: '편안한 하루',
  },
  UNKNOWN: {
    type: 'UNKNOWN',
    label: '모르겠어요',
    emoji: '😐',
    color: '#A09B95',     // 중성 회색
    description: '잘 모르겠어요',
  },
  SAD: {
    type: 'SAD',
    label: '슬퍼요',
    emoji: '😔',
    color: '#6B8FB8',     // 차분한 파란빛
    description: '슬픈 하루',
  },
  ANGRY: {
    type: 'ANGRY',
    label: '화나요',
    emoji: '😡',
    color: '#D9614C',     // 강렬한 빨간빛
    description: '화나는 하루',
  },
  PAIN: {
    type: 'PAIN',
    label: '몸이 아파요',
    emoji: '🤕',
    color: '#9B7BB8',     // 자주빛 (불편함)
    description: '몸이 좋지 않은 하루',
  },
};

// 차트 표시 순서 (긍정 → 부정)
export const MOOD_ORDER: MoodType[] = ['GREAT', 'CALM', 'UNKNOWN', 'SAD', 'ANGRY', 'PAIN'];