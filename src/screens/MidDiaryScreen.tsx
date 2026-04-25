import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 1 | 2 | 3;

type Mood = {
  key: string;
  label: string;
  emoji: string;
};

type PhotoMeta = {
  uri: string;
  // EXIF 데이터 추출 시 채워질 필드 (촬영 시각/위치 등)
  takenAt?: string;
  location?: { latitude: number; longitude: number };
};

type MidDiaryScreenProps = {
  navigation?: { navigate: (screen: string, params?: object) => void };
};

const MOODS: Mood[] = [
  { key: 'best', label: '최고에요', emoji: '😄' },
  { key: 'calm', label: '평온해요', emoji: '😌' },
  { key: 'unsure', label: '저도 모르겠어요', emoji: '🤔' },
  { key: 'sad', label: '슬퍼요', emoji: '😢' },
  { key: 'angry', label: '화나요', emoji: '😠' },
  { key: 'sick', label: '몸이 안 좋아요', emoji: '🤒' },
];

// TODO: OpenRouter API 연동. 기분 + 사진 메타데이터(EXIF)를 프롬프트로 묶어
// AI 초안을 생성한다.
const generateAIDraft = async (
  _mood: Mood | null,
  _photo: PhotoMeta | null,
): Promise<string> => {
  return '';
};

const MidDiaryScreen: React.FC<MidDiaryScreenProps> = ({ navigation }) => {
  const [step, setStep] = useState<Step>(1);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMeta | null>(null);
  const [diaryText, setDiaryText] = useState<string>('');

  // Step 3 진입 시 AI 초안 자동 생성 (지금은 mock 텍스트)
  useEffect(() => {
    if (step === 3 && !diaryText) {
      // 실제 구현: const draft = await generateAIDraft(selectedMood, selectedPhoto);
      const moodLine = selectedMood
        ? `오늘은 ${selectedMood.emoji} ${selectedMood.label}한 하루였다.`
        : '오늘 하루를 돌아본다.';
      const photoLine = selectedPhoto
        ? '\n\n사진 속 순간이 마음에 남는다. 그 장면을 떠올리면 잔잔한 여운이 남는다.'
        : '';
      const draft =
        `${moodLine}${photoLine}\n\n` +
        '바쁜 일상 속에서도 잠시 멈춰 나의 마음을 들여다보는 시간을 가졌다. ' +
        '작은 감정 하나하나가 모여 오늘의 나를 만든다는 사실을, 다시 한 번 깨달았다.';
      setDiaryText(draft);
    }
  }, [step, selectedMood, selectedPhoto, diaryText]);

  const handleMoodSelect = (mood: Mood | null) => {
    setSelectedMood(mood);
    setStep(2);
  };

  const handlePhotoPick = (source: 'camera' | 'gallery' | 'skip') => {
    if (source === 'skip') {
      setSelectedPhoto(null);
    } else {
      // TODO: react-native-image-picker로 카메라/갤러리 호출 후
      // EXIF 데이터(촬영 시각, GPS 좌표 등)를 추출해 PhotoMeta에 저장한다.
      // 예: const exif = await Exif.getExif(uri);
      setSelectedPhoto({
        uri: source === 'camera' ? 'mock://camera' : 'mock://gallery',
      });
    }
    setStep(3);
  };

  const handleSave = () => {
    // TODO: AsyncStorage / DB에 일기 저장
    Alert.alert('저장 완료', '오늘의 기록이 저장되었어요.', [
      { text: '확인', onPress: () => navigation?.navigate('Home') },
    ]);
  };

  const handleEditMenu = () => {
    Alert.alert(
      '어떻게 수정할까요?',
      '',
      [
        {
          text: '기분 다시 선택',
          onPress: () => {
            setDiaryText('');
            setStep(1);
          },
        },
        {
          text: '다시 작성',
          onPress: () => setDiaryText(''),
        },
        { text: '직접 수정', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map(n => (
        <View
          key={n}
          style={[styles.stepDot, step === n && styles.stepDotActive]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>오늘 어떠신가요?</Text>
      <Text style={styles.subtitle}>지금의 마음에 가장 가까운 것을 골라주세요</Text>

      <View style={styles.moodGrid}>
        {MOODS.map(mood => (
          <TouchableOpacity
            key={mood.key}
            style={styles.moodButton}
            activeOpacity={0.8}
            onPress={() => handleMoodSelect(mood)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => handleMoodSelect(null)}
      >
        <Text style={styles.skipText}>기분 선택 안 함</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>오늘의 한 장면</Text>
      <Text style={styles.subtitle}>마음에 남은 사진이 있다면 함께 담아보세요</Text>

      <View style={styles.photoActions}>
        <TouchableOpacity
          style={styles.photoButton}
          activeOpacity={0.8}
          onPress={() => handlePhotoPick('camera')}
        >
          <Text style={styles.photoIcon}>📷</Text>
          <Text style={styles.photoLabel}>카메라</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoButton}
          activeOpacity={0.8}
          onPress={() => handlePhotoPick('gallery')}
        >
          <Text style={styles.photoIcon}>🖼️</Text>
          <Text style={styles.photoLabel}>갤러리</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => handlePhotoPick('skip')}
      >
        <Text style={styles.skipText}>사진 선택 안 함</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>AI가 다듬어 본 초안이에요</Text>
      <Text style={styles.subtitle}>마음에 들면 그대로, 아니라면 자유롭게 고쳐주세요</Text>

      <TextInput
        style={styles.diaryInput}
        value={diaryText}
        onChangeText={setDiaryText}
        multiline
        textAlignVertical="top"
        placeholder="오늘의 이야기를 들려주세요..."
        placeholderTextColor="#B8B3AC"
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          activeOpacity={0.85}
          onPress={handleEditMenu}
        >
          <Text style={styles.actionSecondaryText}>수정!</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionPrimary]}
          activeOpacity={0.85}
          onPress={handleSave}
        >
          <Text style={styles.actionPrimaryText}>마음에 들어요!</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {renderStepIndicator()}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
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
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#8A857F',
    marginBottom: 32,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  moodButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  moodEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 12,
    color: '#3D3A37',
    fontWeight: '500',
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
  },
  photoButton: {
    flex: 1,
    maxWidth: 160,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  photoLabel: {
    fontSize: 15,
    color: '#3D3A37',
    fontWeight: '500',
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 14,
    color: '#8A857F',
    textDecorationLine: 'underline',
  },
  diaryInput: {
    flex: 1,
    minHeight: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    lineHeight: 26,
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
    fontSize: 16,
    fontWeight: '600',
  },
  actionSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E0DA',
  },
  actionSecondaryText: {
    color: '#3D3A37',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MidDiaryScreen;
