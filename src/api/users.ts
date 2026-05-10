import axios from 'axios';
import { apiClient, extractApiErrorMessage } from './client';
import type { Gender } from '../types/user';

export interface UserProfile {
  userId: number;
  loginId: string;
  name: string;
  gender: Gender;
  /** 'YYYY-MM-DD' */
  birthDate: string;
  phoneNumber: string;
  address: string;
  emergencyContact: string | null;
  isReportShared: boolean;
  isKakaoUser: boolean;
  /** ISO-8601 OffsetDateTime — 가입일시 */
  createdAt: string;
  /** 손주 얼굴 사진 url(/uploads/...) — 미설정이면 null. */
  grandchildPhotoUrl: string | null;
  /** 사용자가 정한 호칭 — AI 일기에서 부르는 이름. 미설정이면 null. (백엔드 컬럼명: honorific) */
  honorific: string | null;
}

export interface UpdateProfileRequest {
  name?: string;
  gender?: Gender;
  birthDate?: string;
  phoneNumber?: string;
  address?: string;
  emergencyContact?: string;
  isReportShared?: boolean;
  /** 빈 문자열로 보내면 백엔드에서 null로 초기화 처리됨. */
  grandchildPhotoUrl?: string;
  /** 빈 문자열로 보내면 백엔드에서 null로 초기화 처리됨. */
  honorific?: string;
}

/**
 * GET /users/me — 내 정보 조회.
 * 로그인 직후, 회원가입 직후에 호출하여 AuthContext를 채움.
 */
export const getMe = async (): Promise<UserProfile> => {
  try {
    const { data } = await apiClient.get<UserProfile>('/users/me');
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '내 정보를 불러오지 못했습니다.'));
  }
};

/**
 * PATCH /users/me — 내 정보 수정. 보낸 필드만 부분 업데이트.
 */
/**
 * POST /users/me/fcm-token — FCM 토큰 등록.
 * 앱 시작 시 로그인 상태면 호출하여 푸시 알림 수신 가능하도록 한다.
 */
export const registerFcmToken = async (fcmToken: string): Promise<void> => {
  try {
    await apiClient.post('/users/me/fcm-token', { fcmToken });
  } catch (e) {
    console.warn('[FCM] 토큰 등록 실패:', extractApiErrorMessage(e, ''));
  }
};

export const updateMe = async (
  request: UpdateProfileRequest,
): Promise<UserProfile> => {
  try {
    const { data } = await apiClient.patch<UserProfile>('/users/me', request);
    return data;
  } catch (e) {
    // 디버깅용 — 어떤 status / 어떤 응답인지 console에서 확인 가능.
    if (axios.isAxiosError(e)) {
      console.warn('[updateMe] PATCH /users/me 실패', {
        requestBody: request,
        status: e.response?.status,
        responseData: e.response?.data,
        message: e.message,
      });
    } else {
      console.warn('[updateMe] PATCH /users/me 실패 (비-axios)', e);
    }
    throw new Error(extractApiErrorMessage(e, '내 정보를 수정하지 못했습니다.'));
  }
};
