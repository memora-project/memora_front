import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSettings, FontSize } from '../contexts/SettingsContext';
import type { FontSizeScreenProps } from '../navigation/AppNavigator';

const OPTIONS: { value: FontSize; label: string; description: string; previewSize: number }[] = [
  { value: 'SMALL', label: '작게', description: '기본 크기', previewSize: 16 },
  { value: 'MEDIUM', label: '보통', description: '권장 크기', previewSize: 19 },
  { value: 'LARGE', label: '크게', description: '어르신 권장', previewSize: 24 },
];

const FontSizeScreen: React.FC<FontSizeScreenProps> = ({ navigation }) => {
  const { fontSize, setFontSize, scale } = useSettings();

  const handleSelect = async (size: FontSize) => {
    if (size === fontSize) return;
    try {
      await setFontSize(size);
    } catch (error) {
      Alert.alert('오류', '글씨 크기 저장에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scale(18) }]}>글씨 크기</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.subtitle, { fontSize: scale(14) }]}>
          앱 전체에 적용할 글씨 크기를 선택해 주세요.
        </Text>

        {OPTIONS.map(option => {
          const isActive = fontSize === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isActive && styles.optionActive]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionMain}>
                <Text style={[styles.optionPreview, { fontSize: option.previewSize }]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionDescription, { fontSize: scale(13) }]}>
                  {option.description}
                </Text>
              </View>
              {isActive && (
                <View style={styles.checkWrap}>
                  <Icon name="checkmark-circle" size={26} color="#2C2A28" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* 미리보기 */}
        <View style={styles.previewCard}>
          <Text style={[styles.previewTitle, { fontSize: scale(13) }]}>미리보기</Text>
          <Text style={[styles.previewBody, { fontSize: scale(16) }]}>
            오늘 하루 어떻게 보내셨나요?
          </Text>
          <Text style={[styles.previewSub, { fontSize: scale(13) }]}>
            손주와 함께 일기를 쓰며 추억을 남겨보세요.
          </Text>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: {
    fontSize: 28,
    color: '#2C2A28',
    width: 32,
    fontWeight: '300',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  subtitle: {
    color: '#8A857F',
    marginBottom: 20,
    lineHeight: 22,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: {
    borderColor: '#2C2A28',
  },
  optionMain: {
    flex: 1,
  },
  optionPreview: {
    color: '#2C2A28',
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#8A857F',
  },
  checkWrap: {
    marginLeft: 12,
  },
  previewCard: {
    marginTop: 24,
    padding: 18,
    backgroundColor: '#F2EEE8',
    borderRadius: 12,
  },
  previewTitle: {
    color: '#A09B95',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  previewBody: {
    color: '#2C2A28',
    fontWeight: '600',
    marginBottom: 6,
  },
  previewSub: {
    color: '#3D3A37',
    lineHeight: 20,
  },
});

export default FontSizeScreen;