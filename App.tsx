import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { SettingsProvider } from './src/contexts/SettingsContext';

// ─────────────────────────────────────────────────────────────
// 한국어 widow(마지막 줄 한두 글자 떨어짐) 방지 — 글로벌 패치
//
// React Native의 Text는 한국어를 영어 단어처럼 인식 못 해서
// 폰트 크기/길이가 변할 때 마지막 한두 글자가 외롭게 다음 줄로 떨어진다.
//
// 해결 원리:
//   "민여, 편안한 하루를 보내고 계시네요."
//   → 마지막 공백을 NBSP( )로 변환:
//   "민여, 편안한 하루를 보내고 계시네요."
//   → "보내고 계시네요"가 한 단어로 인식 → 그 앞에서 자연스럽게 줄바꿈
//   → 결과: "민여, 편안한 하루를\n보내고 계시네요."
//
// 추가로 textBreakStrategy='simple' 로 두면 단어 *내부* character break도 막혀서
// "있어요" 가운데가 끊기는 일도 사라진다.
// ─────────────────────────────────────────────────────────────
const NBSP = ' ';

// zero-width word-joiner — 글자 사이에 끼우면 RN/Android가 거기서 줄바꿈 못 함
const WORD_JOINER = '⁠';

function preventKoreanWidow(text: string): string {
  if (!text || text.length < 4) return text;
  // 한글이 없으면 건드리지 않음 — 숫자/영문/시간("00:00") 등에 ZWJ를 끼면 layout이 깨질 수 있다.
  if (!/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text)) return text;

  return text.split('\n').map(line => {
    if (line.length < 3) return line;
    let processed = line;

    // (1) 마지막 어절을 직전 어절과 NBSP로 묶기 — 마지막 어절이 외롭게 다음 줄로 떨어지는 것 방지
    const lastSpace = processed.lastIndexOf(' ');
    if (lastSpace !== -1) {
      const lastWord = processed.slice(lastSpace + 1);
      if (lastWord.length > 0 && lastWord.length <= processed.length / 2) {
        processed =
          processed.slice(0, lastSpace) + NBSP + processed.slice(lastSpace + 1);
      }
    }

    // (2) 마지막 어절 *내부* 글자들을 word-joiner로 묶기 — character break 방지
    //     "있어요" 가운데가 "있어\n요"로 끊기는 widow의 핵심 처리.
    //     너무 길면(7자 이상) 한 줄에 못 들어갈 수 있어 묶지 않음.
    const tailMatch = processed.match(/(\S+)(\s*)$/);
    if (tailMatch) {
      const tail = tailMatch[1];
      const trailing = tailMatch[2];
      if (tail.length >= 2 && tail.length <= 6) {
        const joined = tail.split('').join(WORD_JOINER);
        processed =
          processed.slice(0, -tail.length - trailing.length) + joined + trailing;
      }
    }

    return processed;
  }).join('\n');
}

function processChildren(children: unknown): unknown {
  if (typeof children === 'string') return preventKoreanWidow(children);
  if (Array.isArray(children)) {
    return children.map(c =>
      typeof c === 'string' ? preventKoreanWidow(c) : c,
    );
  }
  return children;
}

const TextAny = Text as unknown as {
  defaultProps?: Record<string, unknown>;
  render?: (props: Record<string, unknown>, ref: unknown) => unknown;
  __widowPatched?: boolean;
};

if (!TextAny.__widowPatched) {
  TextAny.__widowPatched = true;

  if (TextAny.defaultProps == null) TextAny.defaultProps = {};
  // 'simple' = 공백 단위로만 끊음 → 단어 가운데 character break 차단
  TextAny.defaultProps.textBreakStrategy = 'simple';
  TextAny.defaultProps.lineBreakStrategyIOS = 'hangul-word';

  // RN의 Text는 forwardRef 컴포넌트로 .render 속성에 실제 렌더 함수를 둔다.
  // 그 함수를 wrap해서 자식 string을 자동 widow 방지 처리.
  const originalRender = TextAny.render;
  if (typeof originalRender === 'function') {
    try {
      TextAny.render = function patchedRender(
        props: Record<string, unknown>,
        ref: unknown,
      ) {
        try {
          const newChildren = processChildren(props.children);
          if (newChildren === props.children) {
            return originalRender(props, ref);
          }
          return originalRender({ ...props, children: newChildren }, ref);
        } catch {
          // 패치 내부 실패 시 원본 렌더링으로 fallback — 화면 깨짐 방지
          return originalRender(props, ref);
        }
      };
    } catch (e) {
      console.warn('Text widow patch 적용 실패 — 기본 동작 유지:', e);
    }
  }
}

function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

export default App;