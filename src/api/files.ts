import { apiClient, extractApiErrorMessage } from './client';

interface UploadResponse {
  url: string;
}

/**
 * POST /files/images — 이미지 파일 업로드.
 * 응답의 url을 segment.photoUrl에 저장하면 그 segment에 사진이 연결됨.
 *
 * @param fileUri  picker가 반환한 file:// URI (또는 content://)
 * @param fileName 서버에 저장될 파일 이름. 비우면 기본값.
 * @param mimeType 'image/jpeg' 등. 비우면 기본값.
 */
export const uploadImage = async (
  fileUri: string,
  fileName: string = `photo_${Date.now()}.jpg`,
  mimeType: string = 'image/jpeg',
): Promise<string> => {
  // React Native의 FormData는 { uri, name, type } 형태로 파일 객체를 받음.
  // axios가 자동으로 multipart/form-data Content-Type + boundary를 세팅함.
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
    // RN 타입 정의가 File과 다르므로 any 캐스팅 필요
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  try {
    const { data } = await apiClient.post<UploadResponse>(
      '/files/images',
      formData,
      {
        headers: {
          // RN에서 multipart는 boundary를 명시 안 해도 자동 부여됨.
          // 명시적으로 'multipart/form-data'만 알려주면 됨 (Content-Type 헤더 덮어씀)
          'Content-Type': 'multipart/form-data',
        },
        // 사진 업로드는 시간 더 줘야 함 (10MB 가까이 갈 수 있음)
        timeout: 60000,
      },
    );
    return data.url;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '사진 업로드에 실패했어요.'));
  }
};
