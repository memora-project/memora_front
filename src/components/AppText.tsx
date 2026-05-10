import React from 'react';
import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

/** 어르신 가독성용 기본 line-height 배율 — fontSize × 이 값. */
const DEFAULT_LINE_HEIGHT_RATIO = 1.55;

/**
 * 한국어 widow 방지를 자동 적용하는 Text 컴포넌트.
 *
 * RN의 기본 Text는 한국어를 영어 단어처럼 인식 못 해서, 폰트 크기/길이가 달라질 때
 * 마지막 한두 글자가 외롭게 다음 줄로 떨어지는 현상이 잦다.
 *
 * 이 컴포넌트는 children string에 두 가지 트릭을 적용:
 *   (1) 마지막 어절을 직전 어절과 NBSP( )로 묶음 → 어절 사이 끊김 방지
 *   (2) 마지막 어절 *내부* 글자들을 word-joiner(⁠)로 묶음 → character break 방지
 *
 * import만 react-native → '@/components/AppText' 로 바꾸면 자동 적용.
 * 사용처(`<Text>...</Text>`)는 변경 불필요.
 */

const NBSP = ' ';
const WORD_JOINER = '⁠';

export function preventKoreanWidow(text: string): string {
  if (!text || text.length < 4) return text;
  // 한글이 없으면 건드리지 않음 — 숫자/영문/시간("00:00") 등에 ZWJ를 끼면 layout이 깨질 수 있다.
  if (!/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text)) return text;

  return text.split('\n').map(line => {
    if (line.length < 3) return line;
    let processed = line;

    const lastSpace = processed.lastIndexOf(' ');
    if (lastSpace !== -1) {
      const lastWord = processed.slice(lastSpace + 1);
      if (lastWord.length > 0 && lastWord.length <= processed.length / 2) {
        processed =
          processed.slice(0, lastSpace) + NBSP + processed.slice(lastSpace + 1);
      }
    }

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

function processChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') return preventKoreanWidow(children);
  if (Array.isArray(children)) {
    return children.map(c =>
      typeof c === 'string' ? preventKoreanWidow(c) : c,
    );
  }
  return children;
}

export const Text = React.forwardRef<RNText, TextProps>((props, ref) => {
  const { children, style, ...rest } = props;

  // 호출자 style을 flatten해서 fontSize/lineHeight 검사.
  // fontSize는 있는데 lineHeight 명시가 없으면 자동으로 1.55배를 채워 어르신 가독성 확보.
  const flat = StyleSheet.flatten(style) as
    | { fontSize?: number; lineHeight?: number }
    | undefined;
  const fontSize = typeof flat?.fontSize === 'number' ? flat.fontSize : undefined;
  const hasLineHeight = typeof flat?.lineHeight === 'number';

  const baseStyle: { fontFamily: string; lineHeight?: number } = {
    fontFamily: 'GowunDodum-Regular',
  };
  if (fontSize !== undefined && !hasLineHeight) {
    baseStyle.lineHeight = Math.round(fontSize * DEFAULT_LINE_HEIGHT_RATIO);
  }

  return (
    <RNText
      ref={ref}
      textBreakStrategy="simple"
      lineBreakStrategyIOS="hangul-word"
      // 호출자가 명시한 style이 뒤라 우선 — fontFamily/lineHeight를 override 가능.
      style={[baseStyle, style]}
      {...rest}
    >
      {processChildren(children)}
    </RNText>
  );
});

Text.displayName = 'AppText';

export default Text;
