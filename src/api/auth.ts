import { apiClient, extractApiErrorMessage } from './client';

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface SignupRequest {
  loginId: string;
  password: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  /** 'YYYY-MM-DD' */
  birthDate: string;
  phoneNumber: string;
  address: string;
  /** 빈 값이면 키 자체를 빼고 전송할 것. */
  emergencyContact?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * POST /auth/login — 로그인.
 * 성공 시 access/refresh 토큰을 반환.
 *
 * Throws:
 *  - Error(서버 에러 메시지) — 인증 실패, 네트워크 오류 등
 */
export const login = async (request: LoginRequest): Promise<AuthTokens> => {
  try {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', request);
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '로그인에 실패했습니다.'));
  }
};

/**
 * POST /auth/signup — 회원가입.
 * 성공 시 access/refresh 토큰을 반환 (자동 로그인 처리에 사용).
 *
 * Throws:
 *  - Error(서버 에러 메시지) — 중복 이메일, 검증 실패, 네트워크 오류 등
 */
export const signup = async (request: SignupRequest): Promise<AuthTokens> => {
  try {
    const { data } = await apiClient.post<AuthTokens>('/auth/signup', request);
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '회원가입에 실패했습니다.'));
  }
};
