import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DAEJEON_DISTRICTS,
  DISTRICTS_BY_GU,
  GU_LIST,
  type District,
} from '../constants/districts';

type Props = {
  selectedValue: string;
  onSelect: (district: District) => void;
  placeholder?: string;
};

const DistrictPicker: React.FC<Props> = ({
  selectedValue,
  onSelect,
  placeholder = '동네를 선택하세요',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  // 'gu' = 구 선택 단계, 'dong' = 동 선택 단계
  const [step, setStep] = useState<'gu' | 'dong'>('gu');
  // 사용자가 선택한 구 (동 선택 단계로 가기 위해)
  const [selectedGu, setSelectedGu] = useState<string | null>(null);

  const selected = DAEJEON_DISTRICTS.find(d => d.value === selectedValue);

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
    const isActive = item.value === selectedValue;
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
      {/* ── 트리거 (입력 필드처럼 보이는 버튼) ── */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selected && styles.triggerPlaceholder]}>
          {selected ? selected.label : placeholder}
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
                  <Text style={styles.modalBack}>←</Text>
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
    fontSize: 24,
    color: '#2C2A28',
    fontWeight: '300',
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