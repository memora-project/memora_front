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
  /** 큰 이모지(선택). 시각적 임팩트용. */
  emoji?: string;
  title: string;
  /** 본문 — `\n` 줄바꿈 허용. */
  message: string;
  /** 기본 '나가기'. */
  confirmLabel?: string;
  /** 기본 '머무르기'. */
  cancelLabel?: string;
  /** true면 확인 버튼이 위험(빨간색) 스타일. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 두 버튼(취소/확인) 확인 모달.
 * SuccessModal과 같은 톤 — 어르신 친화 큰 버튼/큰 글자.
 */
const ConfirmModal: React.FC<Props> = ({
  visible,
  emoji,
  title,
  message,
  confirmLabel = '나가기',
  cancelLabel = '머무르기',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const { scale } = useSettings();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
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
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <Text style={[styles.title, { fontSize: scale(20), lineHeight: scale(28) }]}>
            {title}
          </Text>
          <Text style={[styles.message, { fontSize: scale(15), lineHeight: scale(22) }]}>
            {message}
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.85}
            >
              <Text style={[styles.cancelText, { fontSize: scale(16) }]}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                destructive ? styles.destructiveBtn : styles.confirmBtn,
              ]}
              onPress={onConfirm}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmText, { fontSize: scale(16) }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 14,
  },
  title: {
    color: '#2C2A28',
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: '#5C5852',
    textAlign: 'center',
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F2EEE8',
  },
  cancelText: {
    color: '#3D3A37',
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#2C2A28',
  },
  destructiveBtn: {
    backgroundColor: '#C0392B',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ConfirmModal;
