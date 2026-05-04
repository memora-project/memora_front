import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ImagePicker from 'react-native-image-crop-picker';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { uploadImage, resolveImageUrl } from '../api/files';
import type { SettingsStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'GrandchildPhoto'>;

/**
 * 손주 얼굴 사진 설정 화면.
 *
 * 흐름:
 *   1) 카메라 또는 갤러리에서 사진 1장 선택
 *   2) image-crop-picker가 1:1 + 원형 오버레이로 크롭 UI 띄움
 *   3) 크롭된 이미지를 백엔드에 업로드 (/files/images)
 *   4) 받은 url을 PATCH /users/me로 grandchildPhotoUrl에 저장
 *   5) AuthContext state도 갱신 → HomeScreen 빈 상태에서 즉시 반영
 */
const GrandchildPhotoScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { scale } = useSettings();
  const { userGrandchildPhotoUrl, updateGrandchildPhoto } = useAuth();

  const [isPicking, setIsPicking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const requestAndroidPermission = async (
    source: 'camera' | 'gallery',
  ): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const sdk =
      typeof Platform.Version === 'number'
        ? Platform.Version
        : parseInt(String(Platform.Version), 10);

    const perm =
      source === 'camera'
        ? PermissionsAndroid.PERMISSIONS.CAMERA
        : sdk >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    try {
      const result = await PermissionsAndroid.request(perm);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('권한 요청 실패:', e);
      return false;
    }
  };

  const pickAndUpload = async (source: 'camera' | 'gallery') => {
    if (isPicking || isUploading) return;
    setIsPicking(true);
    try {
      const granted = await requestAndroidPermission(source);
      if (!granted) {
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

      // 1) 사진 선택 + 1:1 원형 크롭
      const opts = {
        mediaType: 'photo' as const,
        cropping: true,
        cropperCircleOverlay: true,
        width: 600,
        height: 600,
        compressImageQuality: 0.85,
        includeExif: false,
      };
      const image =
        source === 'camera'
          ? await ImagePicker.openCamera(opts)
          : await ImagePicker.openPicker(opts);

      const uri = image.path.startsWith('file://')
        ? image.path
        : `file://${image.path}`;

      // 2) 백엔드 업로드 → 서버 url
      setIsPicking(false);
      setIsUploading(true);
      const url = await uploadImage(uri);

      // 3) PATCH /users/me로 user.grandchildPhotoUrl 저장
      await updateGrandchildPhoto(url);

      Alert.alert('저장 완료', '손주 얼굴이 설정되었어요.');
    } catch (e: any) {
      if (e?.code === 'E_PICKER_CANCELLED') {
        return;
      }
      Alert.alert('실패', e?.message ?? '사진을 처리하지 못했어요.');
    } finally {
      setIsPicking(false);
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    if (!userGrandchildPhotoUrl) return;
    Alert.alert(
      '손주 얼굴 사진 삭제',
      '설정한 사진을 지울까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setIsUploading(true);
            try {
              await updateGrandchildPhoto(''); // 빈 문자열 → 백엔드 null 처리
            } catch (e: any) {
              Alert.alert('실패', e?.message ?? '사진을 지우지 못했어요.');
            } finally {
              setIsUploading(false);
            }
          },
        },
      ],
    );
  };

  const busy = isPicking || isUploading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backTouch}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(20) }]}>
          손주 얼굴 설정
        </Text>
        <View style={styles.backTouch} />
      </View>

      <View style={styles.content}>
        <View style={styles.previewWrap}>
          {userGrandchildPhotoUrl ? (
            <Image
              source={{ uri: resolveImageUrl(userGrandchildPhotoUrl) }}
              style={styles.preview}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.preview, styles.previewEmpty]}>
              <Text style={styles.previewEmptyEmoji}>👶</Text>
            </View>
          )}
          {busy && (
            <View style={styles.previewOverlay}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={[styles.helperText, { fontSize: scale(13) }]}>
          홈 화면 빈 상태에서 손주 얼굴이 보여요
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => pickAndUpload('gallery')}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { fontSize: scale(16) }]}>
              {isUploading ? '저장 중...' : '갤러리에서 선택'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={() => pickAndUpload('camera')}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { fontSize: scale(16) }]}>
              카메라로 촬영
            </Text>
          </TouchableOpacity>

          {userGrandchildPhotoUrl && (
            <TouchableOpacity
              style={[styles.removeBtn, busy && styles.btnDisabled]}
              disabled={busy}
              onPress={handleRemove}
              activeOpacity={0.85}
            >
              <Text style={[styles.removeBtnText, { fontSize: scale(15) }]}>
                사진 삭제
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 30,
    color: '#2C2A28',
    fontWeight: '300',
    lineHeight: 32,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  previewWrap: {
    marginTop: 32,
    width: 200,
    height: 200,
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#EFEAE3',
  },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmptyEmoji: {
    fontSize: 96,
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    color: '#8A857F',
    marginTop: 16,
    marginBottom: 28,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#2C2A28',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2C2A28',
  },
  secondaryBtnText: {
    color: '#2C2A28',
    fontWeight: '700',
  },
  removeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  removeBtnText: {
    color: '#D9534F',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default GrandchildPhotoScreen;
