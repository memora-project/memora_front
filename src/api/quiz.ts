import { apiClient, extractApiErrorMessage } from './client';

export interface QuizResponse {
  quizId: number;
  /** 사진 URL (보통 /uploads/...). resolveImageUrl로 절대 URL 변환 후 사용. */
  photoUrl: string;
  question: string;
  /** 4지선다 보기 — 길이 4 보장 가정. */
  choices: string[];
  /** 백엔드가 클라이언트 즉시 피드백용으로 정답을 함께 내려준다. */
  correctAnswer: string;
  /** 'YYYY-MM-DD' — 사진이 찍힌 날 (질문 맥락 표시용). */
  targetDate: string;
}

export interface QuizAnswerRequest {
  quizId: number;
  answer: string;
  /** 백엔드 spec상 GET 응답에서 받은 값을 그대로 다시 보냄. */
  correctAnswer: string;
}

export interface QuizResultResponse {
  correct: boolean;
  /** 어르신용 안내 메시지 (예: "정답이에요! 대단하세요!"). */
  message: string;
  correctAnswer: string;
}

/**
 * GET /quiz — 오늘의 퀴즈 1개 받기.
 * 사용자 사진 + 기록을 백엔드 AI가 분석해 4지선다 문항을 생성한다.
 */
export const getQuiz = async (): Promise<QuizResponse> => {
  try {
    const { data } = await apiClient.get<QuizResponse>('/quiz');
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '퀴즈를 불러오지 못했습니다.'));
  }
};

/**
 * POST /quiz/answer — 정답 제출. 백엔드가 통계/정오답 기록.
 */
export const submitQuizAnswer = async (
  request: QuizAnswerRequest,
): Promise<QuizResultResponse> => {
  try {
    const { data } = await apiClient.post<QuizResultResponse>(
      '/quiz/answer',
      request,
    );
    return data;
  } catch (e) {
    throw new Error(extractApiErrorMessage(e, '정답을 제출하지 못했습니다.'));
  }
};
