import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BirthdatePicker from '../components/BirthdatePicker';
import DistrictPicker from '../components/DistrictPicker';
import type { District } from '../constants/districts';
import { useAuth, type Gender } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

/**
 * 카카오 가입자가 첫 로그인 시 필수 정보를 채우는 화면.
 *
 * 카카오에서 자동으로 채워진 필드는 prefill되고(수정 가능), 빈 칸은 사용자가 입력해야 한다.
 * 모든 필수 필드가 채워지면 PATCH /users/me로 저장 → AuthContext.needsAdditionalInfo가
 * 자연히 false가 되면서 AppNavigator가 메인 화면으로 자동 전환.
 */
const AdditionalInfoScreen: React.FC = () => {
  const {
    userName,
    userGender,
    userBirthDate,
    userPhoneNumber,
    userAddress,
    userEmergencyContact,
    completeAdditionalInfo,
  } = useAuth();
  const { scale } = useSettings();

  const [name, setName] = useState(userName ?? '');
  const [gender, setGender] = useState<Gender | ''>(userGender ?? '');
  const [birthDate, setBirthDate] = useState(userBirthDate ?? '');
  const [phoneNumber, setPhoneNumber] = useState(userPhoneNumber ?? '');
  const [address, setAddress] = useState(userAddress ?? '');
  const [emergencyContact, setEmergencyContact] = useState(userEmergencyContact ?? '');
  const [saving, setSaving] = useState(false);

  const formatPhone = (text: string): string => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 11);
    if (digits.length > 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    if (digits.length > 3) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return digits;
  };

  const handleSave = async () => {
    if (saving) return;

    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (!gender) {
      Alert.alert('알림', '성별을 선택해 주세요.');
      return;
    }
    if (!birthDate || birthDate.split('-').length !== 3) {
      Alert.alert('알림', '생년월일을 모두 선택해 주세요.');
      return;
    }
    const [y, m, d] = birthDate.split('-');
    if (!y || !m || !d) {
      Alert.alert('알림', '생년월일을 모두 선택해 주세요.');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('알림', '전화번호를 입력해 주세요.');
      return;
    }
    if (!address) {
      Alert.alert('알림', '주소(동네)를 선택해 주세요.');
      return;
    }

    setSaving(true);
    try {
      await completeAdditionalInfo({
        name,
        gender,
        birthDate,
        phoneNumber,
        address,
        emergencyContact: emergencyContact.trim() || undefined,
      });
      // 성공 시 needsAdditionalInfo=false 가 되며 AppNavigator가 자동으로 메인으로 전환.
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류';
      Alert.alert('저장 실패', msg);
    } finally {
      setSaving(false);
    }
  };

  const renderGenderOption = (value: Gender, label: string) => {
    const isActive = gender === value;
    return (
      <TouchableOpacity
        key={value}
        style={[styles.genderBtn, isActive && styles.genderBtnActive]}
        onPress={() => setGender(value)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.genderText,
          isActive && styles.genderTextActive,
          { fontSize: scale(16) },
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>
          추가 정보 입력
        </Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <Text style={[styles.intro, { fontSize: scale(15) }]}>
          서비스 이용을 위해{'\n'}몇 가지만 더 알려주세요.
        </Text>

        {/* 이름 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            이름 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontSize: scale(17) }]}
            value={name}
            onChangeText={setName}
            placeholder="홍길동"
            placeholderTextColor="#B5AFA8"
            multiline
            numberOfLines={1}
          />
        </View>

        {/* 성별 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            성별 <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.genderRow}>
            {renderGenderOption('MALE', '남성')}
            {renderGenderOption('FEMALE', '여성')}
          </View>
        </View>

        {/* 생년월일 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            생년월일 <Text style={styles.required}>*</Text>
          </Text>
          <BirthdatePicker value={birthDate} onChange={setBirthDate} />
        </View>

        {/* 전화번호 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            전화번호 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontSize: scale(17) }]}
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(formatPhone(text))}
            placeholder="010-0000-0000"
            placeholderTextColor="#B5AFA8"
            keyboardType="phone-pad"
            multiline
            numberOfLines={1}
          />
        </View>

        {/* 주소 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            주소 (대전 내 동네) <Text style={styles.required}>*</Text>
          </Text>
          <DistrictPicker
            selectedValue={address}
            onSelect={(district: District) => {
              setAddress(district.label);
            }}
            placeholder="동네를 선택하세요"
          />
        </View>

        {/* 비상 연락처 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>비상 연락처 (선택)</Text>
          <TextInput
            style={[styles.input, { fontSize: scale(17) }]}
            value={emergencyContact}
            onChangeText={(text) => setEmergencyContact(formatPhone(text))}
            placeholder="010-0000-0000"
            placeholderTextColor="#B5AFA8"
            keyboardType="phone-pad"
            multiline
            numberOfLines={1}
          />
          <Text style={[styles.helperText, { fontSize: scale(13) }]}>
            장시간 활동이 감지되지 않을 경우 연락이 갑니다.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={[styles.saveBtnText, { fontSize: scale(17) }]}>
            {saving ? '저장 중...' : '시작하기'}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  intro: {
    color: '#5C5852',
    lineHeight: 22,
    marginBottom: 22,
  },
  inputWrap: {
    marginBottom: 18,
  },
  inputLabel: {
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 8,
  },
  required: {
    color: '#D9534F',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    color: '#2C2A28',
    minHeight: 52,
    textAlignVertical: 'center',
  },
  helperText: {
    marginTop: 6,
    color: '#A09B95',
    lineHeight: 18,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: '#2C2A28',
    borderColor: '#2C2A28',
  },
  genderText: {
    color: '#3D3A37',
    fontWeight: '500',
  },
  genderTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#2C2A28',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default AdditionalInfoScreen;
