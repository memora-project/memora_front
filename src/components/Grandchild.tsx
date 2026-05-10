import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { Text } from './AppText';
import { useSettings } from '../contexts/SettingsContext';

export type GrandchildMood = 'happy' | 'caring' | 'curious' | 'cheering';
export type GrandchildGender = 'grandson' | 'granddaughter';

type Props = {
  /** 손주가 할 말 */
  message: string;
  /** 표정 (기본: caring) */
  mood?: GrandchildMood;
  /** 크기 (기본: medium) */
  size?: 'small' | 'medium' | 'large';
  /** 사용자가 업로드한 손주 사진 (있으면 사진, 없으면 이모지) */
  photoUri?: string | null;
  /** 손자(grandson) 또는 손녀(granddaughter), 기본 손자 */
  gender?: GrandchildGender;
};

// 표정별 이모지 (사진이 없을 때 fallback)
const MOOD_EMOJI: Record<GrandchildGender, Record<GrandchildMood, string>> = {
  grandson: {
    happy: '😄',
    caring: '🤗',
    curious: '🤔',
    cheering: '💪',
  },
  granddaughter: {
    happy: '😊',
    caring: '🥰',
    curious: '🤨',
    cheering: '✨',
  },
};

const SIZE_MAP = {
  small: { avatar: 40, fontSize: 13 },
  medium: { avatar: 56, fontSize: 14 },
  large: { avatar: 72, fontSize: 15 },
};

const Grandchild: React.FC<Props> = ({
  message,
  mood = 'caring',
  size = 'medium',
  photoUri,
  gender = 'grandson',
}) => {
  const { scale } = useSettings();
  const sizeConfig = SIZE_MAP[size];

  // 사진이 있는지 판단
  const hasPhoto = photoUri && typeof photoUri === 'string' && photoUri.length > 0;

  return (
    <View style={styles.container}>
      {/* 캐릭터 아바타 */}
      <View
        style={[
          styles.avatar,
          {
            width: sizeConfig.avatar,
            height: sizeConfig.avatar,
            borderRadius: sizeConfig.avatar / 2,
          },
        ]}
      >
        {hasPhoto ? (
          // 사진이 있으면 사진 표시
          <Image
            source={{ uri: photoUri as string }}
            style={[
              styles.photo,
              {
                width: sizeConfig.avatar - 4, // 테두리 안에 살짝 작게
                height: sizeConfig.avatar - 4,
                borderRadius: (sizeConfig.avatar - 4) / 2,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          // 없으면 이모지 (성별 따라)
          <Text style={{ fontSize: sizeConfig.avatar * 0.55 }}>
            {MOOD_EMOJI[gender][mood]}
          </Text>
        )}
      </View>

      {/* 말풍선 */}
      <View style={styles.bubbleWrap}>
        <View style={styles.bubbleTail} />
        <View style={styles.bubble}>
          <Text style={[styles.bubbleText, { fontSize: scale(sizeConfig.fontSize) }]}>
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  avatar: {
    backgroundColor: '#FFF4D9',
    borderWidth: 2,
    borderColor: '#F4B860',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // 사진이 둥근 테두리 밖으로 안 나가게
  },
  photo: {
    // 사진 자체 스타일 (위에서 동적으로 적용됨)
  },
  bubbleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingTop: 8,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: '#FFFFFF',
  },
  bubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    color: '#3D3A37',
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default Grandchild;