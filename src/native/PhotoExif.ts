import { NativeModules, Platform } from 'react-native';

/**
 * Result of a GPS-preserving photo pick on Android.
 * `latitude`/`longitude` are null when the photo has no GPS.
 */
export interface PhotoExifResult {
  /** content:// URI of the picked image (renderable in <Image source={{ uri }} />) */
  uri: string;
  /** Raw EXIF DateTime string ("YYYY:MM:DD HH:MM:SS"), or null. */
  takenAt: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface PhotoExifNative {
  pickImageWithExif(): Promise<PhotoExifResult>;
}

const native = NativeModules.PhotoExifModule as PhotoExifNative | undefined;

/**
 * Android 전용. Photo Picker(privacy redaction) 우회해서 EXIF GPS를 보존한 채로
 * 갤러리 사진 한 장을 가져온다. iOS에선 호출하지 않는 게 정상 (대신 ICP 사용).
 *
 * Throws:
 *  - 'E_PICKER_CANCELLED' — 사용자가 취소
 *  - 'E_NO_PERMISSION'    — ACCESS_MEDIA_LOCATION 미허용
 *  - 'E_EXIF_FAIL'        — EXIF 파싱 실패
 */
export const pickImageWithExif = async (): Promise<PhotoExifResult> => {
  if (Platform.OS !== 'android') {
    throw new Error('PhotoExif.pickImageWithExif is Android-only');
  }
  if (!native) {
    throw new Error(
      'PhotoExifModule is not linked. Did you rebuild the app after adding the native module?',
    );
  }
  return native.pickImageWithExif();
};
