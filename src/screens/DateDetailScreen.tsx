import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../contexts/SettingsContext';
import {
  getDiariesByMonth,
  updateDiary,
  deleteDiary,
  deleteFinalDiary,
  type DiaryResponse,
} from '../api/diaries';
import {
  getSegments,
  updateSegment,
  deleteSegment,
  type SegmentResponse,
} from '../api/segments';
import { resolveImageUrl } from '../api/files';
import { MOOD_INFO } from '../constants/moods';
import PhotoViewerModal from '../components/PhotoViewerModal';
import type { DateDetailScreenProps } from '../navigation/AppNavigator';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
 *
 * `photos`는 카드에 표시할 사진 url들.
 *  - segment: 그 segment의 첨부 사진들
 *  - final:   그날 모든 segment의 사진을 순서대로 합친 것 (마무리 일기는 그날의 회상 carousel 역할)
 */
type CardItem =
  | {
      kind: 'segment';
      key: string;
      segment: SegmentResponse;
      moodEmoji: string;
      content: string;
      time: string;
      photos: string[];
      isFinal: false;
    }
  | {
      kind: 'final';
      key: string;
      diary: DiaryResponse;
      moodEmoji: string;
      content: string;
      time: string;
      photos: string[];
      isFinal: true;
    };

const collectSegmentPhotos = (s: SegmentResponse): string[] => {
  if (s.photos && s.photos.length > 0) {
    return s.photos.map(p => p.photoUrl);
  }
  // 레거시 호환 — photos가 비어있고 단일 photoUrl만 있는 경우
  return s.photoUrl ? [s.photoUrl] : [];
};

/** 표시 규칙: isEdited면 사용자 본문, 아니면 AI 초안. */
const segmentBody = (s: SegmentResponse): string =>
  (s.isEdited ? s.userContent : s.aiDraft) ?? '';

const diaryBody = (d: DiaryResponse): string =>
  (d.isEdited ? d.finalContent : d.aiDraft) ?? '';

/**
 * 한 덩어리로 저장된 옛 일기들도 화면에 보일 때 자동 문단 분리.
 * 연속된 \n도 한 번으로 정규화 (옛 \n\n 저장본 호환).
 */
