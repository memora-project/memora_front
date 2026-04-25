import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const DATA = [
  { id: '1', title: '첫 번째 메모', date: '2026-04-25' },
  { id: '2', title: '자바 17 설정 완료!', date: '2026-04-25' },
  { id: '3', title: 'NestJS 백엔드 설계 시작', date: '2026-04-26' },
];

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Memora 목록</Text>
      <FlatList
        data={DATA}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDate}>{item.date}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  item: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  itemTitle: { fontSize: 18, fontWeight: '600' },
  itemDate: { color: '#888', marginTop: 5 },
});

export default HomeScreen;