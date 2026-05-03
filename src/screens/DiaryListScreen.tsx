import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSettings } from '../contexts/SettingsContext';
import { getAllDiaries, type DiaryEntry } from '../storage/diaryStorage';
import YearMonthPicker from '../components/YearMonthPicker';

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

/**
 * ISO 문자열 → 'YYYY-MM-DD' (로컬 타임존 기준).
 * `iso.slice(0, 10)`을 쓰면 UTC 기준이라 한국에서 자정~오전에 작성한 일기가 전날로 잡힘.
 * 캘린더가 보여주는 셀(`day.dateString`)은 로컬 날짜이므로 여기도 로컬로 맞춤.
 */
const toDateKey = (iso: string): string => {
  const d = new Date(iso);
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
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        try {
          const list = await getAllDiaries();
          if (!cancelled) setEntries(list);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const markedDates = useMemo(() => {
    const map: Record<string, MarkedDateInfo> = {};

    entries.forEach(entry => {
      const dateKey = toDateKey(entry.createdAt);
      map[dateKey] = {
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
  }, [entries, selectedDate]);

  const selectedEntries = useMemo(
    () => entries.filter(entry => toDateKey(entry.createdAt) === selectedDate),
    [entries, selectedDate],
  );

  // 이전 달 / 다음 달 이동
  const goToPrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setCurrentMonth(prev.toISOString().slice(0, 10));
  };

  const goToNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setCurrentMonth(next.toISOString().slice(0, 10));
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
            {/* 커스텀 헤더 — 양 끝 ◀ ▶ + 가운데 클릭 가능한 년월 */}
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

            {selectedEntries.length > 0 ? (
              selectedEntries.map(entry => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    {entry.mood && (
                      <Text style={styles.entryMood}>{entry.mood.emoji}</Text>
                    )}
                  </View>
                  <Text
                    style={[styles.entryContent, { fontSize: scale(14) }]}
                    numberOfLines={3}
                  >
                    {entry.content}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={[styles.emptyText, { fontSize: scale(14) }]}>
                  이 날의 일기가 없어요
                </Text>
              </View>
            )}
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