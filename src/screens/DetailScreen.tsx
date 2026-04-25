import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DiaryEntry = {
  id: string;
  date: string;
  mood?: { emoji: string; label: string };
  photoUri?: string;
  content: string;
};

type DetailScreenProps = {
  navigation?: { goBack: () => void };
  route?: { params?: { entry?: DiaryEntry } };
};

const FALLBACK_ENTRY: DiaryEntry = {
  id: 'preview',
  date: '2026-04-26',
  mood: { emoji: '😌', label: '평온해요' },
  photoUri: undefined,
  content:
    '오늘은 오랜만에 한가로운 오후를 보냈다. 창문 너머로 들어오는 봄바람이 부드럽게 뺨을 스쳤고, 따뜻한 차 한 잔과 함께 책을 읽었다.\n\n바쁘게 지내던 일상에서 잠시 벗어나 나만의 시간을 가지니, 그동안 잊고 있던 작은 것들이 다시 눈에 들어왔다. 이런 평범한 순간이 얼마나 소중한지 새삼 느낀다.',
};

const DetailScreen: React.FC<DetailScreenProps> = ({ navigation, route }) => {
  const entry = route?.params?.entry ?? FALLBACK_ENTRY;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.date}>{entry.date}</Text>
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
  topBar: {
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
    marginBottom: 20,
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
