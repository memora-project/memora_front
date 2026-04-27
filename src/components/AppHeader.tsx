import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AppHeader: React.FC = () => {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.headerTitle}>Memora</Text>
      <Text style={styles.headerSubtitle}>오늘의 마음을 기록해 보세요</Text>
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
    fontSize: 32,
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#8A857F',
  },
});

export default AppHeader;