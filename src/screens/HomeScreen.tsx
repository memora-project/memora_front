import React, { useCallback, useState, useMemo } from 'react';
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
import AppHeader from '../components/AppHeader';
import Grandchild, { type GrandchildMood } from '../components/Grandchild';
import { useSettings } from '../contexts/SettingsContext';

import type { HomeScreenProps } from '../navigation/AppNavigator';
import { getAllDiaries, type DiaryEntry } from '../storage/diaryStorage';

const formatDate = (iso: string): string => {
  return iso.slice(0, 10);
};

// 시간대별 인사말
const getGreeting = (
  name: string | null,
  hasEntryToday: boolean,
): { message: string; mood: GrandchildMood } => {
  const hour = new Date().getHours();
  const userName = name || '할머니';

  if (hasEntryToday) {
    return {
      message: `${userName}, 오늘도 일기 써주셔서 감사해요! 💛`,
      mood: 'happy',
    };
  }

  if (hour < 6) {
    return {
      message: `${userName}, 너무 늦은 시간이에요. 편안한 밤 되세요.`,
      mood: 'caring',
    };
  }
  if (hour < 12) {
    return {
      message: `${userName}, 좋은 아침이에요! 오늘은 어떠셨어요?`,
      mood: 'curious',
    };
  }
  if (hour < 18) {
    return {
      message: `${userName}, 오후도 잘 보내고 계신가요?`,
      mood: 'caring',
    };
  }
  return {
    message: `${userName}, 오늘 하루도 수고하셨어요!`,
    mood: 'cheering',
  };
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { scale } = useSettings();
  const userName = null;
  // 오늘 일기 작성 여부 확인
  const hasEntryToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return entries.some(entry => formatDate(entry.createdAt) === today);
  }, [entries]);

  // 손주 인사말
  const greeting = useMemo(
    () => getGreeting(userName, hasEntryToday),
    [userName, hasEntryToday],
  );

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

  // 손주 인사 카드 (FlatList 헤더로 사용)
  const renderListHeader = () => (
    <View style={styles.greetingCard}>
      <Grandchild
        message={greeting.message}
        mood={greeting.mood}
        size="large"
        // photoUri={null}  // TODO: 미래 — 사용자가 설정한 손주 사진
        // gender="grandson" // TODO: 미래 — 설정에서 손자/손녀 선택
      />
    </View>
  );

  const renderItem = ({ item }: { item: DiaryEntry }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => handleOpenDetail(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.itemDate, { fontSize: scale(13) }]}>
          {formatDate(item.createdAt)}
        </Text>
        {item.mood && <Text style={styles.itemMood}>{item.mood.emoji}</Text>}
      </View>
      <Text
        style={[styles.itemSummary, { fontSize: scale(15) }]}
        numberOfLines={2}
      >
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>📔</Text>
      <Text style={[styles.emptyTitle, { fontSize: scale(18) }]}>
        첫 일기를 작성해 보세요!
      </Text>
      <Text style={[styles.emptySubtitle, { fontSize: scale(14) }]}>
        오른쪽 아래 + 버튼을 눌러 오늘의 마음을 담아보세요
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
      <AppHeader />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderListHeader}
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

  // 손주 인사 카드
  greetingCard: {
    backgroundColor: '#FFFCF5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F4E5C9',
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
    color: '#A09B95',
    fontWeight: '500',
  },
  itemMood: {
    fontSize: 22,
  },
  itemSummary: {
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
    fontWeight: '600',
    color: '#3D3A37',
    marginBottom: 8,
  },
  emptySubtitle: {
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