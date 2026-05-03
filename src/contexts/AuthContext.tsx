import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAccessToken,
  setRefreshToken,
  setOnAuthError,
  setOnTokenRefreshed,
} from '../api/client';
import { logout as apiLogout } from '../api/auth';
import { getMe, updateMe, type UserProfile } from '../api/users';
import type { Gender } from '../types/user';

/**
 * 백엔드 DB 스키마와 일치하는 타입 정의
 * 백엔드 컬럼: login_id, password, name, gender, birth_date, address, phone_number, is_report_shared, kakao_id, created_at
 * 프론트는 카멜케이스로 변환해서 사용
 */
export type { Gender };

const STORAGE_KEYS = {
  USER_TOKEN: '@memora:user_token',                   // accessToken
  USER_REFRESH_TOKEN: '@memora:user_refresh_token',
  USER_EMAIL: '@memora:user_email',           // 백엔드 login_id (이메일 형식)
  USER_NAME: '@memora:user_name',
  USER_GENDER: '@memora:user_gender',
  USER_BIRTH_DATE: '@memora:user_birth_date',
  USER_ADDRESS: '@memora:user_address',       // 한글 동네명 ('유성구 봉명동')
  USER_PHONE_NUMBER: '@memora:user_phone_number',
  USER_CREATED_AT: '@memora:user_created_at',
} as const;

