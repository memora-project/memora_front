import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 백엔드 UserSettings.font_size 와 일치
 */
export type FontSize = 'SMALL' | 'MEDIUM' | 'LARGE';

/**
 * 글씨 크기 배율
 * - SMALL: ×1.0 (기본)
 * - MEDIUM: ×1.20
 * - LARGE: ×1.50
 */
const FONT_SCALE_MAP: Record<FontSize, number> = {
  SMALL: 1.0,
  MEDIUM: 1.2,
  LARGE: 1.5,
};

const STORAGE_KEY = '@memora:settings_font_size';
const DEFAULT_FONT_SIZE: FontSize = 'MEDIUM';

type SettingsContextValue = {
  fontSize: FontSize;
  fontScale: number;
  /** 전달받은 크기에 fontScale 곱한 값 반환 */
  scale: (size: number) => number;
  setFontSize: (size: FontSize) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

type SettingsProviderProps = {
  children: ReactNode;
};

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>(DEFAULT_FONT_SIZE);

  // 앱 시작 시 — 저장된 글씨 크기 복구
  useEffect(() => {
    const restoreFontSize = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && (stored === 'SMALL' || stored === 'MEDIUM' || stored === 'LARGE')) {
          setFontSizeState(stored);
        }
      } catch (error) {
        console.error('글씨 크기 복구 실패:', error);
      }
    };

    restoreFontSize();
  }, []);

  const setFontSize = useCallback(async (size: FontSize) => {
    try {
      // TODO: 백엔드 연동 후 — PATCH /settings 호출
      // await fetch('/api/v1/settings', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({ font_size: size }),
      // });

      await AsyncStorage.setItem(STORAGE_KEY, size);
      setFontSizeState(size);
    } catch (error) {
      console.error('글씨 크기 저장 실패:', error);
      throw error;
    }
  }, []);

  const fontScale = FONT_SCALE_MAP[fontSize];

  // 임의 크기에 fontScale 곱한 값 반환 — Math.round로 깔끔한 정수
  const scale = useCallback(
    (size: number) => Math.round(size * fontScale),
    [fontScale],
  );

  const value: SettingsContextValue = {
    fontSize,
    fontScale,
    scale,
    setFontSize,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};