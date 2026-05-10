import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import { apiClient, extractApiErrorMessage } from './client';
import { DAEJEON_DISTRICTS, type District } from '../constants/districts';

/**
 * GET /geo/reverse — 위/경도 → 주소(동 단위) 변환.
 * 백엔드는 카카오 로컬 API를 사용하며 응답 예: { address: "대전 유성구 학하동" }.
 * 매칭 실패 시 백엔드는 빈 문자열을 반환한다 ({ address: "" }).
 *
 * 회원가입 전에도 호출 가능하도록 백엔드는 이 엔드포인트에 인증을 요구하지 않는다.
 */
export const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<string> => {
  try {
    const { data } = await apiClient.get<{ address: string }>('/geo/reverse', {
      params: { lat, lng },
    });
    return data?.address ?? '';
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '주소를 가져오지 못했습니다.'));
  }
};

interface DeviceCoords {
  latitude: number;
  longitude: number;
}

/**
 * 디바이스 GPS로 현재 좌표를 한 번 가져온다.
 * Android는 런타임 위치 권한을 요청, iOS는 라이브러리/Info.plist가 처리.
 * 권한 거부 / 위치 서비스 OFF / timeout 시 null.
 */
export const getDeviceCoords = async (): Promise<DeviceCoords | null> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    } catch (e) {
      console.warn('위치 권한 요청 실패:', e);
      return null;
    }
  }

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      err => {
        console.warn('디바이스 위치 가져오기 실패:', err);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
};

/**
 * 백엔드에서 받은 주소 문자열을 우리 동네 목록(DAEJEON_DISTRICTS)에 매칭.
 *
 * 백엔드가 주는 형식 예:
 *   "대전 유성구 학하동"
 *   "대전광역시 서구 둔산1동"   (행정동 번호 포함)
 *
 * 매칭 전략:
 *   1) "대전(광역시)?" 접두 제거
 *   2) 라벨 정확 일치
 *   3) 같은 구 안에서 동 정확 일치
 *   4) "둔산1동" → "둔산동"처럼 숫자 떼고 매칭
 *   5) 같은 구 안에서 동 이름 prefix 매칭
 * 모두 실패하면 null.
 */
export const findDistrictFromAddress = (
  rawAddress: string,
): District | null => {
  if (!rawAddress) return null;
  const stripped = rawAddress.replace(/^대전(광역시)?\s*/, '').trim();
  if (!stripped) return null;

  const exact = DAEJEON_DISTRICTS.find(d => d.label === stripped);
  if (exact) return exact;

  const parts = stripped.split(/\s+/);
  if (parts.length < 2) return null;
  const gu = parts[0];
  const dong = parts.slice(1).join(' ');

  const sameGu = DAEJEON_DISTRICTS.filter(d => d.gu === gu);
  if (sameGu.length === 0) return null;

  const exactDong = sameGu.find(d => d.dong === dong);
  if (exactDong) return exactDong;

  const dongWithoutNum = dong.replace(/(\d+)동$/, '동');
  const numStripped = sameGu.find(d => d.dong === dongWithoutNum);
  if (numStripped) return numStripped;

  const prefix = dong.replace(/(\d+)?동$/, '');
  if (prefix.length > 0) {
    const partial = sameGu.find(d => d.dong.startsWith(prefix));
    if (partial) return partial;
  }

  return null;
};

export type LookupResult =
  | { kind: 'success'; district: District }
  | { kind: 'permission_denied' }
  | { kind: 'no_coords' }
  | { kind: 'out_of_daejeon'; address: string }
  | { kind: 'error'; message: string };

/**
 * "내 위치로 자동 입력" 버튼 한 번에 — 권한 → GPS → 백엔드 → District 매칭까지.
 * 화면은 결과 종류만 보고 사용자에게 안내하면 된다.
 */
export const lookupCurrentDistrict = async (): Promise<LookupResult> => {
  let coords: DeviceCoords | null;
  try {
    coords = await getDeviceCoords();
  } catch (e) {
    return { kind: 'permission_denied' };
  }
  if (!coords) {
    return { kind: 'no_coords' };
  }

  let address: string;
  try {
    address = await reverseGeocode(coords.latitude, coords.longitude);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      return {
        kind: 'error',
        message: extractApiErrorMessage(e, '주소를 가져오지 못했습니다.'),
      };
    }
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : '주소를 가져오지 못했습니다.',
    };
  }

  if (!address) {
    return { kind: 'out_of_daejeon', address: '' };
  }

  const matched = findDistrictFromAddress(address);
  if (!matched) {
    return { kind: 'out_of_daejeon', address };
  }

  return { kind: 'success', district: matched };
};
