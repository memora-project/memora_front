import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useSettings } from '../contexts/SettingsContext';

const AppHeader: React.FC = () => {
  const { scale } = useSettings();

  return (
    <View style={styles.headerWrap}>
      <Text style={[styles.headerTitle, { fontSize: scale(32) }]}>Memora</Text>
      <Text style={[styles.headerSubtitle, { fontSize: scale(14) }]}>
        오늘의 마음을 기록해 보세요
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 6,
    color: '#8A857F',
  },
});

export default AppHeader;