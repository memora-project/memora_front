import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';

const ReportScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AppHeader />
      <View style={styles.content}>
        <Text style={styles.placeholder}>주간/월간 기분 그래프가 들어올 자리</Text>
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
    fontSize: 14,
    color: '#8A857F',
    textAlign: 'center',
  },
});

export default ReportScreen;