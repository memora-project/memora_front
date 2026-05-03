import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../contexts/SettingsContext';
import { getDummyWeeklyReport, getDummyMonthlyReport } from '../utils/reportDummyData';
import { MOOD_INFO } from '../constants/moods';
import MoodBarChart from '../components/MoodBarChart';

type Period = 'weekly' | 'monthly';

const ReportScreen: React.FC = () => {
  const { scale } = useSettings();
  const [period, setPeriod] = useState<Period>('weekly');

  const reportData = useMemo(
    () => (period === 'weekly' ? getDummyWeeklyReport() : getDummyMonthlyReport()),
    [period],
  );

  const formatDateRange = (start: string, end: string): string => {
    const [, sm, sd] = start.split('-');
    const [, em, ed] = end.split('-');
    return `${parseInt(sm, 10)}월 ${parseInt(sd, 10)}일 ~ ${parseInt(em, 10)}월 ${parseInt(ed, 10)}일`;
  };

  const mostFrequent = MOOD_INFO[reportData.mostFrequentMood];

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

        {/* 기간 라벨 */}
        <Text style={[styles.dateRange, { fontSize: scale(13) }]}>
          {formatDateRange(reportData.startDate, reportData.endDate)}
        </Text>

        {/* 요약 카드 */}
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { fontSize: scale(13) }]}>
            가장 자주 느낀 마음
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryEmoji}>{mostFrequent.emoji}</Text>
            <Text style={[styles.summaryMood, { fontSize: scale(22) }]}>
              {mostFrequent.label}
            </Text>
          </View>
          <Text style={[styles.summarySub, { fontSize: scale(13) }]}>
            총 {reportData.totalEntries}일의 일기를 작성하셨어요
          </Text>
        </View>

        {/* 기분 분포 */}
        <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: scale(17) }]}>기분 분포</Text>
        <View style={styles.chartCard}>
            <MoodBarChart data={reportData.moodDistribution} />
        </View>
        </View>

        {/* 활동 점수 (STEP 5에서 디자인) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scale(17) }]}>활동 점수</Text>
          <View style={styles.placeholderCard}>
            <Text style={[styles.scoreText, { fontSize: scale(36) }]}>
              {reportData.activityScore}
              <Text style={{ fontSize: scale(20), color: '#A09B95' }}> / 100</Text>
            </Text>
          </View>
        </View>

        {/* AI 요약 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scale(17) }]}>AI 분석</Text>
          <View style={styles.aiCard}>
            <Text style={[styles.aiSummary, { fontSize: scale(14) }]}>
              {reportData.aiSummary}
            </Text>
          </View>
        </View>
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
  },

  scoreText: {
    fontWeight: '700',
    color: '#2C2A28',
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