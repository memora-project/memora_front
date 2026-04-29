import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_TOKEN: '@memora:user_token',
  USER_EMAIL: '@memora:user_email',
  USER_NAME: '@memora:user_name',
  USER_BIRTHDATE: '@memora:user_birthdate',
  USER_ADDRESS_VALUE: '@memora:user_address_value',
  USER_ADDRESS_LABEL: '@memora:user_address_label',
} as const;

type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userEmail: string | null;
  userName: string | null;
  userBirthdate: string | null;
  userAddressValue: string | null;   // 'yuseong-bongmyeong'
  userAddressLabel: string | null;   // '유성구 봉명동'
  login: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (
    name: string,
    birthdate: string,
    addressValue: string,
    addressLabel: string,
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
  const [userBirthdate, setUserBirthdate] = useState<string | null>(null);
  const [userAddressValue, setUserAddressValue] = useState<string | null>(null);
  const [userAddressLabel, setUserAddressLabel] = useState<string | null>(null);

  // 앱 시작 시 — 저장된 정보 복구
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [token, email, name, birthdate, addressValue, addressLabel] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
          AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.USER_BIRTHDATE),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ADDRESS_VALUE),
          AsyncStorage.getItem(STORAGE_KEYS.USER_ADDRESS_LABEL),
        ]);

        if (token) {
          setIsLoggedIn(true);
          setUserEmail(email);
          setUserName(name);
          setUserBirthdate(birthdate);
          setUserAddressValue(addressValue);
          setUserAddressLabel(addressLabel);
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
        STORAGE_KEYS.USER_BIRTHDATE,
        STORAGE_KEYS.USER_ADDRESS_VALUE,
        STORAGE_KEYS.USER_ADDRESS_LABEL,
      ]);
      setIsLoggedIn(false);
      setUserEmail(null);
      setUserName(null);
      setUserBirthdate(null);
      setUserAddressValue(null);
      setUserAddressLabel(null);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(
    async (name: string, birthdate: string, addressValue: string, addressLabel: string) => {
      try {
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name),
          AsyncStorage.setItem(STORAGE_KEYS.USER_BIRTHDATE, birthdate),
          AsyncStorage.setItem(STORAGE_KEYS.USER_ADDRESS_VALUE, addressValue),
          AsyncStorage.setItem(STORAGE_KEYS.USER_ADDRESS_LABEL, addressLabel),
        ]);
        setUserName(name);
        setUserBirthdate(birthdate);
        setUserAddressValue(addressValue);
        setUserAddressLabel(addressLabel);
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
    userBirthdate,
    userAddressValue,
    userAddressLabel,
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