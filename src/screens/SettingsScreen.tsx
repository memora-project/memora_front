import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import type { SettingsStackParamList } from '../navigation/AppNavigator';
import { getSettings, updateSettings } from '../api/settings';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0'),
);
// 분은 5분 단위 — 어르신이 휠 너무 길면 어렵다.
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0'),
);

/** "23:00" 또는 "23:00:00" → { hour, minute } 안전 파싱. */
const parseHHmm = (s: string | null | undefined): { hour: string; minute: string } => {
  if (!s) return { hour: '00', minute: '00' };
  const [h = '00', m = '00'] = s.split(':');
  return { hour: h.padStart(2, '0'), minute: m.padStart(2, '0') };
};

/** "00" → "자정", "12" → "정오", 그 외 "오전/오후 N시" 형식. */
const formatTimeLabel = (hhmm: string | null | undefined): string => {
  if (!hhmm) return '자정 (00:00)';
  const { hour, minute } = parseHHmm(hhmm);
  return `${hour}:${minute}`;
};

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

  // 자동 일기 완료 시간 — 백엔드 자정 스케줄러가 이 시각에 IN_PROGRESS → COMPLETED
  const [autoCompleteTime, setAutoCompleteTime] = useState<string>('00:00');
  const [autoTimeModalVisible, setAutoTimeModalVisible] = useState(false);
  const [autoTimeDraft, setAutoTimeDraft] = useState<{ hour: string; minute: string }>({
    hour: '00',
    minute: '00',
  });
  const [savingAutoTime, setSavingAutoTime] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSettings();
        if (cancelled) return;
        if (data.autoCompleteTime) {
          const { hour, minute } = parseHHmm(data.autoCompleteTime);
          setAutoCompleteTime(`${hour}:${minute}`);
        }
      } catch (e) {
        console.warn('[Settings] 초기 로딩 실패:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAutoTimeModal = () => {
    setAutoTimeDraft(parseHHmm(autoCompleteTime));
    setAutoTimeModalVisible(true);
  };

  const handleSaveAutoTime = async () => {
    const next = `${autoTimeDraft.hour}:${autoTimeDraft.minute}`;
    setSavingAutoTime(true);
    try {
      const data = await updateSettings({ autoCompleteTime: next });
      if (data.autoCompleteTime) {
        const { hour, minute } = parseHHmm(data.autoCompleteTime);
        setAutoCompleteTime(`${hour}:${minute}`);
      } else {
        setAutoCompleteTime(next);
      }
      setAutoTimeModalVisible(false);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '최종 일기 생성 시간을 저장하지 못했어요.');
    } finally {
      setSavingAutoTime(false);
    }
  };

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
          <TouchableOpacity
            style={styles.actionRow}
            onPress={openAutoTimeModal}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionLabel, { fontSize: scale(15) }]}>
              최종 일기 생성 시간
            </Text>
            <View style={styles.actionRight}>
              <Text style={[styles.rowValue, { fontSize: scale(15) }]}>
                {formatTimeLabel(autoCompleteTime)}
              </Text>
              <Text style={styles.actionArrow}>›</Text>
            </View>
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

      {/* 자동 일기 완료 시간 picker 모달 */}
      <Modal
        visible={autoTimeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAutoTimeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { height: '60%' }]}>
            <SafeAreaView edges={['bottom']} style={styles.modalSafe}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setAutoTimeModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.modalHeaderBtn, { fontSize: scale(15) }]}>
                    취소
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.modalHeaderTitle, { fontSize: scale(16) }]}>
                  최종 일기 생성 시간
                </Text>
                <TouchableOpacity
                  onPress={handleSaveAutoTime}
                  disabled={savingAutoTime}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.modalHeaderBtn,
                      styles.modalHeaderSave,
                      { fontSize: scale(15) },
                      savingAutoTime && { opacity: 0.5 },
                    ]}
                  >
                    {savingAutoTime ? '저장 중...' : '저장'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalHelper, styles.autoTimeHelper, { fontSize: scale(13) }]}>
                이 시각이 되면 그날의 일기가 자동으로 최종 일기로 생성돼요.
              </Text>

              <View style={styles.timePickerWrap}>
                <View style={styles.timePickerColumn}>
                  <Text style={[styles.timePickerColumnLabel, { fontSize: scale(13) }]}>
                    시
                  </Text>
                  <FlatList
                    data={HOUR_OPTIONS}
                    keyExtractor={item => item}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const isActive = item === autoTimeDraft.hour;
                      return (
                        <TouchableOpacity
                          style={[styles.timeItem, isActive && styles.timeItemActive]}
                          onPress={() => setAutoTimeDraft(d => ({ ...d, hour: item }))}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.timeItemText,
                              isActive && styles.timeItemTextActive,
                              { fontSize: scale(17) },
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>

                <Text style={[styles.timeSeparator, { fontSize: scale(28) }]}>:</Text>

                <View style={styles.timePickerColumn}>
                  <Text style={[styles.timePickerColumnLabel, { fontSize: scale(13) }]}>
                    분
                  </Text>
                  <FlatList
                    data={MINUTE_OPTIONS}
                    keyExtractor={item => item}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const isActive = item === autoTimeDraft.minute;
                      return (
                        <TouchableOpacity
                          style={[styles.timeItem, isActive && styles.timeItemActive]}
                          onPress={() => setAutoTimeDraft(d => ({ ...d, minute: item }))}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.timeItemText,
                              isActive && styles.timeItemTextActive,
                              { fontSize: scale(17) },
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </View>
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
    flexShrink: 0,
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
    flex: 1,
    marginRight: 8,
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
    flexShrink: 0,
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

  // 자동 완료 시간 picker
  autoTimeHelper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  timePickerWrap: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerColumnLabel: {
    color: '#A09B95',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeItem: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  timeItemActive: {
    backgroundColor: '#2C2A28',
  },
  timeItemText: {
    color: '#3D3A37',
    fontWeight: '500',
  },
  timeItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSeparator: {
    color: '#2C2A28',
    fontWeight: '700',
    paddingTop: 28,
  },
});

export default SettingsScreen;