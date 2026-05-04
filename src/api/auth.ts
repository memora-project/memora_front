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

/**
 * POST /auth/logout — 서버에 logout 요청 (DB의 refresh token 무효화).
 * 네트워크 실패해도 클라이언트 로그아웃은 진행해야 하므로 에러를 삼킨다.
 */
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // 무시: 로컬 토큰 정리는 호출자가 항상 수행
  }
};

export interface KakaoLoginRequest {
  /** 카카오 OAuth 인가코드 — WebView가 redirect URI에서 가로챈 ?code= 값. */
  code: string;
  /** 카카오 콘솔에 등록된 redirect URI (백엔드가 토큰 교환 시 동일값으로 검증). */
  redirectUri: string;
}

/**
 * POST /auth/kakao — 카카오 로그인.
 * 백엔드가 인가코드로 카카오 토큰 교환 + 사용자 정보 조회 + (없으면) 자동 회원가입까지 처리.
 * 토큰 교환에 필요한 client_secret은 백엔드 환경변수에만 존재해야 한다 (앱 번들 금지).
 *
 * 카카오 가입자는 우리 서비스의 password=null이라 일반 로그인 불가 → 항상 카카오 로그인으로 들어옴.
 */
export const kakaoLogin = async (
  request: KakaoLoginRequest,
): Promise<AuthTokens> => {
  try {
    const { data } = await apiClient.post<AuthTokens>('/auth/kakao', request);
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '카카오 로그인에 실패했습니다.'));
  }
};
