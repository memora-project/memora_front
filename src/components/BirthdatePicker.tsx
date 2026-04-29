import React, { useState, useMemo } from 'react';
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

type Props = {
  /** 'YYYY-MM-DD' 형식. 빈 문자열이면 미선택. */
  value: string;
  onChange: (date: string) => void;
};

type Field = 'year' | 'month' | 'day';

const BirthdatePicker: React.FC<Props> = ({ value, onChange }) => {
  const [modalField, setModalField] = useState<Field | null>(null);

  // value 파싱 — 'YYYY-MM-DD' → { year, month, day }
  const parsed = useMemo(() => {
    if (!value) return { year: '', month: '', day: '' };
    const [y, m, d] = value.split('-');
    return { year: y || '', month: m || '', day: d || '' };
  }, [value]);

  // 년 옵션 (1930 ~ 올해)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: string[] = [];
    for (let y = currentYear; y >= 1930; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  // 월 옵션 (01 ~ 12)
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  }, []);

  // 일 옵션 — 선택된 년/월 따라 동적으로 (윤년 등 고려)
  const dayOptions = useMemo(() => {
    const yearNum = parseInt(parsed.year, 10);
    const monthNum = parseInt(parsed.month, 10);
    if (!yearNum || !monthNum) {
      // 년/월 미선택 시 31일까지 (임시)
      return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
    }
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [parsed.year, parsed.month]);

  // 필드 클릭 시 모달 열기
  const handleOpen = (field: Field) => {
    setModalField(field);
  };

  // 모달 닫기
  const handleClose = () => {
    setModalField(null);
  };

  // 옵션 선택 — 부모 onChange 호출
  const handleSelect = (selectedValue: string) => {
    let newYear = parsed.year;
    let newMonth = parsed.month;
    let newDay = parsed.day;

    if (modalField === 'year') newYear = selectedValue;
    if (modalField === 'month') newMonth = selectedValue;
    if (modalField === 'day') newDay = selectedValue;

    // 일이 새로운 월의 마지막 날보다 크면 보정
    if (newYear && newMonth && newDay) {
      const lastDay = new Date(parseInt(newYear, 10), parseInt(newMonth, 10), 0).getDate();
      if (parseInt(newDay, 10) > lastDay) {
        newDay = String(lastDay).padStart(2, '0');
      }
    }

    // 모두 채워졌을 때만 부모에 'YYYY-MM-DD' 형태로 전달
    if (newYear && newMonth && newDay) {
      onChange(`${newYear}-${newMonth}-${newDay}`);
    } else {
      // 일부만 채워졌으면 빈 문자열로
      onChange(`${newYear || ''}${newYear ? '-' : ''}${newMonth || ''}${newMonth ? '-' : ''}${newDay || ''}`);
    }

    handleClose();
  };

  // 현재 모달의 옵션 리스트
  const currentOptions = useMemo(() => {
    if (modalField === 'year') return yearOptions;
    if (modalField === 'month') return monthOptions;
    if (modalField === 'day') return dayOptions;
    return [];
  }, [modalField, yearOptions, monthOptions, dayOptions]);

  // 현재 선택된 값
  const currentValue = useMemo(() => {
    if (modalField === 'year') return parsed.year;
    if (modalField === 'month') return parsed.month;
    if (modalField === 'day') return parsed.day;
    return '';
  }, [modalField, parsed]);

  // 모달 타이틀
  const modalTitle = useMemo(() => {
    if (modalField === 'year') return '년 선택';
    if (modalField === 'month') return '월 선택';
    if (modalField === 'day') return '일 선택';
    return '';
  }, [modalField]);

  const renderItem = ({ item }: { item: string }) => {
    const isActive = item === currentValue;
    return (
      <TouchableOpacity
        style={[styles.listItem, isActive && styles.listItemActive]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.listItemText, isActive && styles.listItemTextActive]}>
          {item}
        </Text>
        {isActive && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* ── 트리거 3개: 년/월/일 ── */}
      <View style={styles.triggerRow}>
        <TouchableOpacity
          style={[styles.trigger, styles.triggerYear]}
          onPress={() => handleOpen('year')}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, !parsed.year && styles.triggerPlaceholder]}>
            {parsed.year || '년'}
          </Text>
          <Text style={styles.triggerArrow}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.trigger, styles.triggerMonth]}
          onPress={() => handleOpen('month')}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, !parsed.month && styles.triggerPlaceholder]}>
            {parsed.month || '월'}
          </Text>
          <Text style={styles.triggerArrow}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.trigger, styles.triggerDay]}
          onPress={() => handleOpen('day')}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, !parsed.day && styles.triggerPlaceholder]}>
            {parsed.day || '일'}
          </Text>
          <Text style={styles.triggerArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* ── 모달 ── */}
      <Modal
        visible={modalField !== null}
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
            <View style={styles.modalHeader}>
              <View style={styles.headerSpacer} />
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.headerSide}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={currentOptions}
              keyExtractor={item => item}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              initialScrollIndex={
                currentValue
                  ? Math.max(0, currentOptions.indexOf(currentValue) - 2)
                  : 0
              }
              getItemLayout={(_, index) => ({
                length: 60,
                offset: 60 * index,
                index,
              })}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    minHeight: 52,
  },
  triggerYear: {
    flex: 2,
  },
  triggerMonth: {
    flex: 1,
  },
  triggerDay: {
    flex: 1,
  },
  triggerText: {
    fontSize: 17,
    color: '#2C2A28',
    fontWeight: '500',
  },
  triggerPlaceholder: {
    color: '#B5AFA8',
    fontWeight: '400',
  },
  triggerArrow: {
    fontSize: 11,
    color: '#8A857F',
    marginLeft: 6,
  },

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
    height: 60,
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
  checkMark: {
    fontSize: 18,
    color: '#2C2A28',
    fontWeight: '700',
  },
});

export default BirthdatePicker;