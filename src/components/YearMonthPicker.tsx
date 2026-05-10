import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Text } from './AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../contexts/SettingsContext';

type Props = {
  visible: boolean;
  currentDate: string;
  onClose: () => void;
  onSelect: (newDate: string) => void;
};

const YearMonthPicker: React.FC<Props> = ({ visible, currentDate, onClose, onSelect }) => {
  const { scale } = useSettings();

  const parsed = useMemo(() => {
    if (!currentDate || typeof currentDate !== 'string') {
      const now = new Date();
      return {
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1).padStart(2, '0'),
      };
    }
    const [y, m] = currentDate.split('-');
    return {
      year: y || String(new Date().getFullYear()),
      month: m || '01',
    };
  }, [currentDate]);

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: string[] = [];
    for (let y = currentYear + 5; y >= currentYear - 100; y--) {
      years.push(String(y));
    }
    return years;
  }, [currentYear]);

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    [],
  );

  const handleYearSelect = (year: string) => {
    if (typeof onSelect === 'function') {
      onSelect(`${year}-${parsed.month}-01`);
    }
  };

  const handleMonthSelect = (month: string) => {
    if (typeof onSelect === 'function') {
      onSelect(`${parsed.year}-${month}-01`);
    }
  };

  const itemHeight = scale(48);

  const renderYearItem = ({ item }: { item: string }) => {
    const isActive = item === parsed.year;
    return (
      <TouchableOpacity
        style={[styles.listItem, isActive && styles.listItemActive, { height: itemHeight }]}
        onPress={() => handleYearSelect(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.listItemText,
            isActive && styles.listItemTextActive,
            { fontSize: scale(17) },
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMonthItem = ({ item }: { item: string }) => {
    const isActive = item === parsed.month;
    return (
      <TouchableOpacity
        style={[styles.listItem, isActive && styles.listItemActive, { height: itemHeight }]}
        onPress={() => handleMonthSelect(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.listItemText,
            isActive && styles.listItemTextActive,
            { fontSize: scale(17) },
          ]}
        >
          {parseInt(item, 10)}월
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />

      <View style={styles.modalContent}>
        <SafeAreaView edges={['bottom']} style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View style={styles.headerSide} />
            <Text style={[styles.modalTitle, { fontSize: scale(18) }]}>년/월 선택</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.headerSide}
            >
              <Text style={[styles.modalClose, { fontSize: scale(22) }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.column}>
              <Text style={[styles.columnLabel, { fontSize: scale(13) }]}>년도</Text>
              <FlatList
                data={yearOptions}
                keyExtractor={item => `year-${item}`}
                renderItem={renderYearItem}
                showsVerticalScrollIndicator={false}
                initialScrollIndex={Math.max(0, yearOptions.indexOf(parsed.year) - 2)}
                getItemLayout={(_, index) => ({
                  length: itemHeight,
                  offset: itemHeight * index,
                  index,
                })}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.column}>
              <Text style={[styles.columnLabel, { fontSize: scale(13) }]}>월</Text>
              <FlatList
                data={monthOptions}
                keyExtractor={item => `month-${item}`}
                renderItem={renderMonthItem}
                showsVerticalScrollIndicator={false}
                initialScrollIndex={Math.max(0, monthOptions.indexOf(parsed.month) - 2)}
                getItemLayout={(_, index) => ({
                  length: itemHeight,
                  offset: itemHeight * index,
                  index,
                })}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
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
    fontWeight: '700',
    color: '#2C2A28',
    textAlign: 'center',
  },
  modalClose: {
    color: '#8A857F',
    textAlign: 'right',
  },
  headerSide: {
    width: 32,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 12,
  },
  column: {
    flex: 1,
  },
  columnLabel: {
    color: '#8A857F',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    width: 1,
    backgroundColor: '#EFEAE3',
  },
  listItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemActive: {
    backgroundColor: '#F2EEE8',
  },
  listItemText: {
    color: '#3D3A37',
    fontWeight: '500',
  },
  listItemTextActive: {
    fontWeight: '700',
    color: '#2C2A28',
  },
});

export default YearMonthPicker;