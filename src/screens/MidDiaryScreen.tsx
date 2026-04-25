import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Permission,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagePicker, {
  Image as PickerImage,
} from 'react-native-image-crop-picker';
import Geolocation from '@react-native-community/geolocation';

import type { MidDiaryScreenProps } from '../navigation/AppNavigator';
import { pickImageWithExif } from '../native/PhotoExif';

/**
 * 필요한 권한 (네이티브 빌드 시 설정)
 *
 * Android (`android/app/src/main/AndroidManifest.xml`):
 *   - <uses-permission android:name="android.permission.CAMERA" />
 *   - <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />        // API 33+
 *   - <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
 *                      android:maxSdkVersion="32" />
 *   - <uses-permission android:name="android.permission.ACCESS_MEDIA_LOCATION" />    // GPS EXIF 읽기
 *
 * iOS (`ios/<app>/Info.plist`):
 *   - NSCameraUsageDescription           : "일기에 사진을 첨부하기 위해 카메라를 사용합니다."
 *   - NSPhotoLibraryUsageDescription     : "갤러리에서 사진을 불러옵니다."
 *   - NSPhotoLibraryAddUsageDescription  : "촬영한 사진을 갤러리에 저장합니다."
 *   - NSLocationWhenInUseUsageDescription: "사진 EXIF의 위치 정보를 함께 기록합니다."
 */

type Step = 1 | 2 | 3;

interface Mood {
  key: string;
  label: string;
  emoji: string;
}

interface PhotoMetadata {
  uri: string;
  /** ISO 8601. 사진 EXIF의 DateTime; 없으면 null. */
  takenAt: string | null;
  /** 위도. 사진 EXIF가 우선, 없으면 디바이스 현재 GPS로 fallback. */
  latitude: number | null;
  /** 경도. 사진 EXIF가 우선, 없으면 디바이스 현재 GPS로 fallback. */
  longitude: number | null;
  /** 사람이 읽기 좋은 위치 라벨. */
  locationLabel: string;
  /**
   * 위치 출처. 동선 분석 정확도 가중치를 다르게 줘야 하므로 반드시 기록.
   * - 'photo'  : 사진 EXIF에서 추출한 실제 촬영 위치
   * - 'device' : 일기 작성 시점의 디바이스 GPS (fallback)
   * - 'none'   : 둘 다 실패 (권한 거부 등)
   */
  locationSource: 'photo' | 'device' | 'none';
}

const NO_LOCATION_LABEL = '위치 정보 없음';

const MOODS: Mood[] = [
  { key: 'best', label: '최고에요', emoji: '😄' },
  { key: 'calm', label: '평온해요', emoji: '😌' },
  { key: 'unsure', label: '저도 모르겠어요', emoji: '🤔' },
  { key: 'sad', label: '슬퍼요', emoji: '😢' },
  { key: 'angry', label: '화나요', emoji: '😠' },
  { key: 'sick', label: '몸이 안 좋아요', emoji: '🤒' },
];

// EXIF의 GPS는 보통 "37,33,12.34" 형태(도/분/초) 또는 십진수로 옵니다.
// 라이브러리가 십진수로 반환하면 그대로, DMS면 변환합니다.
const toDecimal = (value: unknown): number | null => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!Number.isNaN(num) && !value.includes(',')) return num;
    const parts = value.split(/[,\s]+/).map(parseFloat);
    if (parts.length === 3 && parts.every(p => !Number.isNaN(p))) {
      const [d, m, s] = parts;
      return d + m / 60 + s / 3600;
    }
  }
  return null;
};

const applyHemisphere = (
  decimal: number | null,
  ref: unknown,
): number | null => {
  if (decimal === null) return null;
  if (typeof ref === 'string' && (ref === 'S' || ref === 'W')) {
    return -Math.abs(decimal);
  }
  return decimal;
};

interface PermissionRequestResult {
  /** 사진을 불러올 수 있는 핵심 권한이 모두 허용됐는가 (CAMERA 또는 갤러리 읽기) */
  canPickPhoto: boolean;
  /** ACCESS_MEDIA_LOCATION이 허용되어 GPS EXIF를 읽을 수 있는가 */
  canReadGps: boolean;
  /** 사용자가 거부한 권한 목록 */
  denied: Permission[];
}

