import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import type { FinalDiaryScreenProps } from '../navigation/AppNavigator';
import {
  createTodayDiary,
  generateFinalAiDraft,
  updateDiary,
  completeDiary,
} from '../api/diaries';
import { moodKeyToServer } from '../utils/moodMapper';
import { useSettings } from '../contexts/SettingsContext';
import SuccessModal from '../components/SuccessModal';

type Step = 1 | 2;

interface Mood {
  key: string;
  label: string;
  emoji: string;
}

/**
 * MidDiaryScreen의 MOODS와 동일하게 유지해야 함 — 같은 mood 선택지를 일관되게 보이게 하려고.
 * 둘이 분기되면 사용자가 헷갈림. 이 정의는 추후 공통 모듈로 빼는 게 깔끔.
 */
const MOODS: Mood[] = [
  { key: 'best', label: '최고', emoji: '😄' },
  { key: 'calm', label: '평온', emoji: '😌' },
  { key: 'unsure', label: '모름', emoji: '🤔' },
  { key: 'sad', label: '슬픔', emoji: '😢' },
  { key: 'angry', label: '화남', emoji: '😠' },
  { key: 'sick', label: '아픔', emoji: '🤒' },
];

/**
 * AI 응답이 한 덩어리로 오는 경우 마침표/물음표/느낌표 뒤에 줄바꿈을 넣어
 * 문장별로 분리한다. 어르신 가독성용.
 */
const formatAIText = (text: string): string => {
  if (!text) return text;
  if (text.includes('\n')) {
    return text.replace(/\n{2,}/g, '\n');
  }
  return text.replace(/([.!?])\s+/g, '$1\n').trim();
};

