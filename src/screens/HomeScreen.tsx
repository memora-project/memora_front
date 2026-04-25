import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../navigation/AppNavigator';

type ListEntry = {
  id: string;
  date: string;
  summary: string;
  mood: { emoji: string; label: string };
  content: string;
  photoUri?: string;
};

const DATA: ListEntry[] = [
  {
    id: '1',
    date: '2026-04-26',
    summary: '오늘은 NestJS 백엔드 설계를 시작했다. 새로운 도전이 기대된다.',
    mood: { emoji: '😊', label: '최고에요' },
    content:
      '오늘은 NestJS 백엔드 설계를 시작했다. 새로운 도전이 기대된다. 모듈 구조를 어떻게 잡을지 한참 고민했다.',
  },
  {
    id: '2',
    date: '2026-04-25',
    summary: '자바 17 환경 설정을 마무리했다. 드디어 개발 환경이 갖춰졌다.',
    mood: { emoji: '😌', label: '평온해요' },
    content:
      '자바 17 환경 설정을 마무리했다. 드디어 개발 환경이 갖춰졌다. 작은 일이지만 성취감이 있다.',
  },
  {
    id: '3',
    date: '2026-04-24',
    summary: '첫 번째 메모를 남기며 새로운 일기 앱과 함께하는 여정을 시작했다.',
    mood: { emoji: '🤔', label: '저도 모르겠어요' },
    content:
      '첫 번째 메모를 남기며 새로운 일기 앱과 함께하는 여정을 시작했다. 무엇을 적어야 할지 막막하지만, 작은 한 걸음부터.',
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const handleOpenDetail = (entry: ListEntry) => {
    navigation.navigate('Detail', {
      entry: {
        id: entry.id,
        date: entry.date,
        mood: entry.mood,
        photoUri: entry.photoUri,
        content: entry.content,
      },
    });
  };

  const handleWriteNew = () => {
    navigation.navigate('MidDiary');
  };

  const renderItem = ({ item }: { item: ListEntry }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.85}
      onPress={() => handleOpenDetail(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{item.date}</Text>
        <Text style={styles.itemMood}>{item.mood.emoji}</Text>
      </View>
      <Text style={styles.itemSummary} numberOfLines={2}>
        {item.summary}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Memora</Text>
        <Text style={styles.headerSubtitle}>오늘의 마음을 기록해 보세요</Text>
      </View>

      <FlatList
        data={DATA}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

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
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
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
