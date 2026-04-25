import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@memora/diaries/v1';

export interface StoredMood {
  key: string;
  label: string;
  emoji: string;
}

export interface DiaryEntry {
  /** 저장 시 자동 생성되는 고유 ID. */
  id: string;
  /** 저장된 시각(ISO 8601). 작성일/정렬 기준. */
  createdAt: string;
  mood: StoredMood | null;
  content: string;
  /** 사진 URI (없으면 null). content:// 또는 file:// 둘 다 가능. */
  photoUri: string | null;
  /** 사진 EXIF에서 추출한 촬영 시각. 없으면 null. */
  takenAt: string | null;
  /** 위도/경도. 사진 EXIF가 우선, 없으면 디바이스 GPS, 둘 다 실패 시 null. */
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
  /**
   * 위치 출처. 어르신 동선 분석에서 가중치를 다르게 주기 위해 항상 기록.
   * - 'photo'  : 사진 EXIF
   * - 'device' : 일기 작성 시점 디바이스 GPS
   * - 'none'   : 둘 다 없음
   */
  locationSource: 'photo' | 'device' | 'none';
}

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const readAll = async (): Promise<DiaryEntry[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DiaryEntry[]) : [];
  } catch (e) {
    console.warn('[diaryStorage] JSON 파싱 실패, 빈 목록으로 복구:', e);
    return [];
  }
};

const writeAll = async (entries: DiaryEntry[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

/** 저장. id/createdAt은 자동 생성. 최신순으로 앞에 prepend. */
export const saveDiary = async (
  draft: Omit<DiaryEntry, 'id' | 'createdAt'>,
): Promise<DiaryEntry> => {
  const entry: DiaryEntry = {
    ...draft,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  try {
    const list = await readAll();
    await writeAll([entry, ...list]);
    return entry;
  } catch (e) {
    console.warn('[diaryStorage] 저장 실패:', e);
    throw new Error('일기를 저장하지 못했어요.');
  }
};

/** 전체 조회. 최신순 정렬 보장. */
export const getAllDiaries = async (): Promise<DiaryEntry[]> => {
  try {
    const list = await readAll();
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) {
    console.warn('[diaryStorage] 조회 실패:', e);
    return [];
  }
};

/** ID로 단건 조회. 없으면 null. */
export const getDiaryById = async (id: string): Promise<DiaryEntry | null> => {
  const list = await readAll();
  return list.find(e => e.id === id) ?? null;
};

/** ID로 삭제. */
export const deleteDiary = async (id: string): Promise<void> => {
  try {
    const list = await readAll();
    await writeAll(list.filter(e => e.id !== id));
  } catch (e) {
    console.warn('[diaryStorage] 삭제 실패:', e);
    throw new Error('일기를 삭제하지 못했어요.');
  }
};
