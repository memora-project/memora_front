import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Text } from './AppText';
import { useSettings } from '../contexts/SettingsContext';

type Props = {
  visible: boolean;
  /** 큰 이모지 (체크/달 등) — 시각적 임팩트용. 기본 ✨. */
  emoji?: string;
  title: string;
  /** 본문 — `\n` 줄바꿈 허용. */
  message: string;
  /** 기본 '확인'. */
  buttonLabel?: string;
  onClose: () => void;
};

/**
 * 일기 저장 완료 등 성공 피드백 모달.
 *
 * 어르신 친화 디자인 — 큰 이모지/큰 글자/큰 버튼.
 * 페이드+살짝 위로 올라오는 애니메이션으로 부드럽게 등장.
 */
const SuccessModal: React.FC<Props> = ({
  visible,
  emoji = '✨',
  title,
  message,
  buttonLabel = '확인',
  onClose,
}) => {
  const { scale } = useSettings();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      // 카드 페이드인 + 살짝 위로 슬라이드
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(20);
    }
  }, [visible, opacity, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.title, { fontSize: scale(22) }]}>{title}</Text>
          <Text style={[styles.message, { fontSize: scale(15), lineHeight: scale(24) }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { fontSize: scale(17) }]}>
              {buttonLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    color: '#2C2A28',
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#5C5852',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    backgroundColor: '#2C2A28',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default SuccessModal;
