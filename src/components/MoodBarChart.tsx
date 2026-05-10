import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useSettings } from '../contexts/SettingsContext';
import { MOOD_INFO, MOOD_ORDER, type MoodType } from '../constants/moods';

type MoodDistribution = {
  type: MoodType;
  count: number;
  percent: number;
};

type Props = {
  data: MoodDistribution[];
};

const MoodBarChart: React.FC<Props> = ({ data }) => {
  const { scale } = useSettings();

  // MOOD_ORDER 순서대로 정렬 (긍정 → 부정)
  const sorted = MOOD_ORDER.map(
    type => data.find(d => d.type === type) || { type, count: 0, percent: 0 },
  );

  return (
    <View style={styles.container}>
      {sorted.map(item => {
        const info = MOOD_INFO[item.type];
        const isEmpty = item.percent === 0;

        return (
          <View key={item.type} style={styles.row}>
            {/* 왼쪽: 이모지만 */}
            <View style={styles.labelArea}>
              <Text style={styles.emoji}>{info.emoji}</Text>
            </View>

            {/* 가운데: 막대 */}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(item.percent, 0)}%`,
                    backgroundColor: info.color,
                  },
                  isEmpty && styles.barEmpty,
                ]}
              />
            </View>

            {/* 오른쪽: 퍼센트 */}
            <Text
              style={[
                styles.percent,
                isEmpty && styles.percentEmpty,
                { fontSize: scale(13) },
              ]}
            >
              {item.percent}%
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 10,
  },
  labelArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  emoji: {
    fontSize: 22,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: '#F2EEE8',
    borderRadius: 7,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
    minWidth: 4, // 0%여도 살짝 보이게 (안 보이면 어색함)
  },
  barEmpty: {
    minWidth: 0,
  },
  percent: {
    width: 52,
    textAlign: 'right',
    color: '#3D3A37',
    fontWeight: '600',
    flexShrink: 0,
  },
  percentEmpty: {
    color: '#A09B95',
    fontWeight: '400',
  },
});

export default MoodBarChart;