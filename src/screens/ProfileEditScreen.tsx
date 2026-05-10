import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth, type Gender } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import BirthdatePicker from '../components/BirthdatePicker';
import DistrictPicker from '../components/DistrictPicker';
import type { District } from '../constants/districts';
import type { ProfileEditScreenProps } from '../navigation/AppNavigator';

const ProfileEditScreen: React.FC<ProfileEditScreenProps> = ({ navigation }) => {
  const {
    userName,
    userBirthDate,
    userAddress,
    userGender,
    userNickname,
    updateProfile,
    updateNickname,
  } = useAuth();
  const { scale } = useSettings();

  const [name, setName] = useState(userName ?? '');
  const [birthDate, setBirthDate] = useState(userBirthDate ?? '');
  const [address, setAddress] = useState(userAddress ?? '');
  const [gender, setGender] = useState<Gender | ''>(userGender ?? '');
  const [nickname, setNickname] = useState(userNickname ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
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
    if (!address) {
      Alert.alert('알림', '주소를 선택해 주세요.');
      return;
    }
    if (!gender) {
      Alert.alert('알림', '성별을 선택해 주세요.');
      return;
    }

    try {
      setSaving(true);
      // 본명/생년월일/주소/성별 PATCH (호칭은 별도 PATCH로 honorific 컬럼 갱신)
      await updateProfile(name.trim(), birthDate, address, gender);
      await updateNickname(nickname);
      Alert.alert('저장 완료', '프로필이 수정되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('오류', '프로필 저장 중 문제가 발생했습니다.');
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backTouch}
        >
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>프로필 수정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
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

        {/* 호칭 (선택) */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>호칭 (선택)</Text>
          <TextInput
            style={[styles.input, { fontSize: scale(17) }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="예: 박옥자 어르신, 엄마"
            placeholderTextColor="#B5AFA8"
            multiline
            numberOfLines={1}
          />
          <Text style={[styles.helperText, { fontSize: scale(13) }]}>
            손주가 어떻게 부를지 정해보세요. 비워두면 성별에 맞춰 자동으로 정해져요.
          </Text>
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

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={[styles.saveBtnText, { fontSize: scale(17) }]}>
            {saving ? '저장 중...' : '저장하기'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backTouch: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    fontSize: 30,
    color: '#2C2A28',
    fontWeight: '300',
    lineHeight: 32,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  inputWrap: {
    marginBottom: 22,
  },
  inputLabel: {
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 10,
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

export default ProfileEditScreen;