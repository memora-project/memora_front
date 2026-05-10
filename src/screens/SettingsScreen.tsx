import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import type { SettingsStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'SettingsMain'>;

const formatCreatedAt = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const SettingsScreen: React.FC = () => {
  const {
    userEmail,
    userName,
    userCreatedAt,
    userEmergencyContact,
    updateEmergencyContact,
    logout,
  } = useAuth();
  const { scale } = useSettings();
  const navigation = useNavigation<NavigationProp>();

  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [emergencyDraft, setEmergencyDraft] = useState('');
  const [savingEmergency, setSavingEmergency] = useState(false);

  const openEmergencyModal = () => {
    setEmergencyDraft(userEmergencyContact ?? '');
    setEmergencyModalVisible(true);
  };

  const handleSaveEmergency = async () => {
    const trimmed = emergencyDraft.trim();
    setSavingEmergency(true);
    try {
      await updateEmergencyContact(trimmed);
      setEmergencyModalVisible(false);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '비상 연락처를 저장하지 못했어요.');
    } finally {
      setSavingEmergency(false);
    }
  };

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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('GrandchildPhoto')}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { fontSize: scale(15) }]}>손주 얼굴 설정</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 기타 섹션 */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scale(13) }]}>기타</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={openEmergencyModal}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { fontSize: scale(15) }]}>비상 연락처</Text>
            <View style={styles.actionRight}>
              <Text style={[styles.rowValue, { fontSize: scale(15) }]}>
                {userEmergencyContact || '등록하기'}
              </Text>
              <Text style={styles.actionArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { fontSize: scale(15) }]}>가입일시</Text>
            <Text style={[styles.rowValue, { fontSize: scale(15) }]}>
              {formatCreatedAt(userCreatedAt)}
            </Text>
          </View>

          <TouchableOpacity style={styles.actionRow} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={[styles.logoutText, { fontSize: scale(15) }]}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 비상 연락처 수정 모달 */}
      <Modal
        visible={emergencyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmergencyModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <SafeAreaView edges={['bottom']} style={styles.modalSafe}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setEmergencyModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.modalHeaderBtn, { fontSize: scale(15) }]}>취소</Text>
                </TouchableOpacity>
                <Text style={[styles.modalHeaderTitle, { fontSize: scale(16) }]}>
                  비상 연락처
                </Text>
                <TouchableOpacity
                  onPress={handleSaveEmergency}
                  disabled={savingEmergency}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.modalHeaderBtn,
                      styles.modalHeaderSave,
                      { fontSize: scale(15) },
                      savingEmergency && { opacity: 0.5 },
                    ]}
                  >
                    {savingEmergency ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView
                contentContainerStyle={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={20}
              >
                <Text style={[styles.modalHelper, { fontSize: scale(13) }]}>
                  장시간 활동이 감지되지 않을 경우 연락이 갑니다.
                </Text>
                <TextInput
                  style={[styles.modalInput, { fontSize: scale(17) }]}
                  value={emergencyDraft}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^0-9]/g, '').slice(0, 11);
                    let formatted = digits;
                    if (digits.length > 7) {
                      formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
                    } else if (digits.length > 3) {
                      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                    }
                    setEmergencyDraft(formatted);
                  }}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#B5AFA8"
                  keyboardType="phone-pad"
                  autoFocus
                />
              </KeyboardAwareScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
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
  scroll: {
    paddingBottom: 32,
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
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#D9534F',
    fontWeight: '600',
  },

  // 비상 연락처 수정 모달
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    height: '60%',
  },
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE3',
  },
  modalHeaderTitle: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  modalHeaderBtn: {
    color: '#8A857F',
    fontWeight: '500',
  },
  modalHeaderSave: {
    color: '#2C2A28',
    fontWeight: '700',
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  modalHelper: {
    color: '#A09B95',
    lineHeight: 18,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    color: '#2C2A28',
    minHeight: 52,
  },
});

export default SettingsScreen;