import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import type { SettingsStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

const SettingsScreen: React.FC = () => {
  const { userEmail, userName, userCreatedAt, logout } = useAuth();
  const { scale } = useSettings();
  const navigation = useNavigation<NavigationProp>();

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

  const displayName = userName || '사용자';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: scale(28) }]}>설정</Text>
      </View>

      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Icon name="person" size={36} color="#FFFFFF" />
        </View>
        <Text style={[styles.profileName, { fontSize: scale(22) }]}>{displayName}</Text>
        <Text style={[styles.profileEmail, { fontSize: scale(14) }]}>{userEmail || '-'}</Text>
      </View>

      {/* 계정 섹션 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontSize: scale(13) }]}>계정</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('ProfileEdit')}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionLabel, { fontSize: scale(15) }]}>프로필 수정</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 환경설정 섹션 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontSize: scale(13) }]}>환경설정</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('FontSize')}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionLabel, { fontSize: scale(15) }]}>글씨 크기</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 기타 섹션 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { fontSize: scale(13) }]}>기타</Text>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { fontSize: scale(15) }]}>가입일시</Text>
          <Text style={[styles.rowValue, { fontSize: scale(15) }]}>{userCreatedAt || '-'}</Text>
        </View>

        <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={[styles.logoutText, { fontSize: scale(15) }]}>로그아웃</Text>
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
    fontWeight: '700',
    color: '#2C2A28',
  },
  profileCard: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2C2A28',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  profileName: {
    fontWeight: '700',
    color: '#2C2A28',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  profileEmail: {
    color: '#8A857F',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  sectionLabel: {
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
    color: '#3D3A37',
  },
  rowValue: {
    color: '#8A857F',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 8,
  },
  actionLabel: {
    color: '#3D3A37',
    fontWeight: '500',
  },
  actionArrow: {
    fontSize: 20,
    color: '#A09B95',
    fontWeight: '300',
  },
  logoutText: {
    color: '#D9534F',
    fontWeight: '600',
  },
});

export default SettingsScreen;