import { apiClient, extractApiErrorMessage } from './client';

export type FontSize = 'SMALL' | 'MEDIUM' | 'LARGE';

/**
 * 백엔드 SettingsResponse — 사용자별 환경 설정.
 * 시간 필드는 LocalTime이라 JSON에선 "HH:mm" 또는 "HH:mm:ss" 형태.
 */
export interface SettingsResponse {
  fontSize: FontSize;
  notificationEnabled: boolean;
  reminderTime: string | null;
  /** 자정 자동 완료 스케줄러가 사용하는 시각. 기본 "00:00". */
  autoCompleteTime: string | null;
}

export interface SettingsUpdateRequest {
  fontSize?: FontSize;
  notificationEnabled?: boolean;
  /** 'HH:mm' 형식. */
  reminderTime?: string;
  /** 'HH:mm' 형식. */
  autoCompleteTime?: string;
}

/**
 * GET /settings — 내 설정 조회.
 * 토큰 필수.
 */
export const getSettings = async (): Promise<SettingsResponse> => {
  try {
    const { data } = await apiClient.get<SettingsResponse>('/settings');
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '설정을 불러오지 못했습니다.'));
  }
};

/**
 * PATCH /settings — 보낸 필드만 부분 업데이트.
 */
export const updateSettings = async (
  request: SettingsUpdateRequest,
): Promise<SettingsResponse> => {
  try {
    const { data } = await apiClient.patch<SettingsResponse>('/settings', request);
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '설정을 저장하지 못했습니다.'));
  }
};
