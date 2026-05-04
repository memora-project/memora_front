import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagePicker from 'react-native-image-crop-picker';

import type { ApiTestScreenProps } from '../navigation/AppNavigator';
import {
  createTodayDiary,
  getDiariesByMonth,
  generateFinalAiDraft,
  updateDiary,
  completeDiary,
} from '../api/diaries';
import {
  createSegment,
  generateSegmentAiDraft,
  updateSegment,
} from '../api/segments';
import { uploadImage } from '../api/files';

/**
 * Phase 1 API 클라이언트 검증용 임시 화면.
 *
 * 목적:
 *  1) 백엔드 endpoint들이 실제로 호출 가능한지 (URL/auth/직렬화 OK?)
 *  2) 호칭 personalization이 segment AI 초안 응답에 들어오는지 육안 확인
 *  3) 파일 업로드 → URL → segment 생성 흐름이 끝까지 도는지
 *
 * Phase 2/3 작업이 끝나면 이 화면과 SettingsScreen의 진입 버튼은 제거.
 */
const ApiTestScreen: React.FC<ApiTestScreenProps> = ({ navigation }) => {
  const [diaryId, setDiaryId] = useState<number | null>(null);
  const [segmentId, setSegmentId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [log, setLog] = useState<string>('대기 중...');
  const [busy, setBusy] = useState(false);

  const append = (label: string, payload: unknown) => {
    const stamp = new Date().toLocaleTimeString();
    const body =
      typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    setLog(prev => `[${stamp}] ${label}\n${body}\n\n${prev}`);
    console.log(`[ApiTest] ${label}`, payload);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      append(`❌ ${label} 실패`, e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  // ───────────────────────────────────────
  // 핸들러들
  // ───────────────────────────────────────

  const onCreateDiary = () =>
    run('POST /diaries', async () => {
      const res = await createTodayDiary();
      setDiaryId(res.diaryId);
      append('✅ createTodayDiary', res);
    });

  const onUploadPhoto = () =>
    run('POST /files/images', async () => {
      const image = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: false,
        multiple: false,
      });
      const uri = image.path.startsWith('file://')
        ? image.path
        : `file://${image.path}`;
      const url = await uploadImage(uri);
      setPhotoUrl(url);
      append('✅ uploadImage', { uri, url });
    });

  const onCreateSegment = () =>
    run('POST /segments', async () => {
      if (!diaryId) throw new Error('먼저 오늘 일기 생성하세요.');
      const res = await createSegment(diaryId, {
        moodSnapshot: 'GREAT',
        userContent: '테스트 메모 — 오랜만에 동네 산책',
        photoUrl: photoUrl ?? undefined,
      });
      setSegmentId(res.segmentId);
      append('✅ createSegment', res);
    });

  const onGenSegmentAi = () =>
    run('POST /segments/{id}/ai-draft', async () => {
      if (!diaryId || !segmentId) throw new Error('segment부터 만드세요.');
      const res = await generateSegmentAiDraft(diaryId, segmentId);
      append('✅ generateSegmentAiDraft (호칭 확인)', res);
    });

  const onUpdateSegment = () =>
    run('PATCH /segments/{id}', async () => {
      if (!diaryId || !segmentId) throw new Error('segment부터 만드세요.');
      const res = await updateSegment(diaryId, segmentId, {
        userContent: '사용자가 수정한 본문 — 검증',
      });
      append('✅ updateSegment (isEdited true 기대)', res);
    });

  const onGenFinalAi = () =>
    run('POST /diaries/{id}/ai-draft', async () => {
      if (!diaryId) throw new Error('먼저 오늘 일기 생성하세요.');
      const res = await generateFinalAiDraft(diaryId);
      append('✅ generateFinalAiDraft', res);
    });

  const onPatchAndComplete = () =>
    run('PATCH + complete', async () => {
      if (!diaryId) throw new Error('먼저 오늘 일기 생성하세요.');
      const patched = await updateDiary(diaryId, {
        finalMood: 'CALM',
        finalContent: '오늘 하루 마무리 본문 — 검증',
      });
      append('✅ updateDiary', patched);
      const completed = await completeDiary(diaryId);
      append('✅ completeDiary (status COMPLETED 기대)', completed);
    });

  const onMonth = () =>
    run('GET /diaries?month=', async () => {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await getDiariesByMonth(ym);
      append(`✅ getDiariesByMonth(${ym})`, res);
    });

  const onClear = () => {
    setDiaryId(null);
    setSegmentId(null);
    setPhotoUrl(null);
    setLog('초기화됨');
  };

  // ───────────────────────────────────────
  // 렌더
  // ───────────────────────────────────────

  const Btn: React.FC<{ label: string; onPress: () => void; danger?: boolean }> = ({
    label,
    onPress,
    danger,
  }) => (
    <TouchableOpacity
      style={[styles.btn, danger && styles.btnDanger]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={busy}
    >
      <Text style={[styles.btnText, danger && styles.btnDangerText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>API 테스트 (임시)</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          diaryId: {diaryId ?? '-'} | segmentId: {segmentId ?? '-'} | photo:{' '}
          {photoUrl ? '있음' : '없음'}
        </Text>
        {busy && <ActivityIndicator color="#2C2A28" size="small" />}
      </View>

      <ScrollView
        style={styles.btnScroll}
        contentContainerStyle={styles.btnGroup}
        showsVerticalScrollIndicator={false}
      >
        <Btn label="1. 오늘 일기 생성" onPress={onCreateDiary} />
        <Btn label="2. 사진 선택 + 업로드 (선택)" onPress={onUploadPhoto} />
        <Btn label="3. Segment 생성 (mood + 메모)" onPress={onCreateSegment} />
        <Btn label="4. Segment AI 초안 (호칭 확인)" onPress={onGenSegmentAi} />
        <Btn label="5. Segment 본문 편집 PATCH" onPress={onUpdateSegment} />
        <Btn label="6. Final AI 초안" onPress={onGenFinalAi} />
        <Btn label="7. Final PATCH + Complete" onPress={onPatchAndComplete} />
        <Btn label="8. 이번 달 일기 목록 GET" onPress={onMonth} />
        <Btn label="상태 초기화" onPress={onClear} danger />
      </ScrollView>

      <View style={styles.logWrap}>
        <Text style={styles.logHeader}>결과 로그 (최신이 위)</Text>
        <ScrollView
          style={styles.logScroll}
          contentContainerStyle={styles.logContent}
        >
          <Text style={styles.logText}>{log}</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 30,
    color: '#2C2A28',
    fontWeight: '300',
    lineHeight: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2A28',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0EAE0',
  },
  statusText: {
    fontSize: 12,
    color: '#3D3A37',
    flex: 1,
  },
  btnScroll: {
    // 버튼 영역은 화면의 약 1/3 정도만 차지 — 나머지는 로그가 가져감.
    maxHeight: 220,
  },
  btnGroup: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  btn: {
    backgroundColor: '#2C2A28',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDanger: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9534F',
  },
  btnDangerText: {
    color: '#D9534F',
  },
  logWrap: {
    flex: 1,
    backgroundColor: '#1E1B19',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  logHeader: {
    color: '#A09B95',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    paddingBottom: 12,
  },
  logText: {
    color: '#E5E0DA',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});

export default ApiTestScreen;
