import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';

const DiaryListScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader />
      <View style={styles.content}>
        <Text style={styles.placeholder}>캘린더 / 리스트 모드가 들어올 자리</Text>
        <Text style={styles.placeholderSub}>(월간 캘린더 + 일간 리스트 전환)</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholder: {
    fontSize: 16,
    color: '#3D3A37',
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 13,
    color: '#8A857F',
    textAlign: 'center',
  },
});

export default DiaryListScreen;