import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 백엔드 DB 스키마와 일치하는 타입 정의
 * 백엔드 컬럼: login_id, password, name, gender, birth_date, address, phone_number, is_report_shared, kakao_id, created_at
 * 프론트는 카멜케이스로 변환해서 사용
 */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const STORAGE_KEYS = {
  USER_TOKEN: '@memora:user_token',
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
  userCreatedAt: string | null;      // 가입일시 (백엔드 연동 후 진짜 값, 지금은 null)
  login: (email: string, token: string) => Promise<void>;
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

  // 앱 시작 시 — 저장된 정보 복구
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [
          token,
          email,
          name,
          gender,
          birthDate,
          address,
          phoneNumber,
          createdAt,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
          AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.USER_GENDER),
          AsyncStorage.getItem(STORAGE_KEYS.USER_BIRTH_DATE),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ADDRESS),
          AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE_NUMBER),
          AsyncStorage.getItem(STORAGE_KEYS.USER_CREATED_AT),
        ]);

        if (token) {
          setIsLoggedIn(true);
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
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, token: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);

      // TODO: 백엔드 연동 후 — GET /users/me 호출해서 사용자 정보 받아오기
      // const response = await fetch('/api/v1/users/me', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // const userData = await response.json();
      // setUserName(userData.name);
      // setUserGender(userData.gender);
      // ... 등

      setIsLoggedIn(true);
      setUserEmail(email);
    } catch (error) {
      console.error('로그인 저장 실패:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_TOKEN,
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.USER_GENDER,
        STORAGE_KEYS.USER_BIRTH_DATE,
        STORAGE_KEYS.USER_ADDRESS,
        STORAGE_KEYS.USER_PHONE_NUMBER,
        STORAGE_KEYS.USER_CREATED_AT,
      ]);
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
        // TODO: 백엔드 연동 후 — PATCH /users/me 호출
        // await fetch('/api/v1/users/me', {
        //   method: 'PATCH',
        //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        //   body: JSON.stringify({ name, birth_date: birthDate, address }),
        // });

        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name),
          AsyncStorage.setItem(STORAGE_KEYS.USER_BIRTH_DATE, birthDate),
          AsyncStorage.setItem(STORAGE_KEYS.USER_ADDRESS, address),
        ]);
        setUserName(name);
        setUserBirthDate(birthDate);
        setUserAddress(address);
      } catch (error) {
        console.error('프로필 업데이트 실패:', error);
        throw error;
      }
    },
    [],
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