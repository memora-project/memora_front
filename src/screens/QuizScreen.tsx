import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../contexts/SettingsContext';
import { resolveImageUrl } from '../api/files';
import {
  getQuiz,
  submitQuizAnswer,
  type QuizResponse,
  type QuizResultResponse,
} from '../api/quiz';
import type { QuizScreenProps } from '../navigation/AppNavigator';

/**
 * 어르신 기억력 퀴즈 화면.
 *
 * 흐름:
 *   1) 화면 진입 → GET /quiz 로 사진/질문/4지선다 받음
 *   2) 사용자가 보기 클릭 → 즉시 정답 비교 + POST /quiz/answer 로 결과 기록
 *   3) 정답이면 "정답이에요!" / 오답이면 정답 표시
 *   4) 닫기 또는 한 문제 더 풀기
 *
 * 백엔드가 GET 응답에 correctAnswer를 함께 내려주므로 정답 표시는 즉시 가능.
 * POST /quiz/answer는 정오답 통계용이라 실패해도 사용자 경험은 끊지 않는다.
 */
const QuizScreen: React.FC<QuizScreenProps> = ({ navigation }) => {
  const { scale } = useSettings();

  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResultResponse | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSelected(null);
    setResult(null);
    try {
      const q = await getQuiz();
      setQuiz(q);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '퀴즈를 불러오지 못했습니다.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSelect = async (choice: string) => {
    if (!quiz || selected) return; // 한 번 선택하면 잠금
    setSelected(choice);

    // 즉시 클라이언트 정답 판정 (백엔드 응답에 correctAnswer 포함됨)
    const isCorrect = choice === quiz.correctAnswer;
    const optimistic: QuizResultResponse = {
      correct: isCorrect,
      message: isCorrect ? '정답이에요! 대단하세요!' : '아쉬워요. 다음에 또 도전해보세요.',
      correctAnswer: quiz.correctAnswer,
    };
    setResult(optimistic);

    // 통계 기록 — 실패해도 UX 끊지 않음
    try {
      const serverResult = await submitQuizAnswer({
        quizId: quiz.quizId,
        answer: choice,
        correctAnswer: quiz.correctAnswer,
      });
      setResult(serverResult);
    } catch (e) {
      console.warn('퀴즈 정답 제출 실패 (로컬 판정은 유지):', e);
    }
  };

  const handleClose = () => navigation.goBack();

  // ─── 렌더 분기 ───
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color="#2C2A28" />
          <Text style={[styles.statusText, { fontSize: scale(15) }]}>
            오늘의 퀴즈를 준비하고 있어요...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !quiz) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.centerWrap}>
          <Text style={[styles.statusText, { fontSize: scale(16) }]}>
            {loadError ?? '퀴즈를 불러오지 못했어요.'}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 24 }]}
            onPress={loadQuiz}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { fontSize: scale(17) }]}>
              다시 시도
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 10 }]}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { fontSize: scale(17) }]}>
              닫기
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* 상단 닫기 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>오늘의 퀴즈</Text>
        <View style={styles.closeBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 사진 */}
        <Image
          source={{ uri: resolveImageUrl(quiz.photoUrl) }}
          style={styles.photo}
          resizeMode="cover"
        />

        {/* 날짜 */}
        <Text style={[styles.dateText, { fontSize: scale(13) }]}>
          {quiz.targetDate}
        </Text>

        {/* 질문 */}
        <Text style={[styles.question, { fontSize: scale(20), lineHeight: scale(28) }]}>
          {quiz.question}
        </Text>

        {/* 4지선다 */}
        <View style={styles.choicesWrap}>
          {quiz.choices.map((choice, idx) => {
            const isPicked = selected === choice;
            const isCorrectChoice = result && choice === quiz.correctAnswer;
            const isWrongPick = isPicked && result && !result.correct;

            let extraStyle = {};
            let textStyle = {};
            if (result) {
              if (isCorrectChoice) {
                extraStyle = styles.choiceCorrect;
                textStyle = styles.choiceTextCorrect;
              } else if (isWrongPick) {
                extraStyle = styles.choiceWrong;
                textStyle = styles.choiceTextWrong;
              }
            } else if (isPicked) {
              extraStyle = styles.choiceActive;
            }

            return (
              <TouchableOpacity
                key={`${idx}-${choice}`}
                style={[styles.choice, extraStyle]}
                onPress={() => handleSelect(choice)}
                activeOpacity={0.85}
                disabled={!!selected}
              >
                <Text style={[styles.choiceText, { fontSize: scale(17) }, textStyle]}>
                  {choice}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 결과 메시지 */}
        {result && (
          <View
            style={[
              styles.resultBox,
              result.correct ? styles.resultBoxCorrect : styles.resultBoxWrong,
            ]}
          >
            <Text
              style={[
                styles.resultMessage,
                { fontSize: scale(17), lineHeight: scale(24) },
                result.correct ? styles.resultMessageCorrect : styles.resultMessageWrong,
              ]}
            >
              {result.message}
            </Text>
            {!result.correct && (
              <Text style={[styles.resultAnswer, { fontSize: scale(15) }]}>
                정답: {result.correctAnswer}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* 하단 액션 */}
      {result && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={loadQuiz}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { fontSize: scale(17) }]}>
              한 문제 더 풀기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { fontSize: scale(17) }]}>
              닫기
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  statusText: {
    color: '#5C5852',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 22,
    color: '#2C2A28',
    fontWeight: '300',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C2A28',
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 32,
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#EFEAE3',
  },
  dateText: {
    color: '#A09B95',
    marginTop: 12,
  },
  question: {
    color: '#2C2A28',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
  },

  choicesWrap: {
    width: '100%',
    marginTop: 12,
    gap: 10,
  },
  choice: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E0DA',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceActive: {
    borderColor: '#2C2A28',
    backgroundColor: '#F2EEE8',
  },
  choiceCorrect: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  choiceWrong: {
    borderColor: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  choiceText: {
    color: '#2C2A28',
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceTextCorrect: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  choiceTextWrong: {
    color: '#C62828',
    fontWeight: '700',
  },

  resultBox: {
    width: '100%',
    marginTop: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  resultBoxCorrect: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  resultBoxWrong: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF9A9A',
  },
  resultMessage: {
    fontWeight: '700',
    textAlign: 'center',
  },
  resultMessageCorrect: {
    color: '#2E7D32',
  },
  resultMessageWrong: {
    color: '#C62828',
  },
  resultAnswer: {
    color: '#5C5852',
    marginTop: 6,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#2C2A28',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
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
  },
  secondaryBtnText: {
    color: '#2C2A28',
    fontWeight: '700',
  },
});

export default QuizScreen;
