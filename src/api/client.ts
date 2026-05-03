import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '@env';

export interface ApiErrorPayload {
  error?: string;
}

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
 * 백엔드 표준 에러 응답 `{ error: string }`에서 메시지를 추출.
 * 네트워크 오류 등 비-axios 에러일 땐 fallback 반환.
 */
export const extractApiErrorMessage = (e: unknown, fallback: string): string => {
  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<ApiErrorPayload>;
    return err.response?.data?.error ?? fallback;
  }
  return fallback;
};
