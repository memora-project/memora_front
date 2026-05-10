import React, { useCallback, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import type { DetailScreenProps } from '../navigation/AppNavigator';
import {
  getDiary,
  deleteDiary,
  type DiaryResponse,
} from '../api/diaries';
import { getSegments, type SegmentResponse } from '../api/segments';
import { generateDiaryAiDraft } from '../api/aiDiary';
import { MOOD_INFO } from '../constants/moods';
import { useSettings } from '../contexts/SettingsContext';

const DetailScreen: React.FC<DetailScreenProps> = ({ navigation, route }) => {
  const { diaryId } = route.params;
  const { scale } = useSettings();
  const [diary, setDiary] = useState<DiaryResponse | null>(null);
  const [segments, setSegments] = useState<SegmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 화면 포커스 시 백엔드에서 다시 읽음 (편집 후 돌아왔을 때 등 대비)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        try {
          const [d, s] = await Promise.all([
            getDiary(diaryId),
            getSegments(diaryId),
          ]);
          if (!cancelled) {
            setDiary(d);
            setSegments(s);
          }
        } catch (e: any) {
          if (!cancelled) {
            Alert.alert(
              '일기를 불러오지 못했어요',
              e?.message ?? '알 수 없는 오류',
            );
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [diaryId]),
  );

  const handleDelete = () => {
    Alert.alert(
      '일기를 삭제할까요?',
      '한 번 삭제한 일기는 다시 되돌릴 수 없어요. (이 날의 모든 중간 기록도 함께 삭제됩니다)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteDiary(diaryId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('삭제 실패', e?.message ?? '알 수 없는 오류');
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleGenerateFinalDraft = async () => {
    if (isGeneratingFinal) return;
    setIsGeneratingFinal(true);
    try {
      const updated = await generateDiaryAiDraft(diaryId);
      setDiary(updated);
    } catch (e: any) {
      Alert.alert('AI 정리 실패', e?.message ?? '알 수 없는 오류');
    } finally {
      setIsGeneratingFinal(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      </SafeAreaView>
    );
  }

  if (!diary) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerWrap}>
          <Text style={styles.notFoundText}>일기를 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const finalMoodInfo = diary.finalMood ? MOOD_INFO[diary.finalMood] : null;
  const finalContent = diary.finalContent ?? diary.aiDraft;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          activeOpacity={0.7}
          disabled={isDeleting}
          onPress={handleDelete}
        >
          <Text
            style={[styles.deleteText, isDeleting && { opacity: 0.4 }]}
          >
            삭제
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 날짜 + final mood */}
        <View style={styles.headerBlock}>
          <Text style={[styles.date, { fontSize: scale(22) }]}>
            {diary.targetDate}
          </Text>
          {finalMoodInfo && (
            <View style={styles.moodPill}>
              <Text style={styles.moodEmoji}>{finalMoodInfo.emoji}</Text>
              <Text style={styles.moodLabel}>{finalMoodInfo.label}</Text>
            </View>
          )}
        </View>

        {/* AI 종합 일기 (있으면) 또는 생성 버튼 */}
        {finalContent ? (
          <View style={styles.contentCard}>
            <Text style={[styles.cardTitle, { fontSize: scale(13) }]}>
              {diary.finalContent ? '오늘의 일기' : 'AI가 정리한 하루'}
            </Text>
            <Text style={[styles.content, { fontSize: scale(16) }]}>
              {finalContent}
            </Text>
            {!diary.finalContent && segments.length > 0 && (
              <TouchableOpacity
                style={[styles.regenerateBtn, isGeneratingFinal && { opacity: 0.5 }]}
                onPress={handleGenerateFinalDraft}
                disabled={isGeneratingFinal}
              >
                {isGeneratingFinal ? (
                  <ActivityIndicator color="#3D3A37" size="small" />
                ) : (
                  <Text style={styles.regenerateText}>다시 정리하기</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : segments.length > 0 ? (
          <TouchableOpacity
            style={[
              styles.generateCard,
              isGeneratingFinal && { opacity: 0.5 },
            ]}
            activeOpacity={0.85}
            onPress={handleGenerateFinalDraft}
            disabled={isGeneratingFinal}
          >
            {isGeneratingFinal ? (
              <ActivityIndicator color="#2C2A28" />
            ) : (
              <>
                <Text style={[styles.generateTitle, { fontSize: scale(15) }]}>
                  ✨ AI에게 하루 정리 부탁
                </Text>
                <Text style={[styles.generateSubtitle, { fontSize: scale(13) }]}>
                  오늘 작성하신 {segments.length}개의 기록을 하나의 일기로 묶어드려요
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {/* 중간 기록 목록 */}
        {segments.length > 0 && (
          <View style={styles.segmentsBlock}>
            <Text style={[styles.sectionTitle, { fontSize: scale(14) }]}>
              오늘의 중간 기록 ({segments.length}개)
            </Text>
            {segments.map(seg => {
              const moodInfo = MOOD_INFO[seg.moodSnapshot];
              const text = seg.userContent ?? seg.aiDraft ?? '';
              return (
                <View key={seg.segmentId} style={styles.segmentCard}>
                  <View style={styles.segmentHeader}>
                    <Text style={styles.segmentStep}>#{seg.stepOrder}</Text>
                    {moodInfo && (
                      <View style={styles.segmentMoodPill}>
                        <Text style={styles.segmentMoodEmoji}>
                          {moodInfo.emoji}
                        </Text>
                        <Text
                          style={[
                            styles.segmentMoodLabel,
                            { fontSize: scale(12) },
                          ]}
                        >
                          {moodInfo.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {seg.photoUrl && (
                    <Image
                      source={{ uri: seg.photoUrl }}
                      style={styles.segmentPhoto}
                      resizeMode="cover"
                    />
                  )}

                  {(seg.takenAt || seg.locationName) && (
                    <View style={styles.metaRow}>
                      {seg.takenAt && (
                        <View style={styles.metaChip}>
                          <Text style={styles.metaChipLabel}>📅</Text>
                          <Text style={styles.metaChipValue}>
                            {seg.takenAt.slice(0, 10)}
                          </Text>
                        </View>
                      )}
                      {seg.locationName && (
                        <View style={styles.metaChip}>
                          <Text style={styles.metaChipLabel}>📍</Text>
                          <Text style={styles.metaChipValue} numberOfLines={1}>
                            {seg.locationName}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {text.length > 0 && (
                    <Text
                      style={[styles.segmentText, { fontSize: scale(14) }]}
                    >
                      {text}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
  },
  notFoundText: {
    fontSize: 15,
    color: '#8A857F',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 30,
    color: '#2C2A28',
    lineHeight: 32,
    fontWeight: '300',
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#C0392B',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  date: {
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.3,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  moodEmoji: {
    fontSize: 18,
  },
  moodLabel: {
    fontSize: 13,
    color: '#3D3A37',
    fontWeight: '500',
  },

  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    color: '#A09B95',
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  content: {
    lineHeight: 28,
    color: '#2C2A28',
  },
  regenerateBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F5F1EA',
    borderRadius: 10,
  },
  regenerateText: {
    fontSize: 13,
    color: '#3D3A37',
    fontWeight: '500',
  },

  generateCard: {
    backgroundColor: '#FFFCF5',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F4E5C9',
  },
  generateTitle: {
    color: '#3D3A37',
    fontWeight: '600',
    marginBottom: 6,
  },
  generateSubtitle: {
    color: '#8A857F',
    textAlign: 'center',
    lineHeight: 18,
  },

  segmentsBlock: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#A09B95',
    fontWeight: '500',
    marginBottom: 12,
  },
  segmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  segmentStep: {
    fontSize: 12,
    color: '#A09B95',
    fontWeight: '500',
  },
  segmentMoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  segmentMoodEmoji: {
    fontSize: 14,
  },
  segmentMoodLabel: {
    color: '#3D3A37',
    fontWeight: '500',
  },
  segmentPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#EFEAE3',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
    maxWidth: '60%',
  },
  metaChipLabel: {
    fontSize: 11,
  },
  metaChipValue: {
    fontSize: 11,
    color: '#3D3A37',
  },
  segmentText: {
    color: '#3D3A37',
    lineHeight: 22,
  },
});

export default DetailScreen;
