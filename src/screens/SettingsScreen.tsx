import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

const SettingsScreen: React.FC = () => {
  const { userEmail, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('오류', '로그아웃 처리 중 문제가 발생했습니다.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>계정</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>이메일</Text>
          <Text style={styles.rowValue}>{userEmail || '-'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>기타</Text>
        <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2A28',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A09B95',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 15,
    color: '#3D3A37',
  },
  rowValue: {
    fontSize: 15,
    color: '#8A857F',
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 15,
    color: '#D9534F',
    fontWeight: '600',
  },
});

export default SettingsScreen;