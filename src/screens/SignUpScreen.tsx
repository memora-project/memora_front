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
import type { SignUpScreenProps } from '../navigation/AppNavigator';
import DistrictPicker from '../components/DistrictPicker';
import type { District } from '../constants/districts';

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [addressValue, setAddressValue] = useState('');   // 'yuseong-bongmyeong'
  const [addressLabel, setAddressLabel] = useState('');   // '유성구 봉명동'
  const [emergencyContact, setEmergencyContact] = useState('');
  const [reportShareAgreed, setReportShareAgreed] = useState(false);

  const handleSignUp = () => {
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
    if (!phone.trim()) {
      Alert.alert('알림', '전화번호를 입력해 주세요.');
      return;
    }
    if (!addressValue) {
        Alert.alert('알림', '주소(동네)를 선택해 주세요.');
        return;
    }

    Alert.alert(
      '회원가입 완료',
      `${name}님, 환영합니다!\n로그인 화면으로 돌아갑니다.`,
      [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원가입</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        enableResetScrollToCoords={false}
      >
        {/* 이메일 */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>
            이메일 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
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
          <Text style={styles.inputLabel}>
            이름 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
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
          <Text style={styles.inputLabel}>
            비밀번호 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="6자 이상"
            placeholderTextColor="#B5AFA8"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* 비밀번호 확인 */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>
            비밀번호 확인 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            placeholder="비밀번호 한 번 더 입력"
            placeholderTextColor="#B5AFA8"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* 전화번호 */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>
            전화번호 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="010-0000-0000"
            placeholderTextColor="#B5AFA8"
            keyboardType="phone-pad"
            multiline
            numberOfLines={1}
          />
        </View>

        {/* 주소 */}
        <View style={styles.inputWrap}>
        <Text style={styles.inputLabel}>
            주소 (대전 내 동네) <Text style={styles.required}>*</Text>
        </Text>
        <DistrictPicker
            selectedValue={addressValue}
            onSelect={(district: District) => {
            setAddressValue(district.value);
            setAddressLabel(district.label);
            }}
            placeholder="동네를 선택하세요"
        />
        </View>

        {/* 비상 연락처 */}
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>비상 연락처 (선택)</Text>
          <TextInput
            style={styles.input}
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            placeholder="010-0000-0000"
            placeholderTextColor="#B5AFA8"
            keyboardType="phone-pad"
            multiline
            numberOfLines={1}
          />
          <Text style={styles.helperText}>
            장시간 활동이 감지되지 않을 경우 연락이 갑니다.
          </Text>
        </View>

        {/* 토글 */}
        {emergencyContact.trim().length > 0 && (
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Text style={styles.switchLabel}>월간 분석 리포트 공유</Text>
              <Text style={styles.switchHelper}>
                비상 연락처에 매월 기분 변화 리포트를 공유합니다.
              </Text>
            </View>
            <Switch
              value={reportShareAgreed}
              onValueChange={setReportShareAgreed}
              trackColor={{ false: '#EFEAE3', true: '#2C2A28' }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.signUpBtn}
          onPress={handleSignUp}
          activeOpacity={0.85}
        >
          <Text style={styles.signUpBtnText}>가입하기</Text>
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
  backBtn: {
    fontSize: 28,
    color: '#2C2A28',
    width: 32,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
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
    fontSize: 15,
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
    fontSize: 17,
    color: '#2C2A28',
    minHeight: 52,
    textAlignVertical: 'center',
  },
  helperText: {
    marginTop: 6,
    fontSize: 13,
    color: '#A09B95',
    lineHeight: 18,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 4,
  },
  switchHelper: {
    fontSize: 13,
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
  signUpBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default SignUpScreen;