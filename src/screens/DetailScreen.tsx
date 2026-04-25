import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import type { DetailScreenProps } from '../navigation/AppNavigator';
import {
  getDiaryById,
  deleteDiary,
  type DiaryEntry,
} from '../storage/diaryStorage';

const formatDate = (iso: string): string => iso.slice(0, 10);

const DetailScreen: React.FC<DetailScreenProps> = ({ navigation, route }) => {
  const { entryId } = route.params;
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // 화면 포커스 시 storage에서 다시 읽음 (편집 후 돌아왔을 때 등 대비)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setIsLoading(true);
        try {
          const found = await getDiaryById(entryId);
          if (!cancelled) setEntry(found);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [entryId]),
  );

  const handleDelete = () => {
    Alert.alert(
      '일기를 삭제할까요?',
      '한 번 삭제한 일기는 다시 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteDiary(entryId);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert(
                '삭제 실패',
                e?.message ?? '알 수 없는 오류가 발생했어요.',
              );
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color="#2C2A28" />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerWrap}>
          <Text style={styles.notFoundText}>일기를 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          activeOpacity={0.7}
          disabled={isDeleting}
          onPress={handleDelete}
        >
          <Text
            style={[
              styles.deleteText,
              isDeleting && { opacity: 0.4 },
            ]}
          >
            삭제
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
          {entry.mood && (
            <View style={styles.moodPill}>
              <Text style={styles.moodEmoji}>{entry.mood.emoji}</Text>
              <Text style={styles.moodLabel}>{entry.mood.label}</Text>
            </View>
          )}
        </View>

        {entry.photoUri ? (
          <Image
            source={{ uri: entry.photoUri }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderIcon}>🖼️</Text>
            <Text style={styles.photoPlaceholderText}>사진 없음</Text>
          </View>
        )}

        {(entry.takenAt || entry.locationLabel !== '위치 정보 없음') && (
          <View style={styles.metaRow}>
            {entry.takenAt && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>📅</Text>
                <Text style={styles.metaChipValue}>
                  {entry.takenAt.slice(0, 10)}
                </Text>
              </View>
            )}
            {entry.locationLabel !== '위치 정보 없음' && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipLabel}>📍</Text>
                <Text style={styles.metaChipValue}>{entry.locationLabel}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.contentCard}>
          <Text style={styles.content}>{entry.content}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 15,
    color: '#8A857F',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 30,
    color: '#2C2A28',
    lineHeight: 32,
    fontWeight: '300',
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#C0392B',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  date: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2A28',
    letterSpacing: -0.3,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  moodEmoji: {
    fontSize: 18,
  },
  moodLabel: {
    fontSize: 13,
    color: '#3D3A37',
    fontWeight: '500',
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: '#EFEAE3',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 40,
    opacity: 0.4,
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#A09B95',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 4,
  },
  metaChipLabel: {
    fontSize: 12,
  },
  metaChipValue: {
    fontSize: 12,
    color: '#3D3A37',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  content: {
    fontSize: 16,
    lineHeight: 28,
    color: '#2C2A28',
  },
});

export default DetailScreen;
