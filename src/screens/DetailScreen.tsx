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
import type { DetailScreenProps } from '../navigation/AppNavigator';

const DetailScreen: React.FC<DetailScreenProps> = ({ navigation, route }) => {
  const { entry } = route.params;

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
