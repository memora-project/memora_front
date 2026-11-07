import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { KAKAO_REDIRECT_URI } from '@env';
import { kakaoLogin, type AuthTokens } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

/** Finish a Kakao login, including an additional consent round when Kakao requires one. */
export const useKakaoLoginFlow = () => {
  const { login } = useAuth();
  const [visible, setVisible] = useState(false);
  const [scopes, setScopes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pendingTokens = useRef<AuthTokens | null>(null);

  const start = () => {
    pendingTokens.current = null;
    setScopes([]);
    setVisible(true);
  };

  const close = () => {
    setVisible(false);
    setScopes([]);
    const fallback = pendingTokens.current;
    pendingTokens.current = null;
    if (fallback) {
      // Consent was skipped. Keep the valid first-round session.
      void login('', fallback.accessToken, fallback.refreshToken).catch(error => {
        Alert.alert('카카오 로그인 실패', error instanceof Error ? error.message : '다시 로그인해 주세요.');
      });
    }
  };

  const onCode = async (code: string) => {
    if (busy) return;
    setBusy(true);
    const consentAttempted = pendingTokens.current !== null;
    try {
      const tokens = await kakaoLogin({ code, redirectUri: KAKAO_REDIRECT_URI });
      if (!consentAttempted && tokens.additionalConsentScopes?.length) {
        pendingTokens.current = tokens;
        setScopes(tokens.additionalConsentScopes);
        // The WebView key changes with its URL, opening the additional consent screen.
        setVisible(true);
      } else {
        pendingTokens.current = null;
        setVisible(false);
        setScopes([]);
        await login('', tokens.accessToken, tokens.refreshToken);
      }
    } catch (error) {
      setVisible(false);
      setScopes([]);
      const fallback = pendingTokens.current;
      pendingTokens.current = null;
      if (fallback) {
        try {
          await login('', fallback.accessToken, fallback.refreshToken);
          Alert.alert('추가 동의 실패', '카카오에서 가져오지 못한 정보는 직접 입력해 주세요.');
        } catch (loginError) {
          Alert.alert('카카오 로그인 실패', loginError instanceof Error ? loginError.message : '다시 로그인해 주세요.');
        }
      } else {
        Alert.alert('카카오 로그인 실패', error instanceof Error ? error.message : '다시 로그인해 주세요.');
      }
    } finally {
      setBusy(false);
    }
  };

  return { visible, scopes, busy, start, close, onCode };
};
