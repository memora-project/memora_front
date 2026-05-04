import React, { useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
// @ts-ignore — react-native-dotenv는 런타임 환경변수, 타입은 별도로 제공 안 함
import { KAKAO_REST_API_KEY, KAKAO_REDIRECT_URI } from '@env';

/**
 * 카카오 OAuth 인가코드를 WebView로 받아오는 모달.
 *
 * 흐름:
 *   1) https://kauth.kakao.com/oauth/authorize 페이지를 WebView로 띄움
 *   2) 사용자가 카카오 로그인 → 카카오가 redirect_uri로 redirect (?code=...)
 *   3) WebView의 navigation 이벤트에서 그 URL 가로채 code 추출
 *   4) onSuccess(code) 콜백으로 부모에게 전달, 모달 닫힘
 *
 * 백엔드는 그 code를 받아 토큰 교환·사용자 정보 조회·(없으면) 자동 회원가입까지 처리.
 */
type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (code: string) => void;
};

const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';

const KakaoLoginModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const webRef = useRef<WebView>(null);
  const consumedRef = useRef(false);

  // 모달 열릴 때마다 한 번만 url 계산. consumed flag도 reset.
  const authUrl = useMemo(() => {
    consumedRef.current = false;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: KAKAO_REST_API_KEY ?? '',
      redirect_uri: KAKAO_REDIRECT_URI ?? '',
    });
    return `${KAKAO_AUTH_URL}?${params.toString()}`;
    // visible이 false→true로 바뀔 때만 다시 계산되도록 의존성에 visible 포함.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const tryConsumeRedirect = (url: string): boolean => {
    if (!url.startsWith(KAKAO_REDIRECT_URI ?? '__never__')) return false;
    if (consumedRef.current) return true; // 이미 처리한 redirect이면 추가 navigation 차단만
    consumedRef.current = true;

    // ?code=xxx&... 또는 ?error=...
    const queryStart = url.indexOf('?');
    const query = queryStart >= 0 ? url.substring(queryStart + 1) : '';
    const params = new URLSearchParams(query);
    const code = params.get('code');
    const error = params.get('error');

    if (code) {
      onSuccess(code);
    } else {
      // error가 있거나 code도 error도 없는 비정상 상황 — 그냥 닫기.
      console.warn('[Kakao] redirect without code:', { error, url });
      onClose();
    }
    return true;
  };

  /**
   * iOS는 onShouldStartLoadWithRequest, Android는 그것과 onNavigationStateChange 둘 다.
   * 둘 중 하나에서 redirect URL을 처음 본 시점에만 onSuccess를 트리거.
   */
  const onShouldStart = (req: { url: string }): boolean => {
    if (tryConsumeRedirect(req.url)) {
      return false; // WebView가 그 URL로 실제 navigation을 진행하지 않게 막음
    }
    return true;
  };

  const onNavStateChange = (state: WebViewNavigation) => {
    tryConsumeRedirect(state.url);
  };

  const missingConfig =
    !KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>카카오 로그인</Text>
          <View style={styles.closeBtn} />
        </View>

        {missingConfig ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>카카오 설정이 비어있어요</Text>
            <Text style={styles.errorBody}>
              .env에 KAKAO_REST_API_KEY와 KAKAO_REDIRECT_URI를 설정한 뒤 앱을 다시 실행해주세요.
            </Text>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: authUrl }}
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={onNavStateChange}
            javaScriptEnabled
            domStorageEnabled
            // 카카오 로그인 페이지가 자체 user-agent 검사를 걸기도 해서 기본값 사용
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#2C2A28" />
              </View>
            )}
            // Android: cookies/HTTP Basic 등을 위해 third party cookies 허용
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={Platform.OS === 'android'}
          />
        )}
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE3',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2A28',
  },
  closeBtn: {
    width: 60,
  },
  closeText: {
    color: '#2C2A28',
    fontSize: 15,
    fontWeight: '500',
  },
  loadingWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2A28',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 14,
    color: '#8A857F',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default KakaoLoginModal;