const formatDisplayText = (text: string): string => {
  if (!text) return text;
  if (text.includes('\n')) {
    return text.replace(/\n{2,}/g, '\n');
  }
  return text.replace(/([.!?])\s+/g, '$1\n').trim();
};

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
  // 사진 전체보기 — 카드 사진 직접 탭 시 큰 화면 + 옆 스와이프
  const [photoViewer, setPhotoViewer] = useState<{
    photos: string[];
    startIndex: number;
  } | null>(null);

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

  // 그날 모든 segment의 사진을 stepOrder 오름차순으로 합친 url 배열.
  // 마무리 일기 카드/뷰어에서 그날 회상 carousel로 사용.
  const allDayPhotos: string[] = segments
    .slice()
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .flatMap(s => collectSegmentPhotos(s));

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
      photos: collectSegmentPhotos(s),
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
            // 마무리 일기는 그날 모든 segment 사진을 carousel로 회상.
            photos: allDayPhotos,
            isFinal: true as const,
          },
        ]
      : []),
  ].sort((a, b) => {
    // 마무리 일기는 무조건 상단 고정.
    if (a.isFinal && !b.isFinal) return -1;
    if (!a.isFinal && b.isFinal) return 1;
    // 같은 kind끼리는 시간 내림차순 (가장 최근이 위).
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
    // 본문 보기와 동일한 포맷팅을 편집 입력에도 적용 — 일반 일기처럼 한 덩어리로 저장된 텍스트도
    // 마침표/물음표/느낌표 단위로 줄바꿈된 상태로 편집되도록 한다.
    setEditText(formatDisplayText(card.content));
  };

  const handlePickDelete = () => {
    const card = actionCard;
    if (!card) return;
    closeActionSheet();
    const message =
      card.kind === 'final'
        ? '마무리 일기만 지워지고 그날의 다른 일기는 그대로 남아요.'
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
              // 마무리 일기만 reset — diary 컨테이너와 segments는 유지.
              await deleteFinalDiary(card.diary.diaryId);
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
          {cards.length > 0 && (
            <Text style={[styles.entryCount, { fontSize: scale(13) }]}>
              {cards.length}개의 일기를 작성했습니다
            </Text>
          )}
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
                  {card.isFinal ? (
                    <View style={styles.finalBadge}>
                      <Text
                        style={[styles.finalBadgeText, { fontSize: scale(11) }]}
                      >
                        🌙 마무리 일기
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.segmentBadge}>
                      <Text
                        style={[styles.segmentBadgeText, { fontSize: scale(11) }]}
                      >
                        {card.segment.stepOrder}번째 일기
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.entryTime, { fontSize: scale(13) }]}>
                    {card.time}
                  </Text>
                </View>
                {card.photos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cardPhotoStripContent}
                    style={styles.cardPhotoStrip}
                  >
                    {card.photos.map((url, idx) => (
                      <TouchableOpacity
                        key={`${card.key}-thumb-${idx}`}
                        activeOpacity={0.85}
                        onPress={() =>
                          setPhotoViewer({
                            photos: card.photos,
                            startIndex: idx,
                          })
                        }
                      >
                        <Image
                          source={{ uri: resolveImageUrl(url) }}
                          style={styles.cardPhotoThumb}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <Text
                  style={[
                    styles.entryContent,
                    { fontSize: scale(14), lineHeight: scale(24) },
                  ]}
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
                  <Text style={[styles.viewerClose, { fontSize: scale(26), lineHeight: scale(28) }]}>×</Text>
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
                  {actionCard?.isFinal ? (
                    <View style={styles.finalBadge}>
                      <Text
                        style={[styles.finalBadgeText, { fontSize: scale(11) }]}
                      >
                        🌙 마무리 일기
                      </Text>
                    </View>
                  ) : actionCard ? (
                    <View style={styles.segmentBadge}>
                      <Text
                        style={[styles.segmentBadgeText, { fontSize: scale(11) }]}
                      >
                        {actionCard.segment.stepOrder}번째 일기
                      </Text>
                    </View>
                  ) : null}
                  <Text style={[styles.viewerTime, { fontSize: scale(13) }]}>
                    {actionCard?.time}
                  </Text>
                </View>

                {actionCard && actionCard.photos.length > 0 && (
                  <View style={styles.carouselWrap}>
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                    >
                      {actionCard.photos.map((url, idx) => (
                        <TouchableOpacity
                          key={`viewer-${idx}`}
                          activeOpacity={0.85}
                          onPress={() =>
                            setPhotoViewer({
                              photos: actionCard.photos,
                              startIndex: idx,
                            })
                          }
                        >
                          <Image
                            source={{ uri: resolveImageUrl(url) }}
                            style={styles.carouselImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {actionCard.photos.length > 1 && (
                      <Text
                        style={[styles.carouselHint, { fontSize: scale(12) }]}
                      >
                        ← 옆으로 넘겨 보세요 ({actionCard.photos.length}장) →
                      </Text>
                    )}
                  </View>
                )}

                <Text
                  style={[
                    styles.viewerContent,
                    { fontSize: scale(15), lineHeight: scale(28) },
                  ]}
                >
                  {formatDisplayText(actionCard?.content ?? '')}
                </Text>
              </ScrollView>

              <View style={styles.viewerFooter}>
                <TouchableOpacity
                  style={styles.actionItem}
                  activeOpacity={0.7}
                  onPress={handlePickEdit}
                >
                  <Text style={styles.actionItemEmoji}>✏️</Text>
                  <Text style={[styles.actionItemTitle, { fontSize: scale(14) }]}>
                    수정
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionItem}
                  activeOpacity={0.7}
                  onPress={handlePickDelete}
                >
                  <Text style={styles.actionItemEmoji}>🗑️</Text>
                  <Text
                    style={[
                      styles.actionItemTitle,
                      styles.actionItemDangerText,
                      { fontSize: scale(14) },
                    ]}
                  >
                    삭제
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
                  style={[styles.editInput, { fontSize: scale(15), lineHeight: scale(24) }]}
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

      <PhotoViewerModal
        visible={photoViewer !== null}
        photos={photoViewer?.photos ?? []}
        startIndex={photoViewer?.startIndex ?? 0}
        onClose={() => setPhotoViewer(null)}
      />
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
  entryCount: {
    color: '#8A857F',
    marginBottom: 12,
    paddingHorizontal: 4,
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
  segmentBadge: {
    backgroundColor: '#EFEAE3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  segmentBadgeText: {
    color: '#3D3A37',
    fontWeight: '600',
  },
  entryContent: {
    color: '#3D3A37',
    lineHeight: 22,
  },
  cardPhotoStrip: {
    marginBottom: 10,
  },
  cardPhotoStripContent: {
    gap: 8,
    paddingRight: 4,
  },
  cardPhotoThumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: '#EFEAE3',
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
  carouselWrap: {
    marginBottom: 18,
    marginHorizontal: -20, // viewerScrollContent 좌우 padding 상쇄해서 화면 가득 차게
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 240,
    backgroundColor: '#EFEAE3',
  },
  carouselHint: {
    marginTop: 8,
    color: '#A09B95',
    textAlign: 'center',
  },
  viewerFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE3',
    backgroundColor: '#FAF8F5',
  },
  actionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  actionItemEmoji: {
    fontSize: 16,
  },
  actionItemTitle: {
    fontWeight: '600',
    color: '#2C2A28',
  },
  actionItemDangerText: {
    color: '#D9534F',
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
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
  },

  // 사진 전체보기 모달
  photoViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerCloseText: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 36,
    fontWeight: '300',
  },
  photoViewerPage: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  photoViewerHint: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 13,
  },
});

export default DateDetailScreen;
