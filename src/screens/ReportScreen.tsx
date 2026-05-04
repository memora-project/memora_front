import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../contexts/SettingsContext';
import {
  getWeeklyReport,
  getMonthlyReport,
  type ReportResponse,
} from '../api/reports';
import { MOOD_INFO, MOOD_ORDER, type MoodType } from '../constants/moods';
import MoodBarChart from '../components/MoodBarChart';

type Period = 'weekly' | 'monthly';

type MoodDistributionRow = {
  type: MoodType;
  count: number;
  percent: number;
};

/** 백엔드 Map<String, Long> → 차트 컴포넌트가 받는 배열 + percent 계산. */
const toDistributionRows = (
  raw: Record<string, number>,
): MoodDistributionRow[] => {
  const total = MOOD_ORDER.reduce((sum, key) => sum + (raw[key] ?? 0), 0);
  return MOOD_ORDER.map(type => {
    const count = raw[type] ?? 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { type, count, percent };
  });
};

const formatDateRange = (start: string, end: string): string => {
  const [, sm, sd] = start.split('-');
  const [, em, ed] = end.split('-');
  return `${parseInt(sm, 10)}월 ${parseInt(sd, 10)}일 ~ ${parseInt(em, 10)}월 ${parseInt(ed, 10)}일`;
};

const ReportScreen: React.FC = () => {
  const { scale } = useSettings();
  const [period, setPeriod] = useState<Period>('weekly');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // period 변경 또는 화면 focus 시 다시 로드.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
          const data =
            period === 'weekly'
              ? await getWeeklyReport()
              : await getMonthlyReport();
          if (!cancelled) setReport(data);
        } catch (e: any) {
          if (!cancelled) {
            setReport(null);
            setErrorMessage(e?.message ?? '리포트를 불러오지 못했습니다.');
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [period]),
  );

  const distribution = useMemo(
    () => (report ? toDistributionRows(report.moodDistribution) : []),
    [report],
  );

  const mostFrequentInfo =
    report && report.mostFrequentMood ? MOOD_INFO[report.mostFrequentMood] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: scale(28) }]}>사용자 분석</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 기간 토글 */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, period === 'weekly' && styles.toggleBtnActive]}
            onPress={() => setPeriod('weekly')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                period === 'weekly' && styles.toggleTextActive,
                { fontSize: scale(15) },
              ]}
            >
              주간
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, period === 'monthly' && styles.toggleBtnActive]}
            onPress={() => setPeriod('monthly')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.toggleText,
                period === 'monthly' && styles.toggleTextActive,
                { fontSize: scale(15) },
              ]}
            >
              월간
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#2C2A28" />
          </View>
        ) : errorMessage ? (
          <View style={styles.placeholderCard}>
            <Text style={[styles.placeholderText, { fontSize: scale(14) }]}>
              {errorMessage}
            </Text>
          </View>
        ) : report ? (
          <>
            {/* 기간 라벨 */}
            <Text style={[styles.dateRange, { fontSize: scale(13) }]}>
              {formatDateRange(report.startDate, report.endDate)}
            </Text>

            {/* 요약 카드 */}
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryLabel, { fontSize: scale(13) }]}>
                가장 자주 느낀 감정
              </Text>
              {mostFrequentInfo ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryEmoji}>{mostFrequentInfo.emoji}</Text>
                  <Text style={[styles.summaryMood, { fontSize: scale(22) }]}>
                    {mostFrequentInfo.label}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.summaryEmptyText, { fontSize: scale(15) }]}>
                  아직 마무리한 일기가 없어요
                </Text>
              )}
              <Text style={[styles.summarySub, { fontSize: scale(13) }]}>
                총 {report.totalDiaries}개의 일기를 작성하셨어요
              </Text>
            </View>

            {/* 기분 분포 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: scale(17) }]}>
                기분 분포
              </Text>
              <View style={styles.chartCard}>
                <MoodBarChart data={distribution} />
              </View>
            </View>

            {/* AI 요약 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { fontSize: scale(17) }]}>
                AI 분석
              </Text>
              <View style={styles.aiCard}>
                <Text style={[styles.aiSummary, { fontSize: scale(14) }]}>
                  {report.aiAnalysisSummary && report.aiAnalysisSummary.length > 0
                    ? report.aiAnalysisSummary
                    : '아직 분석할 데이터가 충분하지 않아요. 일기를 더 작성해 주세요.'}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // 기간 토글
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFEAE3',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    color: '#8A857F',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#2C2A28',
    fontWeight: '700',
  },

  dateRange: {
    color: '#8A857F',
    textAlign: 'center',
    marginBottom: 16,
  },

  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 요약 카드
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryLabel: {
    color: '#8A857F',
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  summaryEmoji: {
    fontSize: 36,
  },
  summaryMood: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  summaryEmptyText: {
    color: '#A09B95',
    fontWeight: '500',
    marginBottom: 8,
  },
  summarySub: {
    color: '#8A857F',
  },

  // 섹션
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  placeholderText: {
    color: '#A09B95',
    textAlign: 'center',
    lineHeight: 20,
  },

  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  aiSummary: {
    color: '#3D3A37',
    lineHeight: 22,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
});

export default ReportScreen;
