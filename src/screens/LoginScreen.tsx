import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import type { LoginScreenProps } from '../navigation/AppNavigator';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login } = useAuth();
  const { scale } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해 주세요.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('알림', '이메일 형식이 올바르지 않습니다.');
      return;
    }
    if (!password) {
      Alert.alert('알림', '비밀번호를 입력해 주세요.');
      return;
    }

    try {
      // TODO: 실제 백엔드 인증 후 받은 토큰을 저장. 지금은 임시 토큰.
      const fakeToken = 'temp-token-' + Date.now();
      await login(email, fakeToken);
    } catch (error) {
      Alert.alert('오류', '로그인 처리 중 문제가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        bounces={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.flex1}>
            <View style={styles.logoArea}>
              <Text style={[styles.logoTitle, { fontSize: scale(44) }]}>Memora</Text>
              <Text style={[styles.logoSubtitle, { fontSize: scale(16) }]}>
                오늘의 마음을 기록해 보세요
              </Text>
            </View>

            <View style={styles.formArea}>
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>이메일</Text>
                <TextInput
                  style={[styles.input, { fontSize: scale(17) }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor="#B5AFA8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  multiline
                  numberOfLines={1}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { fontSize: scale(15) }]}>비밀번호</Text>
                <TextInput
                  style={[styles.input, { fontSize: scale(17) }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호 입력"
                  placeholderTextColor="#B5AFA8"
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleLogin}
                activeOpacity={0.85}
              >
                <Text style={[styles.loginBtnText, { fontSize: scale(17) }]}>로그인</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomArea}>
              <Text style={[styles.bottomText, { fontSize: scale(15) }]}>
                회원이 아니신가요?
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={[styles.bottomLink, { fontSize: scale(15) }]}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    minHeight: 200,
  },
  logoTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -1,
  },
  logoSubtitle: {
    marginTop: 12,
    color: '#8A857F',
  },
  formArea: {
    paddingHorizontal: 24,
  },
  inputWrap: {
    marginBottom: 18,
  },
  inputLabel: {
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 8,
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
  loginBtn: {
    backgroundColor: '#2C2A28',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  bottomText: {
    color: '#8A857F',
  },
  bottomLink: {
    fontWeight: '700',
    color: '#2C2A28',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;