type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userEmail: string | null;          // login_id
  userName: string | null;
  userGender: Gender | null;
  userBirthDate: string | null;      // 'YYYY-MM-DD'
  userAddress: string | null;        // '유성구 봉명동'
  userPhoneNumber: string | null;
  userCreatedAt: string | null;      // 가입일시 (백엔드 응답에 없으면 null 유지)
  login: (email: string, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (
    name: string,
    birthDate: string,
    address: string,
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userGender, setUserGender] = useState<Gender | null>(null);
  const [userBirthDate, setUserBirthDate] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);

  /**
   * /users/me 응답을 AsyncStorage + state에 일괄 반영.
   * 로그인 직후, 회원가입 직후, PATCH /users/me 직후 호출.
   */
  const persistProfile = useCallback(async (profile: UserProfile) => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, profile.loginId),
      AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, profile.name),
      AsyncStorage.setItem(STORAGE_KEYS.USER_GENDER, profile.gender),
      AsyncStorage.setItem(STORAGE_KEYS.USER_BIRTH_DATE, profile.birthDate),
      AsyncStorage.setItem(STORAGE_KEYS.USER_ADDRESS, profile.address),
      AsyncStorage.setItem(STORAGE_KEYS.USER_PHONE_NUMBER, profile.phoneNumber),
    ]);
    setUserEmail(profile.loginId);
    setUserName(profile.name);
    setUserGender(profile.gender);
    setUserBirthDate(profile.birthDate);
    setUserAddress(profile.address);
    setUserPhoneNumber(profile.phoneNumber);
  }, []);

  // 앱 시작 시 — 저장된 정보 복구 + axios 인터셉터 콜백 등록
  useEffect(() => {
    // client.ts에 콜백 등록:
    // 1) 401 + refresh 실패 시 → 자동 로그아웃 (사용자가 로그인 화면으로 돌아감)
    // 2) refresh 성공 시 → 새 토큰을 AsyncStorage에 영속 저장
    setOnAuthError(() => {
      // axios 인터셉터에서 호출됨. setState만 — AsyncStorage는 이미 client.ts가 비워둠
      AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_TOKEN,
        STORAGE_KEYS.USER_REFRESH_TOKEN,
      ]).catch(() => {});
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserName(null);
      setUserGender(null);
      setUserBirthDate(null);
      setUserAddress(null);
      setUserPhoneNumber(null);
      setUserCreatedAt(null);
    });

    setOnTokenRefreshed(tokens => {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.USER_TOKEN, tokens.accessToken],
        [STORAGE_KEYS.USER_REFRESH_TOKEN, tokens.refreshToken],
      ]).catch(() => {});
    });

    const restoreSession = async () => {
      let savedToken: string | null = null;
      try {
        const [
          token,
          refreshToken,
          email,
          name,
          gender,
          birthDate,
          address,
          phoneNumber,
          createdAt,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER_REFRESH_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
          AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.USER_GENDER),
          AsyncStorage.getItem(STORAGE_KEYS.USER_BIRTH_DATE),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ADDRESS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE_NUMBER),
          AsyncStorage.getItem(STORAGE_KEYS.USER_CREATED_AT),
        ]);
        savedToken = token;

        if (token) {
          setAccessToken(token); // ← 이후 모든 API 요청에 자동 첨부
          setRefreshToken(refreshToken); // 401 시 재발급용
          setIsLoggedIn(true);
          // 캐시된 값으로 일단 빠르게 첫 렌더 — 잠시 후 백엔드 응답으로 덮어씀
          setUserEmail(email);
          setUserName(name);
          setUserGender(gender as Gender | null);
          setUserBirthDate(birthDate);
          setUserAddress(address);
          setUserPhoneNumber(phoneNumber);
          setUserCreatedAt(createdAt);
        }
      } catch (error) {
        console.error('세션 복구 실패:', error);
      } finally {
        setIsLoading(false);
      }

      // 로딩 화면이 사라진 뒤 백엔드에서 최신 프로필 갱신.
      // 실패해도 캐시된 값으로 계속 사용 가능 (오프라인 대응).
      if (savedToken) {
        try {
          const profile = await getMe();
          await persistProfile(profile);
        } catch (e) {
          console.warn('백그라운드 프로필 갱신 실패 (캐시 사용):', e);
        }
      }
    };

    restoreSession();

    return () => {
      setOnAuthError(null);
      setOnTokenRefreshed(null);
    };
  }, [persistProfile]);

  const login = useCallback(
    async (email: string, accessToken: string, refreshToken: string) => {
      let tokensSaved = false;
      try {
        // 1. 토큰 저장 + 인터셉터 등록
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, accessToken),
          AsyncStorage.setItem(STORAGE_KEYS.USER_REFRESH_TOKEN, refreshToken),
          AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email),
        ]);
        setAccessToken(accessToken);
        setRefreshToken(refreshToken); // 401 시 재발급용
        tokensSaved = true;

        // 2. 백엔드에서 내 정보 조회 후 AsyncStorage + state 채우기
        const profile = await getMe();
        await persistProfile(profile);

        // 3. 모든 데이터 준비된 후에 로그인 상태 마킹
        setIsLoggedIn(true);
      } catch (error) {
        // 실패 시 토큰 롤백 — 부분적 로그인 상태 방지
        if (tokensSaved) {
          await AsyncStorage.multiRemove([
            STORAGE_KEYS.USER_TOKEN,
            STORAGE_KEYS.USER_REFRESH_TOKEN,
            STORAGE_KEYS.USER_EMAIL,
          ]);
          setAccessToken(null);
          setRefreshToken(null);
        }
        console.error('로그인 처리 실패:', error);
        throw error;
      }
    },
    [persistProfile],
  );

  const logout = useCallback(async () => {
    // 백엔드에 logout 요청 — DB의 refresh token 무효화. 실패해도 클라이언트는 진행.
    await apiLogout();

    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_TOKEN,
        STORAGE_KEYS.USER_REFRESH_TOKEN,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.USER_GENDER,
        STORAGE_KEYS.USER_BIRTH_DATE,
        STORAGE_KEYS.USER_ADDRESS,
        STORAGE_KEYS.USER_PHONE_NUMBER,
        STORAGE_KEYS.USER_CREATED_AT,
      ]);
      setAccessToken(null);
      setRefreshToken(null);
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserName(null);
      setUserGender(null);
      setUserBirthDate(null);
      setUserAddress(null);
      setUserPhoneNumber(null);
      setUserCreatedAt(null);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (name: string, birthDate: string, address: string) => {
      try {
        // PATCH /users/me — 변경 필드만. 응답으로 전체 프로필이 돌아오므로 그것을 source of truth로 반영.
        const profile = await updateMe({ name, birthDate, address });
        await persistProfile(profile);
      } catch (error) {
        console.error('프로필 업데이트 실패:', error);
        throw error;
      }
    },
    [persistProfile],
  );

  const value: AuthContextValue = {
    isLoggedIn,
    isLoading,
    userEmail,
    userName,
    userGender,
    userBirthDate,
    userAddress,
    userPhoneNumber,
    userCreatedAt,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
