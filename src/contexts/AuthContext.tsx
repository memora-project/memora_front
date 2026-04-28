import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * AsyncStorage 키 상수
 * 흩어지면 오타 위험 → 한 곳에서 관리
 */
const STORAGE_KEYS = {
  USER_TOKEN: '@memora:user_token',
  USER_EMAIL: '@memora:user_email',
} as const;

/**
 * Context에 담길 값의 타입 정의
 */
type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;          // 앱 시작 직후 토큰 확인 중인지
  userEmail: string | null;
  login: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
};

/**
 * Context 생성 (초기값은 임시)
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provider 컴포넌트
 * 앱 전체를 이걸로 감싸면 그 안에서 어디서든 useAuth() 사용 가능
 */
type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);  // 처음엔 토큰 확인 중
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // 앱 시작 시 한 번 — 저장된 토큰 있으면 자동 로그인
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
        const email = await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);

        if (token) {
          // 토큰 있으면 로그인된 상태로 처리
          setIsLoggedIn(true);
          setUserEmail(email);
        }
      } catch (error) {
        console.error('세션 복구 실패:', error);
      } finally {
        // 토큰 확인 끝났음 (있든 없든)
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // 로그인 처리
  const login = useCallback(async (email: string, token: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
      setIsLoggedIn(true);
      setUserEmail(email);
    } catch (error) {
      console.error('로그인 저장 실패:', error);
      throw error;
    }
  }, []);

  // 로그아웃 처리
  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
      setIsLoggedIn(false);
      setUserEmail(null);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  }, []);

  const value: AuthContextValue = {
    isLoggedIn,
    isLoading,
    userEmail,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 커스텀 Hook — 어떤 컴포넌트에서든 useAuth() 한 줄로 사용
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};