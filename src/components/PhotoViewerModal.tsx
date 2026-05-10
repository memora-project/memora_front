import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Text } from './AppText';
import { resolveImageUrl } from '../api/files';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = {
  visible: boolean;
  photos: string[];
  startIndex: number;
  onClose: () => void;
};

/**
 * 사진 전체보기 모달 — 검은 배경 + 좌우 스와이프 + 우상단 닫기.
 *
 * 크기 처리: page/image/ScrollView 모두 명시적 SCREEN_WIDTH×SCREEN_HEIGHT 사용.
 * '100%'는 부모 height가 결정되지 않으면 0으로 계산되어 사진이 안 보일 수 있어서
 * 안전하게 화면 dimensions를 직접 박는다.
 */
const PhotoViewerModal: React.FC<Props> = ({
  visible,
  photos,
  startIndex,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {visible && photos.length > 0 && (
          <ScrollView
            style={styles.scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: startIndex * SCREEN_WIDTH, y: 0 }}
            decelerationRate="fast"
          >
            {photos.map((url, idx) => (
              <View key={`viewer-${idx}`} style={styles.page}>
                <Image
                  source={{ uri: resolveImageUrl(url) }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.close}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        {photos.length > 1 && (
          <Text style={styles.hint}>
            ← 옆으로 넘겨 보세요 ({photos.length}장) →
          </Text>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  scroll: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  close: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 36,
    fontWeight: '300',
  },
  hint: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
});

export default PhotoViewerModal;
