import { apiClient, extractApiErrorMessage } from './client';
import { API_BASE_URL } from '@env';

/**
 * 백엔드가 응답으로 주는 상대 경로(`/uploads/abc.jpg`)를 절대 URL로 변환.
 * 이미 절대 URL이면 그대로 반환.
 *
 * Image source={{uri}}에 그대로 넘길 수 있는 형태로 만들어주는 게 목적.
 */
const ORIGIN = API_BASE_URL.replace(/\/api\/.*$/, '');

export const resolveImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `${ORIGIN}${path}`;
  return `${ORIGIN}/${path}`;
};

/**
 * 이미지 업로드 — multipart/form-data로 백엔드에 보내고 서버 URL을 받는다.
 * 사용 시점: segment 생성 직전. 받은 url을 SegmentCreateRequest.photoUrl로 사용.
 *
 * RN의 FormData는 파일을 `{ uri, type, name }` 객체로 받는다 (브라우저 File과 다름).
 * - uri:   `file://...` 형태. image-picker가 주는 path 그대로 OK.
 * - type:  MIME. 백엔드가 contentType.startsWith("image/") 검사를 함.
 * - name:  서버 측 파일명. 백엔드가 확장자(jpg/jpeg/png/gif/webp)로 한 번 더 검증함 → 보낼 때 강제로 맞춰줘야 한다.
 */

interface UploadImageResult {
  url: string;
}

/** 백엔드(FileService.isImageExtension)가 허용하는 확장자. */
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;
type AllowedExt = (typeof ALLOWED_EXTS)[number];

/** uri의 마지막 segment에서 확장자만 뽑는다. ?query 등은 제거. */
const extractExtension = (uri: string): string | null => {
  const cleaned = uri.split(/[?#]/)[0];
  const last = cleaned.split(/[\\/]/).pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot < 0) return null;
  return last.substring(dot + 1).toLowerCase();
};

/**
 * 백엔드가 허용하는 확장자만 통과시킨다.
 * heic/heif나 확장자 없는 path는 'jpg'로 폴백 — Android picker는 jpg로 디코드된 cache 파일을 주는 경우가 많아
 * 실제 byte도 jpg일 가능성이 높음. (그렇지 않은 경우 백엔드가 거부하면 사용자에게 그 메시지가 그대로 노출됨)
 */
const safeExt = (uri: string): AllowedExt => {
  const raw = extractExtension(uri);
  if (raw && (ALLOWED_EXTS as readonly string[]).includes(raw)) {
    return raw as AllowedExt;
  }
  return 'jpg';
};

const extToMime = (ext: AllowedExt): string => {
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const buildFileName = (uri: string, ext: AllowedExt): string => {
  const cleaned = uri.split(/[?#]/)[0];
  const last = cleaned.split(/[\\/]/).pop() ?? '';
  // 마지막 segment가 이미 허용 확장자로 끝나면 그대로 — 백엔드가 그 이름을 그대로 본다.
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(last)) {
    return last;
  }
  return `photo_${Date.now()}.${ext}`;
};

/**
 * N장의 이미지를 병렬로 업로드. 하나라도 실패하면 전체 실패로 throw.
 * 결과는 입력 uri 순서와 동일한 url 배열.
 */
export const uploadImages = async (uris: string[]): Promise<string[]> => {
  if (uris.length === 0) return [];
  return Promise.all(uris.map(uri => uploadImage(uri)));
};

export const uploadImage = async (uri: string): Promise<string> => {
  const ext = safeExt(uri);
  const mime = extToMime(ext);
  const name = buildFileName(uri, ext);

  const form = new FormData();
  form.append('file', {
    uri,
    type: mime,
    name,
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
