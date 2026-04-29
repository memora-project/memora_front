import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../contexts/SettingsContext';

const DiaryListScreen: React.FC = () => {
  const { scale } = useSettings();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: scale(28) }]}>일기 목록</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.placeholder, { fontSize: scale(16) }]}>
          캘린더 / 리스트 모드가 들어올 자리
        </Text>
        <Text style={[styles.placeholderSub, { fontSize: scale(13) }]}>
          (월간 캘린더 + 일간 리스트 전환)
        </Text>
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholder: {
    color: '#3D3A37',
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderSub: {
    color: '#8A857F',
    textAlign: 'center',
  },
});

export default DiaryListScreen;