import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DAEJEON_DISTRICTS,
  DISTRICTS_BY_GU,
  GU_LIST,
  type District,
} from '../constants/districts';
import { lookupCurrentDistrict } from '../api/geo';

type Props = {
  selectedValue: string;
  onSelect: (district: District) => void;
  placeholder?: string;
  /** "내 위치로 자동 입력" 버튼 노출 여부. 기본 true. */
  enableGps?: boolean;
};

const DistrictPicker: React.FC<Props> = ({
  selectedValue,
  onSelect,
  placeholder = '동네를 선택하세요',
  enableGps = true,
}) => {
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleGpsPress = async () => {
    if (gpsLoading) return;
    setGpsLoading(true);
    try {
      const result = await lookupCurrentDistrict();
      if (result.kind === 'success') {
        onSelect(result.district);
        return;
      }
      if (result.kind === 'permission_denied' || result.kind === 'no_coords') {
        Alert.alert(
          '위치를 가져오지 못했어요',
          '위치 권한을 켠 뒤 다시 시도하거나, 직접 동네를 선택해 주세요.',
        );
        return;
      }
      if (result.kind === 'out_of_daejeon') {
        Alert.alert(
          '대전 외 지역인 것 같아요',
          result.address
            ? `현재 위치: ${result.address}\n\n앱은 대전 동네만 지원합니다. 직접 선택해 주세요.`
            : '앱은 대전 동네만 지원합니다. 직접 선택해 주세요.',
        );
        return;
      }
      Alert.alert('오류', result.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const [modalVisible, setModalVisible] = useState(false);
  // 'gu' = 구 선택 단계, 'dong' = 동 선택 단계
  const [step, setStep] = useState<'gu' | 'dong'>('gu');
  // 사용자가 선택한 구 (동 선택 단계로 가기 위해)
  const [selectedGu, setSelectedGu] = useState<string | null>(null);

  // selectedValue는 District.label 문자열("유성구 봉명동"). 백엔드/AuthContext가 label로 저장하므로 label로 매칭.
  const selected = DAEJEON_DISTRICTS.find(d => d.label === selectedValue);

  // 모달 열 때 — 항상 구 선택 단계부터
  const handleOpen = () => {
    setStep('gu');
    setSelectedGu(null);
    setModalVisible(true);
  };

  // 모달 닫을 때 — 상태 리셋
  const handleClose = () => {
    setModalVisible(false);
    setStep('gu');
    setSelectedGu(null);
  };

  // 구 선택 → 동 선택 단계로
  const handleSelectGu = (gu: string) => {
    setSelectedGu(gu);
    setStep('dong');
  };

  // 다른 구 선택하러 뒤로 가기
  const handleBackToGu = () => {
    setStep('gu');
    setSelectedGu(null);
  };

  // 동 선택 → 부모에 전달 + 모달 닫기
  const handleSelectDong = (district: District) => {
    onSelect(district);
    handleClose();
  };

  // ─── 구 리스트 렌더 ───
  const renderGuItem = ({ item }: { item: string }) => {
    const isCurrentGu = selected?.gu === item;
    return (
      <TouchableOpacity
        style={[styles.listItem, isCurrentGu && styles.listItemActive]}
        onPress={() => handleSelectGu(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.listItemText, isCurrentGu && styles.listItemTextActive]}>
          {item}
        </Text>
        <Text style={styles.arrowRight}>›</Text>
      </TouchableOpacity>
    );
  };

  // ─── 동 리스트 렌더 ───
  const renderDongItem = ({ item }: { item: District }) => {
    const isActive = item.label === selectedValue;
    return (
      <TouchableOpacity
        style={[styles.listItem, isActive && styles.listItemActive]}
        onPress={() => handleSelectDong(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.listItemText, isActive && styles.listItemTextActive]}>
          {item.dong}
        </Text>
        {isActive && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {enableGps && (
        <TouchableOpacity
          style={[styles.gpsBtn, gpsLoading && styles.gpsBtnDisabled]}
          onPress={handleGpsPress}
          activeOpacity={0.7}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#2C2A28" />
          ) : (
            <Text style={styles.gpsBtnText}>📍 내 위치로 자동 입력</Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── 트리거 (입력 필드처럼 보이는 버튼) ── */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedValue && styles.triggerPlaceholder,
          ]}
        >
          {/* selected를 못 찾아도(예: 우리 리스트에 없는 주소) 저장된 문자열을 그대로 보여줌 */}
          {selected ? selected.label : selectedValue || placeholder}
        </Text>
        <Text style={styles.triggerArrow}>▼</Text>
      </TouchableOpacity>

      {/* ── 모달 ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalContent}>
          <SafeAreaView edges={['bottom']} style={styles.modalSafe}>
            {/* ── 모달 헤더 (단계별 다르게) ── */}
            <View style={styles.modalHeader}>
              {step === 'gu' ? (
                <View style={styles.headerSpacer} />
              ) : (
                <TouchableOpacity
                  onPress={handleBackToGu}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.headerSide}
                >
                  <Text style={styles.modalBack}>‹</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.modalTitle}>
                {step === 'gu' ? '구를 선택하세요' : `${selectedGu} 동 선택`}
              </Text>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerSide}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── 리스트 ── */}
            {step === 'gu' ? (
              <FlatList
                data={GU_LIST}
                keyExtractor={item => item}
                renderItem={renderGuItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <FlatList
                data={
                selectedGu
                    ? [...DISTRICTS_BY_GU[selectedGu]].sort((a, b) =>
                        a.dong.localeCompare(b.dong, 'ko'),
                    )
                    : []
                }
                keyExtractor={item => item.value}
                renderItem={renderDongItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // ── GPS 버튼 ──
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E0DA',
    backgroundColor: '#FFFFFF',
    minHeight: 40,
  },
  gpsBtnDisabled: {
    opacity: 0.6,
  },
  gpsBtnText: {
    fontSize: 14,
    color: '#2C2A28',
    fontWeight: '500',
  },
  // ── 트리거 ──
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    minHeight: 52,
  },
  triggerText: {
    flex: 1,
    fontSize: 17,
    color: '#2C2A28',
  },
  triggerPlaceholder: {
    color: '#B5AFA8',
  },
  triggerArrow: {
    fontSize: 12,
    color: '#8A857F',
    marginLeft: 8,
  },

  // ── 모달 ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalSafe: {
    flex: 1,
  },

  // ── 모달 헤더 ──
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE3',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2A28',
    textAlign: 'center',
  },
  modalBack: {
    fontSize: 30,
    color: '#2C2A28',
    fontWeight: '300',
    lineHeight: 32,
  },
  modalClose: {
    fontSize: 22,
    color: '#8A857F',
    textAlign: 'right',
  },
  headerSide: {
    width: 32,
  },
  headerSpacer: {
    width: 32,
  },

  // ── 리스트 ──
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EEE8',
  },
  listItemActive: {
    backgroundColor: '#F2EEE8',
  },
  listItemText: {
    fontSize: 18,
    color: '#3D3A37',
    fontWeight: '500',
  },
  listItemTextActive: {
    fontWeight: '700',
    color: '#2C2A28',
  },
  arrowRight: {
    fontSize: 22,
    color: '#A09B95',
    fontWeight: '300',
  },
  checkMark: {
    fontSize: 18,
    color: '#2C2A28',
    fontWeight: '700',
  },
});

export default DistrictPicker;