/**
 * 사진 선택/촬영 + EXIF GPS 추출에 필요한 Android 권한을 요청한다.
 *
 * - 카메라: CAMERA
 * - 갤러리: API 33+ → READ_MEDIA_IMAGES, API 32- → READ_EXTERNAL_STORAGE
 * - GPS EXIF: API 29+ → ACCESS_MEDIA_LOCATION (없으면 시스템이 좌표를 마스킹함)
 *
 * iOS는 Info.plist + image-picker가 자체 프롬프트로 처리하므로 항상 허용으로 간주.
 */
const requestPhotoPermissions = async (
  source: 'camera' | 'gallery',
): Promise<PermissionRequestResult> => {
  if (Platform.OS !== 'android') {
    return { canPickPhoto: true, canReadGps: true, denied: [] };
  }

  const sdk =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);

  const corePermissions: Permission[] = [];
  if (source === 'camera') {
    corePermissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  } else if (sdk >= 33) {
    corePermissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
  } else {
    corePermissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  }

  // ACCESS_MEDIA_LOCATION은 Android 10(API 29)+ 에서만 의미가 있다.
  const gpsPermissions: Permission[] =
    sdk >= 29 ? [PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION] : [];

  const all = [...corePermissions, ...gpsPermissions];

  try {
    const result = await PermissionsAndroid.requestMultiple(all);

    const denied = all.filter(
      p => result[p] !== PermissionsAndroid.RESULTS.GRANTED,
    );
    const canPickPhoto = corePermissions.every(
      p => result[p] === PermissionsAndroid.RESULTS.GRANTED,
    );
    const canReadGps = gpsPermissions.every(
      p => result[p] === PermissionsAndroid.RESULTS.GRANTED,
    );

    return { canPickPhoto, canReadGps, denied };
  } catch (e) {
    console.warn('권한 요청 중 오류:', e);
    return { canPickPhoto: false, canReadGps: false, denied: all };
  }
};

interface DeviceCoords {
  latitude: number;
  longitude: number;
}

/**
 * 사진 EXIF에 GPS가 없을 때 fallback으로 쓸 디바이스 현재 위치를 가져온다.
 * 권한이 없거나 위치 서비스가 꺼져 있으면 null 반환 (앱 흐름은 막지 않음).
 */
