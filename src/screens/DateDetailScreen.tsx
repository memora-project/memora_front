import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../contexts/SettingsContext';
import {
  getDiariesByMonth,
  updateDiary,
  deleteDiary,
  type DiaryResponse,
} from '../api/diaries';
import {
  getSegments,
  updateSegment,
  deleteSegment,
  type SegmentResponse,
} from '../api/segments';
import { MOOD_INFO } from '../constants/moods';
import type { DateDetailScreenProps } from '../navigation/AppNavigator';

const formatKoreanDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${month}월 ${day}일 (${dayNames[date.getDay()]})`;
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * 그날의 일기 카드들을 segment / final 구분 없이 통합한 ViewModel.
 * `kind`로 백엔드 호출(수정/삭제)을 분기한다.
 */
type CardItem =
  | {
      kind: 'segment';
      key: string;
      segment: SegmentResponse;
      moodEmoji: string;
      content: string;
      time: string;
      isFinal: false;
    }
  | {
      kind: 'final';
      key: string;
      diary: DiaryResponse;
      moodEmoji: string;
      content: string;
      time: string;
      isFinal: true;
    };

/** 표시 규칙: isEdited면 사용자 본문, 아니면 AI 초안. */
const segmentBody = (s: SegmentResponse): string =>
  (s.isEdited ? s.userContent : s.aiDraft) ?? '';

const diaryBody = (d: DiaryResponse): string =>
  (d.isEdited ? d.finalContent : d.aiDraft) ?? '';

const DateDetailScreen: React.FC<DateDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { scale } = useSettings();
  const { date } = route.params;

  const [diary, setDiary] = useState<DiaryResponse | null>(null);
  const [segments, setSegments] = useState<SegmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 카드 탭 시 본문 보기 + 액션 모달
  const [actionCard, setActionCard] = useState<CardItem | null>(null);
  // 인라인 수정 모달
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [editText, setEditText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const reload = useCallback(async () => {
    const ym = date.slice(0, 7);
    const list = await getDiariesByMonth(ym);
    const target = list.find(d => d.targetDate === date) ?? null;
    setDiary(target);
    if (target) {
      const segs = await getSegments(target.diaryId);
      setSegments(segs);
    } else {
      setSegments([]);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        try {
          await reload();
        } catch (e) {
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
    }, [reload]),
  );

  // 카드 리스트 — segment N개 + (final 완료된 경우) 마무리 카드 1개.
  // 정렬: createdAt(final은 updatedAt) 내림차순 — 가장 최근 일기가 맨 위.
  // final 작성 후 추가 segment가 있으면 그 추가 segment가 final보다 위에 올 수도 있음.
  const cards: CardItem[] = [
    ...segments.map<CardItem>(s => ({
      kind: 'segment',
      key: `seg-${s.segmentId}`,
      segment: s,
      moodEmoji: MOOD_INFO[s.moodSnapshot].emoji,
      content: segmentBody(s),
      time: formatTime(s.createdAt),
      isFinal: false,
    })),
    ...(diary && diary.status === 'COMPLETED'
      ? [
          {
            kind: 'final' as const,
            key: `final-${diary.diaryId}`,
            diary,
            moodEmoji: diary.finalMood ? MOOD_INFO[diary.finalMood].emoji : '🌙',
            content: diaryBody(diary),
            time: formatTime(diary.updatedAt),
            isFinal: true as const,
          },
        ]
      : []),
  ].sort((a, b) => {
    const ta = a.kind === 'segment' ? a.segment.createdAt : a.diary.updatedAt;
    const tb = b.kind === 'segment' ? b.segment.createdAt : b.diary.updatedAt;
    return tb.localeCompare(ta);
  });

  const handleEntryPress = (card: CardItem) => setActionCard(card);
  const closeActionSheet = () => setActionCard(null);

  const handlePickEdit = () => {
    const card = actionCard;
    if (!card) return;
    closeActionSheet();
    setEditingCard(card);
    setEditText(card.content);
  };

  const handlePickDelete = () => {
    const card = actionCard;
    if (!card) return;
    closeActionSheet();
    const message =
      card.kind === 'final'
        ? '마무리 일기를 삭제하면 그날의 모든 기록이 함께 사라져요.'
        : '한 번 삭제한 일기는 다시 되돌릴 수 없어요.';
    Alert.alert('일기를 삭제할까요?', message, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            if (card.kind === 'segment') {
              if (!diary) throw new Error('일기를 찾을 수 없어요.');
              await deleteSegment(diary.diaryId, card.segment.segmentId);
            } else {
              await deleteDiary(card.diary.diaryId);
            }
            await reload();
          } catch (e: any) {
            Alert.alert(
              '삭제 실패',
              e?.message ?? '알 수 없는 오류가 발생했어요.',
            );
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;
    const trimmed = editText.trim();
    if (!trimmed) {
      Alert.alert('내용이 비어있어요', '한 줄이라도 작성해주세요.');
      return;
    }
    setIsSavingEdit(true);
    try {
      if (editingCard.kind === 'segment') {
        if (!diary) throw new Error('일기를 찾을 수 없어요.');
        await updateSegment(diary.diaryId, editingCard.segment.segmentId, {
          userContent: trimmed,
        });
      } else {
        await updateDiary(editingCard.diary.diaryId, {
          finalContent: trimmed,
        });
      }
      await reload();
      setEditingCard(null);
      setEditText('');
    } catch (e: any) {
      Alert.alert('수정 실패', e?.message ?? '알 수 없는 오류가 발생했어요.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCard(null);
    setEditText('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backTouch}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.6}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(20) }]}>
          {formatKoreanDate(date)}
        </Text>
        <View style={styles.backTouch} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {cards.length > 0 ? (
            cards.map(card => (
              <TouchableOpacity
                key={card.key}
                style={[
                  styles.entryCard,
                  card.isFinal && styles.entryCardFinal,
                ]}
                activeOpacity={0.7}
                onPress={() => handleEntryPress(card)}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryMood}>{card.moodEmoji}</Text>
                  {card.isFinal && (
                    <View style={styles.finalBadge}>
                      <Text
                        style={[styles.finalBadgeText, { fontSize: scale(11) }]}
                      >
                        🌙 마무리 일기
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.entryTime, { fontSize: scale(13) }]}>
                    {card.time}
                  </Text>
                </View>
                <Text
                  style={[styles.entryContent, { fontSize: scale(14) }]}
                  numberOfLines={3}
                >
                  {card.content}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={[styles.emptyText, { fontSize: scale(14) }]}>
                이 날의 일기가 없어요
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* 카드 탭 — 일기 전체보기 + 수정/삭제/취소 */}
      <Modal
        visible={actionCard !== null}
        transparent
        animationType="slide"
        onRequestClose={closeActionSheet}
      >
        <View style={styles.actionBackdrop}>
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={closeActionSheet}
          />
          <View style={styles.viewerSheet}>
            <SafeAreaView edges={['bottom']} style={styles.viewerSafe}>
              <View style={styles.viewerHeader}>
                <Text style={[styles.viewerHeaderTitle, { fontSize: scale(15) }]}>
                  {formatKoreanDate(date)}
                </Text>
                <TouchableOpacity
                  onPress={closeActionSheet}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.viewerClose, { fontSize: scale(26) }]}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.viewerScroll}
                contentContainerStyle={styles.viewerScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.viewerMetaRow}>
                  <Text style={styles.viewerMood}>
                    {actionCard?.moodEmoji}
                  </Text>
                  {actionCard?.isFinal && (
                    <View style={styles.finalBadge}>
                      <Text
                        style={[styles.finalBadgeText, { fontSize: scale(11) }]}
                      >
                        🌙 마무리 일기
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.viewerTime, { fontSize: scale(13) }]}>
                    {actionCard?.time}
                  </Text>
                </View>
                <Text style={[styles.viewerContent, { fontSize: scale(15) }]}>
                  {actionCard?.content ?? ''}
                </Text>
              </ScrollView>

              <View style={styles.viewerFooter}>
                <TouchableOpacity
                  style={styles.actionItem}
                  activeOpacity={0.7}
                  onPress={handlePickEdit}
                >
                  <Text style={styles.actionItemEmoji}>✏️</Text>
                  <View style={styles.actionItemTextWrap}>
                    <Text style={[styles.actionItemTitle, { fontSize: scale(17) }]}>
                      내용 수정
                    </Text>
                    <Text style={[styles.actionItemDesc, { fontSize: scale(13) }]}>
                      일기 글을 다시 써요
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, styles.actionItemDanger]}
                  activeOpacity={0.7}
                  onPress={handlePickDelete}
                >
                  <Text style={styles.actionItemEmoji}>🗑️</Text>
                  <View style={styles.actionItemTextWrap}>
                    <Text
                      style={[
                        styles.actionItemTitle,
                        styles.actionItemDangerText,
                        { fontSize: scale(17) },
                      ]}
                    >
                      삭제하기
                    </Text>
                    <Text style={[styles.actionItemDesc, { fontSize: scale(13) }]}>
                      {actionCard?.isFinal
                        ? '그날 일기 전체가 사라져요'
                        : '되돌릴 수 없어요'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionItem, styles.actionItemCancel]}
                  activeOpacity={0.7}
                  onPress={closeActionSheet}
                >
                  <Text
                    style={[
                      styles.actionItemTitle,
                      styles.actionItemCancelText,
                      { fontSize: scale(16) },
                    ]}
                  >
                    취소
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* 일기 인라인 수정 모달 */}
      <Modal
        visible={editingCard !== null}
        animationType="slide"
        transparent
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.editBackdrop}>
          <View style={styles.editSheet}>
            <SafeAreaView edges={['bottom']} style={styles.editSafe}>
              <View style={styles.editHeader}>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.editHeaderBtn, { fontSize: scale(15) }]}>
                    취소
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.editHeaderTitle, { fontSize: scale(16) }]}>
                  일기 수정
                </Text>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={isSavingEdit}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.editHeaderBtn,
                      styles.editHeaderSave,
                      { fontSize: scale(15) },
                      isSavingEdit && { opacity: 0.5 },
                    ]}
                  >
                    {isSavingEdit ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView
                contentContainerStyle={styles.editScroll}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={20}
              >
                <TextInput
                  style={[styles.editInput, { fontSize: scale(15) }]}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  textAlignVertical="top"
                  placeholder="일기 내용을 적어주세요"
                  placeholderTextColor="#B5AFA8"
                  autoFocus
                />
              </KeyboardAwareScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
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
  headerTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  entryCardFinal: {
    backgroundColor: '#FFFCF5',
    borderLeftWidth: 4,
    borderLeftColor: '#2C2A28',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  entryMood: {
    fontSize: 22,
  },
  entryTime: {
    marginLeft: 'auto',
    color: '#A09B95',
    fontWeight: '500',
  },
  finalBadge: {
    backgroundColor: '#2C2A28',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  finalBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  entryContent: {
    color: '#3D3A37',
    lineHeight: 22,
  },
  emptyCard: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#A09B95',
  },

  // 본문 보기 시트
  actionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  viewerSheet: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    overflow: 'hidden',
  },
  viewerSafe: {
    flex: 1,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE3',
  },
  viewerHeaderTitle: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  viewerClose: {
    color: '#8A857F',
    fontWeight: '400',
    lineHeight: 28,
  },
  viewerScroll: {
    flex: 1,
  },
  viewerScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  viewerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  viewerMood: {
    fontSize: 26,
  },
  viewerTime: {
    marginLeft: 'auto',
    color: '#A09B95',
    fontWeight: '500',
  },
  viewerContent: {
    color: '#2C2A28',
    lineHeight: 26,
  },
  viewerFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE3',
    backgroundColor: '#FAF8F5',
  },
  actionItem: {
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
  actionItemDanger: {},
  actionItemCancel: {
    backgroundColor: '#F2EEE8',
    justifyContent: 'center',
    marginBottom: 0,
  },
  actionItemEmoji: {
    fontSize: 28,
  },
  actionItemTextWrap: {
    flex: 1,
  },
  actionItemTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    marginBottom: 2,
  },
  actionItemDangerText: {
    color: '#D9534F',
  },
  actionItemCancelText: {
    textAlign: 'center',
    color: '#3D3A37',
    fontWeight: '600',
    marginBottom: 0,
  },
  actionItemDesc: {
    color: '#8A857F',
  },

  // 인라인 수정 모달
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    overflow: 'hidden',
  },
  editSafe: {
    flex: 1,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE3',
  },
  editHeaderTitle: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  editHeaderBtn: {
    color: '#8A857F',
    fontWeight: '500',
  },
  editHeaderSave: {
    color: '#2C2A28',
    fontWeight: '700',
  },
  editScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  editInput: {
    minHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    color: '#2C2A28',
    lineHeight: 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
  },
});

export default DateDetailScreen;
