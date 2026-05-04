import { apiClient, extractApiErrorMessage } from './client';

/**
 * 이미지 업로드 — multipart/form-data로 백엔드에 보내고 서버 URL을 받는다.
 * 사용 시점: segment 생성 직전. 받은 url을 SegmentCreateRequest.photoUrl로 사용.
 *
 * RN의 FormData는 파일을 `{ uri, type, name }` 객체로 받는다 (브라우저 File과 다름).
 * - uri:   `file://...` 형태. image-picker가 주는 path 그대로 OK.
 * - type:  MIME. 알 수 없으면 'image/jpeg'로 기본값.
 * - name:  서버 측 파일명. uri의 마지막 segment 또는 fallback.
 */

interface UploadImageResult {
  url: string;
}

const guessMimeType = (uri: string): string => {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

const guessFileName = (uri: string): string => {
  const last = uri.split(/[\\/]/).pop();
  return last && last.length > 0 ? last : `photo_${Date.now()}.jpg`;
};

export const uploadImage = async (uri: string): Promise<string> => {
  const form = new FormData();
  form.append('file', {
    uri,
    type: guessMimeType(uri),
    name: guessFileName(uri),
    // RN의 FormData는 위 3개 필드를 가진 객체를 파일로 인식한다.
    // 타입 단언은 RN의 FormData 타입 정의가 브라우저 File을 기대해서 어쩔 수 없음.
  } as unknown as Blob);

  try {
    const { data } = await apiClient.post<UploadImageResult>(
      '/files/images',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        // 사진 업로드는 본문 + 네트워크 양쪽으로 시간이 걸리므로 client.ts 기본 타임아웃(15s)
        // 보다 넉넉하게.
        timeout: 60000,
      },
    );
    return data.url;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '사진 업로드에 실패했습니다.'));
  }
};