const FinalDiaryScreen: React.FC<FinalDiaryScreenProps> = ({ navigation }) => {
  const { scale } = useSettings();
  const [step, setStep] = useState<Step>(1);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [diaryText, setDiaryText] = useState('');
  const [originalAiDraft, setOriginalAiDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [editMenuVisible, setEditMenuVisible] = useState(false);
  const [diaryId, setDiaryId] = useState<number | null>(null);

  // 진입 시 — 오늘 일기 확보(idempotent). 이미 COMPLETED면 안내하고 닫기.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const diary = await createTodayDiary();
        if (cancelled) return;
        if (diary.status === 'COMPLETED') {
          Alert.alert(
            '오늘은 이미 마무리하셨어요',
            '하루에 하나의 최종 일기만 작성할 수 있어요.',
            [{ text: '확인', onPress: () => navigation.goBack() }],
          );
          return;
        }
        setDiaryId(diary.diaryId);
      } catch (e: any) {
        if (!cancelled) {
          Alert.alert(
            '오늘 일기를 시작하지 못했어요',
            e?.message ?? '잠시 후 다시 시도해주세요.',
            [{ text: '확인', onPress: () => navigation.goBack() }],
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  // step 2 진입 — 백엔드의 generateFinalAiDraft가 그날 segments를 종합해 본문 생성.
  // 호칭 personalize는 서버가 user 정보로 자동 적용.
  useEffect(() => {
    if (step !== 2 || diaryText || diaryId === null) return;

    let cancelled = false;
    (async () => {
      setIsGenerating(true);
      try {
        const diary = await generateFinalAiDraft(diaryId);
        const draft = formatAIText(diary.aiDraft ?? '');
        if (!cancelled) {
          setDiaryText(draft);
          setOriginalAiDraft(draft);
        }
      } catch (e: any) {
        console.warn('최종 일기 AI 생성 실패:', e);
        if (!cancelled) {
          Alert.alert(
            'AI 초안을 만들지 못했어요',
            `${e?.message ?? '알 수 없는 오류'}\n\n직접 작성해주세요.`,
          );
          setDiaryText('');
          setOriginalAiDraft('');
        }
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, diaryText, diaryId]);

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(1);
    }
  };

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    setStep(2);
  };

  const handleSave = async () => {
    const trimmed = diaryText.trim();
    if (!trimmed) {
      Alert.alert('내용이 비어있어요', '한 줄이라도 작성한 뒤 저장해주세요.');
      return;
    }
    if (diaryId === null) {
      Alert.alert('아직 저장 준비가 안 됐어요', '잠시만 기다려주세요.');
      return;
    }
    setIsSaving(true);
    try {
      // 1) finalMood + finalContent 반영. 백엔드가 isEdited 플래그도 함께 처리.
      await updateDiary(diaryId, {
        finalMood: selectedMood
          ? moodKeyToServer(selectedMood.key as any)
          : undefined,
        finalContent: trimmed,
      });
      // 2) status를 COMPLETED로 전환. 같은 날 다시 진입하면 위 useEffect의 가드가 막음.
      await completeDiary(diaryId);
      setSavedModalVisible(true);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '알 수 없는 오류가 발생했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartFromMood = () => {
    setEditMenuVisible(false);
    setDiaryText('');
    setOriginalAiDraft('');
    setStep(1);
  };

  const handleRegenerateAI = () => {
    setEditMenuVisible(false);
    // diaryText 비우면 step 2 useEffect가 generateFinalAiDraft를 다시 호출.
    setDiaryText('');
    setOriginalAiDraft('');
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backTouch}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.6}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>
      <View style={styles.stepIndicator}>
        {[1, 2].map(n => (
          <View
            key={n}
            style={[styles.stepDot, step === n && styles.stepDotActive]}
          />
        ))}
      </View>
      <View style={styles.backTouch} />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { fontSize: scale(24) }]}>
        오늘의 하루를{'\n'}마무리해요
      </Text>
      <Text style={[styles.subtitle, { fontSize: scale(14) }]}>
        하루를 돌아봤을 때,{'\n'}지금의 마음은 어떠신가요?
      </Text>

      <View style={styles.moodGridWrap}>
        <View style={styles.moodGrid}>
          {MOODS.map(mood => (
            <TouchableOpacity
              key={mood.key}
              style={styles.moodButton}
              activeOpacity={0.8}
              onPress={() => handleMoodSelect(mood)}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text
                style={[
                  styles.moodLabel,
                  {
                    fontSize: scale(14),
                    lineHeight: scale(20),
                  },
                ]}
                numberOfLines={1}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { fontSize: scale(24) }]}>
        오늘 하루를 엮어봤어요
      </Text>
      <Text style={[styles.subtitle, { fontSize: scale(14) }]}>
        어떤가요? 마음에 들면 그대로, 아니면 자유롭게 고쳐주세요.
      </Text>

      {isGenerating ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2C2A28" />
          <Text style={[styles.loadingText, { fontSize: scale(14) }]}>
            오늘의 일기들을 정성스레 엮고 있어요...
          </Text>
        </View>
      ) : (
        <TextInput
          style={[
            styles.diaryInput,
            { fontSize: scale(15), lineHeight: scale(28) },
          ]}
          value={diaryText}
          onChangeText={setDiaryText}
          multiline
          textAlignVertical="top"
          placeholder="오늘 하루를 어떻게 마무리하고 싶으세요?"
          placeholderTextColor="#B8B3AC"
        />
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          activeOpacity={0.85}
          disabled={isGenerating || isSaving}
          onPress={() => setEditMenuVisible(true)}
        >
          <Text style={[styles.actionSecondaryText, { fontSize: scale(15) }]}>
            수정할래요!
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionPrimary]}
          activeOpacity={0.85}
          disabled={isGenerating || isSaving}
          onPress={handleSave}
        >
          <Text style={[styles.actionPrimaryText, { fontSize: scale(15) }]}>
            {isSaving ? '저장 중...' : '오늘 마무리하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {renderTopBar()}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={24}
      >
        {step === 1 ? renderStep1() : renderStep2()}
      </KeyboardAwareScrollView>

      {/* 수정 메뉴 모달 (step 2) */}
      <Modal
        visible={editMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setEditMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            <Text style={[styles.menuTitle, { fontSize: scale(18) }]}>
              어떻게 수정할까요?
            </Text>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={handleRestartFromMood}
            >
              <Text style={styles.menuItemEmoji}>🎭</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemTitle, { fontSize: scale(16) }]}>
                  기분부터 다시
                </Text>
                <Text style={[styles.menuItemDesc, { fontSize: scale(13) }]}>
                  처음 단계로 돌아가요
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={handleRegenerateAI}
            >
              <Text style={styles.menuItemEmoji}>✨</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemTitle, { fontSize: scale(16) }]}>
                  AI에게 다시 부탁
                </Text>
                <Text style={[styles.menuItemDesc, { fontSize: scale(13) }]}>
                  새 종합본을 받아봐요
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => setEditMenuVisible(false)}
            >
              <Text style={styles.menuItemEmoji}>✏️</Text>
              <View style={styles.menuItemTextWrap}>
                <Text style={[styles.menuItemTitle, { fontSize: scale(16) }]}>
                  직접 고치기
                </Text>
                <Text style={[styles.menuItemDesc, { fontSize: scale(13) }]}>
                  지금 글에서 손볼게요
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemCancel]}
              activeOpacity={0.7}
              onPress={() => setEditMenuVisible(false)}
            >
              <Text
                style={[
                  styles.menuItemTitle,
                  styles.menuItemCancelText,
                  { fontSize: scale(15) },
                ]}
              >
                취소
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <SuccessModal
        visible={savedModalVisible}
        emoji="🌙"
        title="오늘 하루 수고하셨어요"
        message={'마무리 일기까지\n잘 저장되었어요.'}
        onClose={() => {
          setSavedModalVisible(false);
          navigation.navigate('Home');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 30,
    color: '#2C2A28',
    fontWeight: '300',
    lineHeight: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E0DA',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: '#2C2A28',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 16,
  },
  moodGridWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  title: {
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    color: '#8A857F',
    marginBottom: 28,
    lineHeight: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  moodButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  moodLabel: {
    color: '#3D3A37',
    fontWeight: '500',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  loadingBox: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8A857F',
  },
  diaryInput: {
    minHeight: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    lineHeight: 24,
    color: '#2C2A28',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: '#2C2A28',
    flex: 1.4,
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E0DA',
  },
  actionSecondaryText: {
    color: '#3D3A37',
    fontWeight: '500',
  },

  // 수정 메뉴 모달
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  menuTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  menuItemCancel: {
    backgroundColor: '#F2EEE8',
    justifyContent: 'center',
    marginBottom: 0,
  },
  menuItemEmoji: {
    fontSize: 28,
  },
  menuItemTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    marginBottom: 2,
  },
  menuItemCancelText: {
    textAlign: 'center',
    color: '#3D3A37',
    fontWeight: '600',
    marginBottom: 0,
  },
  menuItemDesc: {
    color: '#8A857F',
  },
});

export default FinalDiaryScreen;
