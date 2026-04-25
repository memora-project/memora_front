import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import type { HomeScreenProps } from '../navigation/AppNavigator';
import { getAllDiaries, type DiaryEntry } from '../storage/diaryStorage';

const formatDate = (iso: string): string => {
  // ISO("2026-04-26T05:21:00.000Z") → "2026-04-26"
  return iso.slice(0, 10);
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 화면이 포커스될 때마다 (저장 후 돌아왔을 때 포함) 최신 목록을 다시 가져온다.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        try {
          const list = await getAllDiaries();
          if (!cancelled) setEntries(list);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleOpenDetail = (entry: DiaryEntry) => {
    navigation.navigate('Detail', { entryId: entry.id });
  };

  const handleWriteNew = () => {
    navigation.navigate('MidDiary');
  };

  const renderItem = ({ item }: { item: DiaryEntry }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => handleOpenDetail(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        {item.mood && <Text style={styles.itemMood}>{item.mood.emoji}</Text>}
      </View>
      <Text style={styles.itemSummary} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>📔</Text>
      <Text style={styles.emptyTitle}>첫 일기를 작성해 보세요!</Text>
      <Text style={styles.emptySubtitle}>
        오른쪽 아래 + 버튼을 눌러 오늘의 마음을 담아보세요
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Memora</Text>
        <Text style={styles.headerSubtitle}>오늘의 마음을 기록해 보세요</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            entries.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleWriteNew}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  headerWrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#8A857F',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  item: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDate: {
    fontSize: 13,
    color: '#A09B95',
    fontWeight: '500',
  },
  itemMood: {
    fontSize: 22,
  },
  itemSummary: {
    fontSize: 15,
    color: '#3D3A37',
    lineHeight: 22,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8A857F',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2A28',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },
});

export default HomeScreen;
