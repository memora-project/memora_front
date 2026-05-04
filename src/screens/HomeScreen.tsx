import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AppHeader from '../components/AppHeader';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

import type { HomeScreenProps } from '../navigation/AppNavigator';
import { getTodayDiaries, type DiaryEntry } from '../storage/diaryStorage';
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
  const { userGender, userNickname } = useAuth();

  const [todayEntries, setTodayEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        try {
          const list = await getTodayDiaries();
          if (!cancelled) setTodayEntries(list);
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

  const finalEntry = useMemo(
    () => todayEntries.find(e => e.isFinal) ?? null,
    [todayEntries],
  );

  const latestNormal = useMemo(
    () => todayEntries.find(e => !e.isFinal) ?? null,
    [todayEntries],
  );

  const handleWriteNormal = () => navigation.navigate('MidDiary');
  const handleWriteFinal = () => navigation.navigate('FinalDiary');

  // ───────────────────────────────────────
  // 케이스별 데이터 계산
  // ───────────────────────────────────────

  type CaseData = { emoji: string; bubbleText: string };

  const caseData = useMemo<CaseData>(() => {
    if (finalEntry) {
      return {
        emoji: finalEntry.mood?.emoji ?? '🌙',
        bubbleText: `${nickname}, ${FINAL_DONE_GREETING}`,
      };
    }
    if (latestNormal) {
      const moodKey = latestNormal.mood?.key;
      const greetingText =
        (moodKey && MOOD_GREETING_TEXT[moodKey]) ||
        DEFAULT_AFTER_DIARY_GREETING;
      return {
        emoji: latestNormal.mood?.emoji ?? '🙂',
        bubbleText: `${nickname}, ${greetingText}`,
      };
    }
    // 케이스 A — 손주 표정 (성별에 맞춰 다정한 인사 표정)
    return {
      emoji: userGender === 'MALE' ? '🧒' : '👧',
      bubbleText: `${nickname}, ${EMPTY_DAY_GREETING}`,
    };
  }, [finalEntry, latestNormal, nickname, userGender]);

  // ───────────────────────────────────────
  // 푸터 (버튼 영역 — 하단 고정)
  // ───────────────────────────────────────

  const renderFooter = () => {
    // 마무리 후 — 추가 일기만
    if (finalEntry) {
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
    if (latestNormal) {
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
            <Text style={styles.bigEmoji}>{caseData.emoji}</Text>

            {/* 말풍선 — 이모지에서 말이 나오는 듯 위쪽에 삼각형 꼬리 */}
            <View style={styles.bubbleTail} />
            <View style={styles.bubble}>
              <Text style={[styles.bubbleText, { fontSize: scale(15) }]}>
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

  bigEmoji: {
    fontSize: 130,
    marginBottom: 12,
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
    lineHeight: 22,
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
