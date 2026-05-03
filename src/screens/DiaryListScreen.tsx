import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  type CompositeNavigationProp,
} from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSettings } from '../contexts/SettingsContext';
import { getDiariesByMonth, type DiaryResponse } from '../api/diaries';
import { MOOD_INFO } from '../constants/moods';
import YearMonthPicker from '../components/YearMonthPicker';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  RootTabParamList,
  DiaryStackParamList,
} from '../navigation/AppNavigator';

// DiaryListScreen은 하단 Tab navigator에 속하지만, Detail 화면은 Home 탭 안의
// DiaryStack에 있다. 두 navigator를 가로질러 navigate 하려면 CompositeNavigationProp 필요.
type DiaryListNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'DiaryList'>,
  NativeStackNavigationProp<DiaryStackParamList>
>;

LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

type MarkedDateInfo = {
  marked?: boolean;
  dotColor?: string;
  selected?: boolean;
  selectedColor?: string;
};

const todayString = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatKoreanDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${month}월 ${day}일 (${dayNames[date.getDay()]})`;
};

const formatYearMonth = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월`;
};

const DiaryListScreen: React.FC = () => {
  const { scale } = useSettings();
  const navigation = useNavigation<DiaryListNavigationProp>();

  const [diaries, setDiaries] = useState<DiaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayString);
  // currentMonth는 'YYYY-MM-DD' 형식 (Calendar 라이브러리가 그렇게 받음)
  const [currentMonth, setCurrentMonth] = useState<string>(todayString);
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);

  // currentMonth가 바뀔 때마다 그 달의 일기 fetch
  // ('YYYY-MM-DD' → 'YYYY-MM' 추출해서 백엔드에 전달)
  const fetchMonth = useCallback(async (monthDateStr: string) => {
    const ym = monthDateStr.slice(0, 7); // 'YYYY-MM'
    setIsLoading(true);
    try {
      const list = await getDiariesByMonth(ym);
      setDiaries(list);
    } catch (e) {
      console.warn('월별 일기 조회 실패:', e);
      setDiaries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 화면 포커스 + 월 변경 시 재조회
  useFocusEffect(
    useCallback(() => {
      fetchMonth(currentMonth);
    }, [currentMonth, fetchMonth]),
  );

  // 월 변경 시에도 fetch (포커스 안 잃은 상태에서 prev/next 누른 경우)
  useEffect(() => {
    fetchMonth(currentMonth);
  }, [currentMonth, fetchMonth]);

  const markedDates = useMemo(() => {
    const map: Record<string, MarkedDateInfo> = {};

    diaries.forEach(diary => {
      map[diary.targetDate] = {
        marked: true,
        dotColor: '#2C2A28',
      };
    });

    if (selectedDate) {
      map[selectedDate] = {
        ...(map[selectedDate] || {}),
        selected: true,
        selectedColor: '#2C2A28',
      };
    }

    return map;
  }, [diaries, selectedDate]);

  const selectedDiaries = useMemo(
    () => diaries.filter(d => d.targetDate === selectedDate),
    [diaries, selectedDate],
  );

  // 이전 달 / 다음 달 이동
  const goToPrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setCurrentMonth(
      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`,
    );
  };

  const goToNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setCurrentMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
    );
  };

  // 년/월 직접 선택 (모달에서)
  const handleYearMonthSelect = (newDate: string) => {
    setCurrentMonth(newDate);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: scale(28) }]}>일기 목록</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      ) : (
        <View style={styles.content}>
          {/* 캘린더 */}
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={goToPrevMonth}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.6}
              >
                <Text style={[styles.arrow, { fontSize: scale(22) }]}>◀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setYearMonthPickerVisible(true)}
                hitSlop={{ top: 8, bottom: 8 }}
                activeOpacity={0.6}
                style={styles.titleBtn}
              >
                <Text style={[styles.calendarTitle, { fontSize: scale(18) }]}>
                  {formatYearMonth(currentMonth)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.arrowBtn}
                onPress={goToNextMonth}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.6}
              >
                <Text style={[styles.arrow, { fontSize: scale(22) }]}>▶</Text>
              </TouchableOpacity>
            </View>

            <Calendar
              key={currentMonth}
              current={currentMonth}
              hideArrows={true}
              renderHeader={() => null}
              markedDates={markedDates}
              onDayPress={day => setSelectedDate(day.dateString)}
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#8A857F',
                selectedDayBackgroundColor: '#2C2A28',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#2C2A28',
                dayTextColor: '#2C2A28',
                textDisabledColor: '#D6D2CC',
                dotColor: '#2C2A28',
                selectedDotColor: '#FFFFFF',
                textDayFontSize: scale(14),
                textDayHeaderFontSize: scale(12),
                'stylesheet.day.basic': {
                  base: {
                    width: scale(32),
                    height: scale(32),
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  selected: {
                    borderRadius: scale(16),
                  },
                  today: {
                    borderRadius: scale(16),
                  },
                },
              }}
            />
          </View>

          {/* 선택된 날짜의 일기 */}
          <View style={styles.selectedSection}>
            <Text style={[styles.selectedDateLabel, { fontSize: scale(14) }]}>
              {formatKoreanDate(selectedDate)}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.selectedScroll}
            >
              {selectedDiaries.length > 0 ? (
                selectedDiaries.map(diary => {
                  const moodInfo = diary.finalMood
                    ? MOOD_INFO[diary.finalMood]
                    : null;
                  const preview =
                    diary.finalContent ??
                    diary.aiDraft ??
                    '(아직 작성 중인 일기예요)';
                  return (
                    <TouchableOpacity
                      key={diary.diaryId}
                      style={styles.entryCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        // Tab → Stack 중첩 navigation. Home 탭의 DiaryStack 안 Detail로.
                        navigation.navigate('Home', {
                          screen: 'Detail',
                          params: { diaryId: diary.diaryId },
                        })
                      }
                    >
                      <View style={styles.entryHeader}>
                        {moodInfo && (
                          <Text style={styles.entryMood}>{moodInfo.emoji}</Text>
                        )}
                      </View>
                      <Text
                        style={[styles.entryContent, { fontSize: scale(14) }]}
                        numberOfLines={3}
                      >
                        {preview}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={[styles.emptyText, { fontSize: scale(14) }]}>
                    이 날의 일기가 없어요
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* 년/월 선택 모달 */}
      <YearMonthPicker
        visible={yearMonthPickerVisible}
        currentDate={currentMonth}
        onClose={() => setYearMonthPickerVisible(false)}
        onSelect={handleYearMonthSelect}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  arrowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrow: {
    color: '#2C2A28',
    fontWeight: '600',
  },
  titleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  calendarTitle: {
    color: '#2C2A28',
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedSection: {
    flex: 1,
    paddingHorizontal: 8,
  },
  selectedScroll: {
    paddingBottom: 24,
  },
  selectedDateLabel: {
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 10,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  entryMood: {
    fontSize: 22,
  },
  entryContent: {
    color: '#3D3A37',
    lineHeight: 22,
  },
  emptyCard: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    color: '#A09B95',
  },
});

export default DiaryListScreen;
