module.exports = {
  dependencies: {
    'react-native-webview': {
      root: require('path').resolve(__dirname, 'node_modules/react-native-webview'),
    },
  },
  // `npx react-native-asset` 실행 시 이 경로의 .ttf/.otf가 자동으로
  // android/app/src/main/assets/fonts/ 에 복사된다.
  assets: ['./assets/fonts/'],
};
