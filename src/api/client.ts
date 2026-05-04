import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

// AuthContext의 STORAGE_KEYS와 동일해야 함. 두 곳 변경 시 같이 손볼 것.
const TOKEN_STORAGE_KEYS = {
  ACCESS: '@memora:user_token',
  REFRESH: '@memora:user_refresh_token',
} as const;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let _accessToken: string | null = null;

/**
 * 다음 요청부터 Authorization 헤더에 자동 첨부할 액세스 토큰을 설정한다.
 * 로그아웃 시 null로 호출.
 */
export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

apiClient.interceptors.request.use(config => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

/**
 * refresh도 실패했을 때 호출되는 콜백 (자동 로그아웃 트리거).
 * AuthContext가 mount 시 setOnAuthFailure로 등록.
 */
let _onAuthFailure: (() => void) | null = null;
export const setOnAuthFailure = (cb: (() => void) | null) => {
  _onAuthFailure = cb;
};

// 동시에 여러 요청이 401을 받았을 때 refresh를 한 번만 호출하기 위한 큐.
let isRefreshing = false;
type Pending = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
let pendingQueue: Pending[] = [];

const flushQueue = (err: unknown, token: string | null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (err || !token) reject(err);
    else resolve(token);
  });
  pendingQueue = [];
};

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * refreshToken으로 새 accessToken 발급.
 * apiClient를 안 쓰는 이유: 이 호출이 또 401을 받으면 인터셉터가 무한 루프 돌게 됨.
 */
const requestNewAccessToken = async (): Promise<string> => {
  const refreshToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH);
  if (!refreshToken) {
    throw new Error('저장된 refreshToken이 없습니다.');
  }
  const { data } = await axios.post<TokenPair>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    },
  );
  await AsyncStorage.multiSet([
    [TOKEN_STORAGE_KEYS.ACCESS, data.accessToken],
    [TOKEN_STORAGE_KEYS.REFRESH, data.refreshToken],
  ]);
  setAccessToken(data.accessToken);
  return data.accessToken;
};

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;

    // 인증 실패(401/403)가 아니거나 이미 한 번 재시도한 요청이면 그대로 throw.
    if (
      !originalRequest ||
      (status !== 401 && status !== 403) ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // refresh 엔드포인트 자체가 실패한 거면 → 무한 루프 방지 + 자동 로그아웃.
    if (originalRequest.url?.includes('/auth/refresh')) {
      _onAuthFailure?.();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // 이미 다른 요청이 refresh 중이면 큐에 대기.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            apiClient(originalRequest).then(resolve).catch(reject);
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await requestNewAccessToken();
      flushQueue(null, newToken);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      // refresh 자체가 실패 (refreshToken 만료/위조 등) → 자동 로그아웃.
      flushQueue(refreshError, null);
      _onAuthFailure?.();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
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
