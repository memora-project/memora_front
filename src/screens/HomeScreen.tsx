import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

import type { HomeScreenProps } from '../navigation/AppNavigator';
import { createTodayDiary, type DiaryResponse } from '../api/diaries';
import { getSegments, type SegmentResponse } from '../api/segments';
import { resolveImageUrl } from '../api/files';
import { MOOD_INFO } from '../constants/moods';
import { moodServerToKey } from '../utils/moodMapper';
import {
  resolveNickname,
  EMPTY_DAY_GREETING,
  FINAL_DONE_GREETING,
  DEFAULT_AFTER_DIARY_GREETING,
  MOOD_GREETING_TEXT,
} from '../constants/grandparent';

/**
 * 홈 화면 — 3가지 케이스 모두 동일 레이아웃 (이모지 + 말풍선):
 *  (A) 오늘 일기 0건             → 손주 표정 이모지 + "오늘 어떠세요?"
 *  (B) 일반 일기 ≥1, 마무리 없음  → 가장 최근 기분 이모지 + 기분별 멘트
 *  (C) 마무리 일기 작성 완료      → 마무리 일기 기분 + 수고 멘트 (+ 추가 작성 가능)
 *
 * 레이아웃: content(가운데, flex:1) + footer(버튼, 하단 고정).
 * 말풍선엔 위쪽 삼각형 꼬리 → 이모지에서 말이 나오는 듯한 시각 효과.
 */

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { scale } = useSettings();
  const { userGender, userNickname, userGrandchildPhotoUrl } = useAuth();

  const [diary, setDiary] = useState<DiaryResponse | null>(null);
  const [segments, setSegments] = useState<SegmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        try {
          // 오늘 일기 확보(idempotent) → 그날 segments 조회.
          const d = await createTodayDiary();
          if (cancelled) return;
          setDiary(d);
          const segs = await getSegments(d.diaryId);
          if (!cancelled) setSegments(segs);
        } catch (e) {
          // 네트워크/인증 실패 등 — 빈 상태로 두면 케이스 A로 표시됨.
          if (!cancelled) {
            setDiary(null);
            setSegments([]);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const nickname = useMemo(
    () => resolveNickname(userNickname, userGender),
    [userNickname, userGender],
  );

  const isFinalDone = diary?.status === 'COMPLETED';
  // segments는 stepOrder 오름차순. 가장 최근에 작성한 게 마지막 원소.
  const latestSegment = segments.length > 0 ? segments[segments.length - 1] : null;

  const handleWriteNormal = () => navigation.navigate('MidDiary');
  const handleWriteFinal = () => navigation.navigate('FinalDiary');

  // ───────────────────────────────────────
  // 케이스별 데이터 계산
  // ───────────────────────────────────────

  type CaseData = {
    emoji: string;
    bubbleText: string;
    /**
     * 손주 사진이 설정돼 있으면 모든 케이스에서 채움 — 일기 작성 후에도 손주 얼굴 유지.
     * 사진 미설정 시에만 케이스별 이모지(케이스 A: 손주 표정, B/C: mood)가 표시된다.
     */
    photoUrl?: string | null;
  };

  const caseData = useMemo<CaseData>(() => {
    const photoUrl = userGrandchildPhotoUrl ?? null;

    // (C) 마무리 완료 — finalMood 이모지 + 마무리 멘트
    if (isFinalDone) {
      const moodType = diary?.finalMood ?? null;
      return {
        emoji: moodType ? MOOD_INFO[moodType].emoji : '🌙',
        bubbleText: `${nickname}, ${FINAL_DONE_GREETING}`,
        photoUrl,
      };
    }
    // (B) 일반 일기 ≥ 1 — 가장 최근 segment의 mood 이모지 + 기분별 멘트
    if (latestSegment) {
      const frontKey = moodServerToKey(latestSegment.moodSnapshot);
      const greetingText =
        MOOD_GREETING_TEXT[frontKey] || DEFAULT_AFTER_DIARY_GREETING;
      return {
        emoji: MOOD_INFO[latestSegment.moodSnapshot].emoji,
        bubbleText: `${nickname}, ${greetingText}`,
        photoUrl,
      };
    }
    // (A) 빈 상태 — 손주 표정 (사진 없을 때만 보이는 이모지)
    return {
      emoji: userGender === 'MALE' ? '🧒' : '👧',
      bubbleText: `${nickname}, ${EMPTY_DAY_GREETING}`,
      photoUrl,
    };
  }, [isFinalDone, diary, latestSegment, nickname, userGender, userGrandchildPhotoUrl]);

  // ───────────────────────────────────────
  // 푸터 (버튼 영역 — 하단 고정)
  // ───────────────────────────────────────

  const renderFooter = () => {
    // 마무리 후 — 추가 일기만
    if (isFinalDone) {
      return (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.btnFull]}
            onPress={handleWriteNormal}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { fontSize: scale(17) }]}>
              추가 일기 작성하기
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    // 일반 일기 있음 — 추가 + 마무리
    if (latestSegment) {
      return (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.btnFull]}
            onPress={handleWriteNormal}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { fontSize: scale(17) }]}>
              추가 일기 작성하기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, styles.btnFull]}
            onPress={handleWriteFinal}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { fontSize: scale(17) }]}>
              마무리 일기 작성하기
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    // 케이스 A — 첫 일기
    return (
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.btnFull]}
          onPress={handleWriteNormal}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { fontSize: scale(17) }]}>
            오늘의 일기 작성하기
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
      <AppHeader />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      ) : (
        <>
          <View style={styles.content}>
            <View style={styles.avatarWrap}>
              {caseData.photoUrl ? (
                <Image
                  source={{ uri: resolveImageUrl(caseData.photoUrl) }}
                  style={styles.bigPhoto}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.bigEmoji}>{caseData.emoji}</Text>
              )}

              {/* 이모지/사진 우상단 — 퀴즈 풀기 말풍선 버튼 */}
              <TouchableOpacity
                style={styles.quizBubble}
                onPress={() => navigation.navigate('Quiz')}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.quizBubbleEmoji}>✏️</Text>
                <Text style={[styles.quizBubbleText, { fontSize: scale(16) }]}>
                  퀴즈 풀기
                </Text>
                <View style={styles.quizBubbleTail} />
              </TouchableOpacity>
            </View>

            {/* 말풍선 — 이모지에서 말이 나오는 듯 위쪽에 삼각형 꼬리 */}
            <View style={styles.bubbleTail} />
            <View style={styles.bubble}>
              <Text
                style={[
                  styles.bubbleText,
                  { fontSize: scale(15), lineHeight: scale(22) },
                ]}
              >
                {caseData.bubbleText}
              </Text>
            </View>
          </View>
          {renderFooter()}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 가운데 시각 영역 — flex로 늘어나서 푸터 위 빈 공간 흡수
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  // 이모지/사진을 감싸는 컨테이너 — 우상단 말풍선 버튼 anchor
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: {
    fontSize: 130,
    marginBottom: 12,
  },
  bigPhoto: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 12,
    backgroundColor: '#EFEAE3',
  },

  // 퀴즈 풀기 말풍선 버튼 — 이모지/사진 우상단
  quizBubble: {
    position: 'absolute',
    top: -28,
    right: -64,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  quizBubbleEmoji: {
    fontSize: 19,
  },
  quizBubbleText: {
    color: '#2C2A28',
    fontWeight: '700',
  },
  // 말풍선 아래쪽으로 향하는 작은 꼬리 (이모지를 가리키게)
  quizBubbleTail: {
    position: 'absolute',
    left: 16,
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },

  // 말풍선 꼬리 — 위로 향한 작은 삼각형 (이모지 쪽).
  // RN의 border 트릭으로 삼각형 그리기.
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    marginBottom: -1, // 본체와 살짝 겹쳐서 봉합 — 그림자 사이 틈 방지
  },

  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 16,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleText: {
    color: '#3D3A37',
    fontWeight: '500',
    textAlign: 'center',
  },

  // 푸터 — 화면 하단
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 10,
  },
  btnFull: {
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: '#2C2A28',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2C2A28',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#2C2A28',
    fontWeight: '700',
  },
});

export default HomeScreen;