const getDeviceLocation = async (): Promise<DeviceCoords | null> => {
  // Android 런타임 위치 권한 요청 (iOS는 Info.plist + 라이브러리가 자동 프롬프트)
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('ACCESS_FINE_LOCATION 거부됨 → 디바이스 위치 fallback 불가');
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

interface AIDraftLocation {
  latitude: number | null;
  longitude: number | null;
  label: string;
  source: 'photo' | 'device' | 'none';
}

// TODO: OpenRouter API 연동. 지금은 콘솔 로그 + mock 응답.
const generateAIDraft = async (
  mood: Mood | null,
  time: string | null,
  location: AIDraftLocation | null,
): Promise<string> => {
  console.log('AI에게 보낼 데이터:', { mood, time, location });

  // mock 답변
  await new Promise(resolve => setTimeout(resolve, 600));

  const moodLine = mood
    ? `오늘은 ${mood.emoji} ${mood.label}한 하루였다.`
    : '오늘 하루를 돌아본다.';

  const timeLine = time
    ? `\n\n${time.split('T')[0]}, 그 순간의 공기가 아직 마음에 남아 있다.`
    : '';

  const hasCoords =
    location && location.latitude !== null && location.longitude !== null;

  const locationLine = hasCoords
    ? `\n\n그곳의 풍경은 위도 ${location!.latitude!.toFixed(
        4,
      )}, 경도 ${location!.longitude!.toFixed(
        4,
      )}—사진 한 장이지만 그 자리의 온도와 빛이 떠오른다.`
    : '';

  return (
    `${moodLine}${timeLine}${locationLine}\n\n` +
    '바쁜 일상 속에서도 잠시 멈춰 나의 마음을 들여다보는 시간을 가졌다. ' +
    '작은 감정 하나하나가 모여 오늘의 나를 만든다는 사실을, 다시 한 번 깨달았다.'
  );
};

const MidDiaryScreen: React.FC<MidDiaryScreenProps> = ({ navigation }) => {
  const [step, setStep] = useState<Step>(1);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata | null>(null);
  const [diaryText, setDiaryText] = useState<string>('');
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 3 진입 시 AI 초안 생성
  useEffect(() => {
    if (step !== 3 || diaryText) return;

    let cancelled = false;
    (async () => {
      setIsGenerating(true);
      const draft = await generateAIDraft(
        selectedMood,
        photoMetadata?.takenAt ?? null,
        photoMetadata
          ? {
              latitude: photoMetadata.latitude,
              longitude: photoMetadata.longitude,
              label: photoMetadata.locationLabel,
              source: photoMetadata.locationSource,
            }
          : null,
      );
      if (!cancelled) {
        setDiaryText(draft);
        setIsGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, diaryText, selectedMood, photoMetadata]);

  const handleMoodSelect = (mood: Mood | null) => {
    setSelectedMood(mood);
    setStep(2);
  };

  /**
   * react-native-image-crop-picker가 picker 결과에 직접 실어주는 `.exif`에서
   * 시간/위도/경도를 파싱한다. (Android는 평탄 키, iOS는 GPS 서브 객체로 옴)
   */
  const extractExif = (image: PickerImage): PhotoMetadata => {
    const uri = image.path.startsWith('file://')
      ? image.path
      : `file://${image.path}`;

    const exif = (image.exif ?? {}) as Record<string, unknown>;
    console.log('[EXIF] raw:', exif);

    // iOS는 "{GPS}" 또는 "{Exif}" 같이 묶음 키로 옴 → 둘 다 평탄화
    const nestedExif = (exif['{Exif}'] as Record<string, unknown>) ?? {};
    const nestedGps = (exif['{GPS}'] as Record<string, unknown>) ?? {};
    const flat: Record<string, unknown> = {
      ...nestedExif,
      ...nestedGps,
      ...exif,
    };

    // 1) 촬영 시간
    const takenAtRaw =
      (flat.DateTimeOriginal as string | undefined) ??
      (flat.DateTime as string | undefined) ??
      null;
    const takenAt = takenAtRaw
      ? takenAtRaw.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T')
      : null;

    // 2) 위도/경도
    // Android (image-crop-picker): Latitude / Longitude 가 십진수로 직접 옴
    // iOS: GPSLatitude / GPSLongitude + GPSLatitudeRef / GPSLongitudeRef
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (typeof flat.Latitude === 'number') {
      latitude = flat.Latitude;
    } else if (flat.GPSLatitude !== undefined) {
      latitude = applyHemisphere(toDecimal(flat.GPSLatitude), flat.GPSLatitudeRef);
    }
    if (typeof flat.Longitude === 'number') {
      longitude = flat.Longitude;
    } else if (flat.GPSLongitude !== undefined) {
      longitude = applyHemisphere(toDecimal(flat.GPSLongitude), flat.GPSLongitudeRef);
    }

    // (0, 0)은 마스킹된 값으로 간주
    if (latitude === 0 && longitude === 0) {
      latitude = null;
      longitude = null;
    }

    const hasPhotoGps = latitude !== null && longitude !== null;
    const locationLabel = hasPhotoGps
      ? `${latitude!.toFixed(4)}, ${longitude!.toFixed(4)}`
      : NO_LOCATION_LABEL;

    return {
      uri,
      takenAt,
      latitude,
      longitude,
      locationLabel,
      locationSource: hasPhotoGps ? 'photo' : 'none',
    };
  };

  const handlePhotoPick = async (source: 'camera' | 'gallery' | 'skip') => {
    if (source === 'skip') {
      setPhotoMetadata(null);
      setStep(3);
      return;
    }

    setIsPickingPhoto(true);
    try {
      // 1) Android 권한 선체크/요청 (iOS는 자동으로 true)
      const permission = await requestPhotoPermissions(source);
      console.log('[Permission] result:', permission);

      if (!permission.canPickPhoto) {
        Alert.alert(
          '권한이 필요해요',
          source === 'camera'
            ? '카메라 권한을 허용해야 사진을 촬영할 수 있어요.'
            : '갤러리 접근 권한을 허용해야 사진을 불러올 수 있어요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정 열기', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      if (!permission.canReadGps) {
        // 핵심 권한은 있지만 GPS EXIF를 읽지 못함 → 진행은 하되 사용자에게 안내
        console.warn(
          'ACCESS_MEDIA_LOCATION이 거부되어 사진의 위치 정보를 읽을 수 없습니다.',
        );
      }

      // 2) Picker 호출
      // - Android 갤러리: 자체 네이티브 모듈 사용 (GPS 보존, ACTION_PICK + setRequireOriginal)
      // - 그 외 (iOS 갤러리 / 카메라 양쪽): image-crop-picker
      const useNativeAndroidPicker =
        Platform.OS === 'android' && source === 'gallery';

      let metadata: PhotoMetadata;
      try {
        if (useNativeAndroidPicker) {
          const result = await pickImageWithExif();
          console.log('[NativePicker] result:', result);

          // 썸네일 우선 노출
          setPhotoMetadata({
            uri: result.uri,
            takenAt: null,
            latitude: null,
            longitude: null,
            locationLabel: NO_LOCATION_LABEL,
            locationSource: 'none',
          });

          const takenAt = result.takenAt
            ? result.takenAt.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T')
            : null;
          const hasPhotoGps =
            result.latitude !== null && result.longitude !== null;
          const locationLabel = hasPhotoGps
            ? `${result.latitude!.toFixed(4)}, ${result.longitude!.toFixed(4)}`
            : NO_LOCATION_LABEL;

          metadata = {
            uri: result.uri,
            takenAt,
            latitude: result.latitude,
            longitude: result.longitude,
            locationLabel,
            locationSource: hasPhotoGps ? 'photo' : 'none',
          };
        } else {
          const image: PickerImage =
            source === 'camera'
              ? await ImagePicker.openCamera({
                  mediaType: 'photo',
                  includeExif: true,
                  cropping: false,
                })
              : await ImagePicker.openPicker({
                  mediaType: 'photo',
                  includeExif: true,
                  cropping: false,
                  multiple: false,
                });
          console.log('[ImagePicker] image:', image);

          const tempUri = image.path.startsWith('file://')
            ? image.path
            : `file://${image.path}`;
          setPhotoMetadata({
            uri: tempUri,
            takenAt: null,
            latitude: null,
            longitude: null,
            locationLabel: NO_LOCATION_LABEL,
            locationSource: 'none',
          });

          metadata = extractExif(image);
        }

        // 사진 EXIF에 GPS가 없으면 디바이스 현재 위치로 fallback
        // (도메인 정책: 동선 분석을 위해 어떤 좌표든 확보. 출처는 metadata.locationSource로 구분)
        if (metadata.locationSource === 'none') {
          console.log('[Location] EXIF에 GPS 없음 → 디바이스 위치 fallback 시도');
          const deviceCoords = await getDeviceLocation();
          if (deviceCoords) {
            metadata = {
              ...metadata,
              latitude: deviceCoords.latitude,
              longitude: deviceCoords.longitude,
              locationLabel: `${deviceCoords.latitude.toFixed(
                4,
              )}, ${deviceCoords.longitude.toFixed(4)} (작성 위치)`,
              locationSource: 'device',
            };
          }
        }
      } catch (e: any) {
        if (e?.code === 'E_PICKER_CANCELLED') {
          return; // 사용자 취소: 조용히 종료
        }
        Alert.alert('사진을 불러올 수 없어요', e?.message ?? '');
        return;
      }

      console.log('[EXIF] extracted metadata:', {
        takenAt: metadata.takenAt,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        locationLabel: metadata.locationLabel,
        locationSource: metadata.locationSource,
        hasTime: metadata.takenAt !== null,
        hasLocation:
          metadata.latitude !== null && metadata.longitude !== null,
      });

      setPhotoMetadata(metadata);
      setStep(3);
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleSave = () => {
    // TODO: AsyncStorage / DB에 일기 저장
    Alert.alert('저장 완료', '오늘의 기록이 저장되었어요.', [
      {
        text: '확인',
        onPress: () => navigation.navigate('Home'),
      },
    ]);
  };

  const handleEditMenu = () => {
    Alert.alert(
      '어떻게 수정할까요?',
      '',
      [
        {
          text: '기분 다시 선택',
          onPress: () => {
            setDiaryText('');
            setStep(1);
          },
        },
        {
          text: '다시 작성',
          onPress: () => setDiaryText(''),
        },
        { text: '직접 수정', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map(n => (
        <View
          key={n}
          style={[styles.stepDot, step === n && styles.stepDotActive]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>오늘 어떠신가요?</Text>
      <Text style={styles.subtitle}>지금의 마음에 가장 가까운 것을 골라주세요</Text>

      <View style={styles.moodGrid}>
        {MOODS.map(mood => (
          <TouchableOpacity
            key={mood.key}
            style={styles.moodButton}
            activeOpacity={0.8}
            onPress={() => handleMoodSelect(mood)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => handleMoodSelect(null)}
      >
        <Text style={styles.skipText}>기분 선택 안 함</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>오늘의 한 장면</Text>
      <Text style={styles.subtitle}>마음에 남은 사진이 있다면 함께 담아보세요</Text>

      {photoMetadata?.uri ? (
        <View style={styles.thumbnailWrap}>
          <Image
            source={{ uri: photoMetadata.uri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          {isPickingPhoto && (
            <View style={styles.thumbnailOverlay}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.thumbnailOverlayText}>
                메타데이터 추출 중...
              </Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.photoActions}>
        <TouchableOpacity
          style={styles.photoButton}
          activeOpacity={0.8}
          disabled={isPickingPhoto}
          onPress={() => handlePhotoPick('camera')}
        >
          <Text style={styles.photoIcon}>📷</Text>
          <Text style={styles.photoLabel}>카메라</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoButton}
          activeOpacity={0.8}
          disabled={isPickingPhoto}
          onPress={() => handlePhotoPick('gallery')}
        >
          <Text style={styles.photoIcon}>🖼️</Text>
          <Text style={styles.photoLabel}>갤러리</Text>
        </TouchableOpacity>
      </View>

      {isPickingPhoto && !photoMetadata?.uri && (
        <ActivityIndicator
          style={{ marginTop: 24 }}
          color="#2C2A28"
          size="small"
        />
      )}

      <TouchableOpacity
        style={styles.skipButton}
        disabled={isPickingPhoto}
        onPress={() => handlePhotoPick('skip')}
      >
        <Text style={styles.skipText}>사진 선택 안 함</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <KeyboardAvoidingView
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>AI가 다듬어 본 초안이에요</Text>
      <Text style={styles.subtitle}>
        마음에 들면 그대로, 아니라면 자유롭게 고쳐주세요
      </Text>

      {photoMetadata?.uri && (
        <Image
          source={{ uri: photoMetadata.uri }}
          style={styles.previewPhoto}
          resizeMode="cover"
        />
      )}

      {isGenerating ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2C2A28" />
          <Text style={styles.loadingText}>AI가 초안을 작성 중이에요...</Text>
        </View>
      ) : (
        <TextInput
          style={styles.diaryInput}
          value={diaryText}
          onChangeText={setDiaryText}
          multiline
          textAlignVertical="top"
          placeholder="오늘의 이야기를 들려주세요..."
          placeholderTextColor="#B8B3AC"
        />
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          activeOpacity={0.85}
          onPress={handleEditMenu}
        >
          <Text style={styles.actionSecondaryText}>수정!</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionPrimary]}
          activeOpacity={0.85}
          disabled={isGenerating}
          onPress={handleSave}
        >
          <Text style={styles.actionPrimaryText}>마음에 들어요!</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {renderStepIndicator()}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E0DA',
  },
  stepDotActive: {
    width: 24,
    backgroundColor: '#2C2A28',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#8A857F',
    marginBottom: 32,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  moodButton: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  moodEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 12,
    color: '#3D3A37',
    fontWeight: '500',
    textAlign: 'center',
  },
  thumbnailWrap: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EFEAE3',
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailOverlayText: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  photoButton: {
    flex: 1,
    maxWidth: 160,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  photoLabel: {
    fontSize: 15,
    color: '#3D3A37',
    fontWeight: '500',
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 14,
    color: '#8A857F',
    textDecorationLine: 'underline',
  },
  previewPhoto: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#EFEAE3',
  },
  loadingBox: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8A857F',
    fontSize: 14,
  },
  diaryInput: {
    minHeight: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    lineHeight: 26,
    color: '#2C2A28',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: '#2C2A28',
    flex: 1.4,
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E0DA',
  },
  actionSecondaryText: {
    color: '#3D3A37',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MidDiaryScreen;
