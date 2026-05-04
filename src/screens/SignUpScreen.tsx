import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Icon from 'react-native-vector-icons/Ionicons';
import DistrictPicker from '../components/DistrictPicker';
import BirthdatePicker from '../components/BirthdatePicker';
import type { District } from '../constants/districts';
import type { SignUpScreenProps } from '../navigation/AppNavigator';
import { useAuth, type Gender } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { signup as apiSignup, type SignupRequest } from '../api/auth';

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const { scale } = useSettings();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  // isReportShared: 명세상 signup body에 없음 → 추후 PATCH /users/me로 별도 저장 예정
  const [isReportShared, setIsReportShared] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const handleSignUp = async () => {
    if (isLoading) return;

    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해 주세요.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('알림', '이메일 형식이 올바르지 않습니다.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('알림', '전화번호를 입력해 주세요.');
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
    if (!address) {
      Alert.alert('알림', '주소(동네)를 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedEmergency = emergencyContact.trim();
      const request: SignupRequest = {
        loginId: trimmedEmail,
        password,
        name: name.trim(),
        gender,
        birthDate,
        phoneNumber: phoneNumber.trim(),
        address,
        ...(trimmedEmergency.length > 0
          ? { emergencyContact: trimmedEmergency }
          : {}),
      };

      const tokens = await apiSignup(request);
      // 자동 로그인 — AuthContext.login이 /users/me 호출하여 createdAt 포함한
      // 프로필 전체를 AsyncStorage + state로 채워 넣음.
      await authLogin(trimmedEmail, tokens.accessToken, tokens.refreshToken);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      Alert.alert('회원가입 실패', message);
    } finally {
      setIsLoading(false);
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
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>회원가입</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        {/* 이메일 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            이메일 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontSize: scale(17) }]}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            placeholderTextColor="#B5AFA8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={1}
          />
        </View>

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

        {/* 비밀번호 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            비밀번호 <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput, { fontSize: scale(17) }]}
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상"
              placeholderTextColor="#B5AFA8"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#8A857F"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 비밀번호 확인 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            비밀번호 확인 <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput, { fontSize: scale(17) }]}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 한 번 더 입력"
              placeholderTextColor="#B5AFA8"
              secureTextEntry={!showPasswordConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPasswordConfirm(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <Icon
                name={showPasswordConfirm ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#8A857F"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 전화번호 */}
        <View style={styles.inputWrap}>
          <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>
            전화번호 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontSize: scale(17) }]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="010-0000-0000"
            placeholderTextColor="#B5AFA8"
            keyboardType="phone-pad"
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
            onChangeText={setEmergencyContact}
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

        {/* 토글 */}
        {emergencyContact.trim().length > 0 && (
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Text style={[styles.switchLabel, { fontSize: scale(15) }]}>
                월간 분석 리포트 공유
              </Text>
              <Text style={[styles.switchHelper, { fontSize: scale(13) }]}>
                비상 연락처에 매월 기분 변화 리포트를 공유합니다.
              </Text>
            </View>
            <Switch
              value={isReportShared}
              onValueChange={setIsReportShared}
              trackColor={{ false: '#EFEAE3', true: '#2C2A28' }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.signUpBtn, isLoading && styles.signUpBtnDisabled]}
          onPress={handleSignUp}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          <Text style={[styles.signUpBtnText, { fontSize: scale(17) }]}>
            {isLoading ? '가입 중...' : '가입하기'}
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
    paddingTop: 12,
    paddingBottom: 40,
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
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: '100%',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    gap: 12,
  },
  switchLabelWrap: {
    flex: 1,
  },
  switchLabel: {
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 4,
  },
  switchHelper: {
    color: '#A09B95',
    lineHeight: 18,
  },
  signUpBtn: {
    backgroundColor: '#2C2A28',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  signUpBtnDisabled: {
    opacity: 0.6,
  },
  signUpBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SignUpScreen;