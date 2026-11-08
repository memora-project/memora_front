import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { API_BASE_URL, KAKAO_REDIRECT_URI } from '@env';
import { kakaoLogin, type AuthTokens } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

/** Finish a Kakao login, including an additional consent round when Kakao requires one. */
export const useKakaoLoginFlow = () => {
  const { login } = useAuth();
  const [visible, setVisible] = useState(false);
  const [scopes, setScopes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pendingTokens = useRef<AuthTokens | null>(null);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Render Free may be asleep. Wake it before issuing a one-time Kakao
      // authorization code so the code is not lost while the server boots.
      const serverOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      try {
        const response = await fetch(`${serverOrigin}/actuator/health`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`서버 상태 확인 실패 (HTTP ${response.status})`);
        }
      } finally {
        clearTimeout(timeoutId);
      }

      pendingTokens.current = null;
      setScopes([]);
      setVisible(true);
    } catch (error) {
      const timedOut =
        error instanceof Error && error.name === 'AbortError';
      Alert.alert(
        '서버 연결 중',
        timedOut
          ? '서버를 시작하는 데 시간이 걸리고 있습니다. 잠시 후 카카오 로그인을 다시 눌러 주세요.'
          : '서버에 연결할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      );
    } finally {
      setBusy(false);
    }
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
