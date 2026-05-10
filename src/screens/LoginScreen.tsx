import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Text } from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import type { LoginScreenProps } from '../navigation/AppNavigator';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { login as apiLogin, kakaoLogin as apiKakaoLogin } from '../api/auth';
import KakaoLoginModal from '../components/KakaoLoginModal';
// @ts-ignore — react-native-dotenv 런타임 변수
import { KAKAO_REDIRECT_URI } from '@env';

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login } = useAuth();
  const { scale } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [kakaoModalVisible, setKakaoModalVisible] = useState(false);
  const [isKakaoExchanging, setIsKakaoExchanging] = useState(false);

  /**
   * 카카오 WebView가 인가코드를 가로채면 호출됨.
   * 백엔드에 code + redirectUri를 보내 우리 JWT를 받고 AuthContext.login으로 자동 메인 진입.
   */
  const handleKakaoCode = async (code: string) => {
    setKakaoModalVisible(false);
    setIsKakaoExchanging(true);
    try {
      const tokens = await apiKakaoLogin({
        code,
        redirectUri: KAKAO_REDIRECT_URI,
      });
      // 카카오 가입자는 우리 loginId가 'kakao_{id}' 형식. 표시용으로 그것을 그대로 넘김.
      // (백엔드 /users/me 응답에서 진짜 loginId가 다시 채워져 덮어씀)
      await login('', tokens.accessToken, tokens.refreshToken);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : '카카오 로그인 처리 중 오류가 발생했습니다.';
      Alert.alert('카카오 로그인 실패', message);
    } finally {
      setIsKakaoExchanging(false);
    }
  };

  const handleLogin = async () => {
    if (isLoading) return;

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

    setIsLoading(true);
    try {
      const trimmedEmail = email.trim();
      const tokens = await apiLogin({ loginId: trimmedEmail, password });
      await login(trimmedEmail, tokens.accessToken, tokens.refreshToken);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      Alert.alert('로그인 실패', message);
    } finally {
      setIsLoading(false);
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
                style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                <Text style={[styles.loginBtnText, { fontSize: scale(17) }]}>
                  {isLoading ? '로그인 중...' : '로그인'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={[styles.dividerText, { fontSize: scale(13) }]}>또는</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.kakaoBtn, isKakaoExchanging && styles.loginBtnDisabled]}
                onPress={() => setKakaoModalVisible(true)}
                activeOpacity={0.85}
                disabled={isKakaoExchanging || isLoading}
              >
                <Text style={[styles.kakaoBtnText, { fontSize: scale(17) }]}>
                  {isKakaoExchanging ? '카카오 로그인 처리 중...' : '카카오로 시작하기'}
                </Text>
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

      <KakaoLoginModal
        visible={kakaoModalVisible}
        onClose={() => setKakaoModalVisible(false)}
        onSuccess={handleKakaoCode}
      />
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
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E0DA',
  },
  dividerText: {
    color: '#A09B95',
  },
  kakaoBtn: {
    backgroundColor: '#FEE500',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  kakaoBtnText: {
    color: '#3C1E1E',
    fontWeight: '700',
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