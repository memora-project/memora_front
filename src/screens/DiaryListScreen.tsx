import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useSettings } from '../contexts/SettingsContext';
import { getDiariesByMonth, type DiaryResponse } from '../api/diaries';
import { getSegments } from '../api/segments';
import YearMonthPicker from '../components/YearMonthPicker';
import type { DiaryListMainScreenProps } from '../navigation/AppNavigator';

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
};

const formatYearMonth = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월`;
};

const DiaryListScreen: React.FC<DiaryListMainScreenProps> = ({ navigation }) => {
  const { scale } = useSettings();
  const [diaries, setDiaries] = useState<DiaryResponse[]>([]);
  // targetDate -> 그날 일기에 실제 작성된 내용(segment 또는 final)이 있는지.
  // 자동 생성된 빈 컨테이너에는 점 안 뜨게 하기 위함.
  const [hasContentMap, setHasContentMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [yearMonthPickerVisible, setYearMonthPickerVisible] = useState(false);

  // currentMonth가 바뀌거나 화면 focus되면 그 달치 일기 fetch.
  // 달 전환은 즉시 반영하고 데이터만 백그라운드에서 로드.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const ym = currentMonth.slice(0, 7); // 'YYYY-MM'
          const list = await getDiariesByMonth(ym);
          if (cancelled) return;
          setDiaries(list);

          // 각 일기에 실제 콘텐츠(segment 또는 final)가 있는지 병렬 조회.
          // 빈 자동 생성 컨테이너는 점 안 뜨게 하기 위함.
          const checks = await Promise.all(
            list.map(async d => {
              if (d.finalContent || d.status === 'COMPLETED') {
                return [d.targetDate, true] as const;
              }
              try {
                const segs = await getSegments(d.diaryId);
                return [d.targetDate, segs.length > 0] as const;
              } catch {
                return [d.targetDate, false] as const;
              }
            }),
          );
          if (cancelled) return;
          const map: Record<string, boolean> = {};
          checks.forEach(([date, has]) => {
            map[date] = has;
          });
          setHasContentMap(map);
        } catch (e) {
          if (!cancelled) {
            setDiaries([]);
            setHasContentMap({});
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [currentMonth]),
  );

  const markedDates = useMemo(() => {
    const map: Record<string, MarkedDateInfo> = {};
    diaries.forEach(d => {
      // 실제 작성된 일기(segment 또는 final 있음)만 마킹.
      // 자동 생성된 빈 컨테이너는 hasContentMap에서 false라 제외됨.
      if (hasContentMap[d.targetDate]) {
        map[d.targetDate] = {
          marked: true,
          dotColor: '#2C2A28',
        };
      }
    });
    return map;
  }, [diaries, hasContentMap]);

  const goToPrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prev = m - 1 < 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
    setCurrentMonth(prev);
  };

  const goToNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    // 현재 달까지만 이동 가능
    if (y > currentYear || (y === currentYear && m >= currentMonthNum)) return;
    const next = m + 1 > 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    setCurrentMonth(next);
  };

  const handleYearMonthSelect = (newDate: string) => {
    setCurrentMonth(newDate);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: scale(28) }]}>일기 목록</Text>
        <Text style={[styles.headerHint, { fontSize: scale(13) }]}>
          날짜를 선택하면 그 날의 일기를 볼 수 있어요
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      ) : (
        <View style={styles.content}>
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
                <Text style={[styles.calendarTitle, { fontSize: scale(20) }]}>
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
              key={currentMonth.slice(0, 7)}
              current={currentMonth}
              hideArrows={true}
              renderHeader={() => null}
              markedDates={markedDates}
              onDayPress={day =>
                navigation.navigate('DateDetail', { date: day.dateString })
              }
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#8A857F',
                todayTextColor: '#2C2A28',
                dayTextColor: '#2C2A28',
                textDisabledColor: '#D6D2CC',
                dotColor: '#2C2A28',
                textDayFontSize: scale(16),
                textDayHeaderFontSize: scale(13),
                'stylesheet.day.basic': {
                  base: {
                    width: scale(40),
                    height: scale(40),
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  today: {
                    borderRadius: scale(20),
                  },
                },
                // 'stylesheet.day.basic'은 react-native-calendars 타입 정의에 빠져있어 단언으로 통과
              } as Parameters<typeof Calendar>[0]['theme']}
            />
          </View>
        </View>
      )}

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
  headerHint: {
    marginTop: 4,
    color: '#8A857F',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    paddingBottom: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
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
});

export default DiaryListScreen;
