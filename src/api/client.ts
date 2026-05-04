import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@env';

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

/**
 * 다음 요청부터 Authorization 헤더에 자동 첨부할 액세스 토큰을 설정한다.
 * 로그아웃 시 null로 호출.
 */
export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

/**
 * Refresh 토큰을 메모리에 보관 (401 응답 시 access 재발급에 사용).
 * AuthContext가 로그인/세션 복구 시점에 호출.
 */
export const setRefreshToken = (token: string | null) => {
  _refreshToken = token;
};

apiClient.interceptors.request.use(config => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ─────────────────────────────────────────────── 401 → refresh → retry

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let onAuthError: (() => void) | null = null;

/**
 * 401 + refresh 실패 시 호출되는 콜백.
 * AuthContext가 마운트 시점에 등록 → logout을 트리거하여
 * 사용자가 자동으로 로그인 화면으로 돌아가게 한다.
 */
export const setOnAuthError = (cb: (() => void) | null) => {
  onAuthError = cb;
};

let onTokenRefreshed: ((tokens: { accessToken: string; refreshToken: string }) => void) | null = null;
export const setOnTokenRefreshed = (
  cb: ((tokens: { accessToken: string; refreshToken: string }) => void) | null,
) => {
  onTokenRefreshed = cb;
};

let refreshInFlight: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

const callRefresh = async () => {
  if (!_refreshToken) return null;
  try {
    // 인터셉터 재진입 막으려고 raw axios 사용 (apiClient 인스턴스 X)
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${apiClient.defaults.baseURL}/auth/refresh`,
      { refreshToken: _refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
    );
    return data;
  } catch {
    return null;
  }
};

apiClient.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && _refreshToken) {
      original._retry = true;

      // 동시에 여러 요청이 401 맞아도 refresh는 1번만
      if (!refreshInFlight) {
        refreshInFlight = callRefresh().finally(() => {
          refreshInFlight = null;
        });
      }
      const tokens = await refreshInFlight;

      if (tokens) {
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
        // 영속 저장은 AuthContext가 책임 — 콜백으로 알림
        onTokenRefreshed?.(tokens);
        original.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient.request(original);
      }

      // refresh 실패 → 로그아웃
      setAccessToken(null);
      setRefreshToken(null);
      onAuthError?.();
    }

    return Promise.reject(error);
  },
);

/**
 * 백엔드 에러 응답에서 메시지 추출. `error` 또는 `message` 필드 중 먼저 발견된 것.
 * 둘 다 없으면 status code를 fallback에 덧붙여 진단 힌트라도 노출.
 */
export const extractApiErrorMessage = (e: unknown, fallback: string): string => {
  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<ApiErrorPayload>;
    const data = err.response?.data;
    if (typeof data?.error === 'string' && data.error.length > 0) return data.error;
    if (typeof data?.message === 'string' && data.message.length > 0) return data.message;
    if (err.response?.status) {
      return `${fallback} (HTTP ${err.response.status})`;
    }
    if (err.message) {
      return `${fallback} (${err.message})`;
    }
  }
  return fallback;
};
