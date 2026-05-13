# 📔 Memora (메모라)

> **"당신의 소중한 순간을 AI가 문장으로 엮어드립니다."**
>
> 사진의 메타데이터와 사용자의 감정을 결합한 AI 자동 일기 생성 서비스

---

## ✨ 핵심 기능 (Core Features)

4/29 MVP v1.0 기준 구현 완료된 기능입니다.

1. **AI 일기 초안 생성 (Generative AI)**
   - OpenRouter(OpenAI GPT-4o) 연동
   - 기분, 사진 정보, 사용자 메모를 조합한 개인화된 서사 생성
2. **사진 메타데이터 추출 (Native Module)**
   - Android 10+ 의 GPS 마스킹 우회를 위한 커스텀 Kotlin 네이티브 브릿지 구현
   - `MediaStore.setRequireOriginal()` + `ExifInterface`로 사진의 촬영 장소(GPS) 및 시간 데이터 자동 추출
   - 사진 EXIF에 GPS가 없을 시 디바이스 현재 GPS로 fallback, 출처(`locationSource`)는 항상 기록
3. **3단계 위저드 작성 플로우**
   - 감정 선택 → 사진/메모 입력 → AI 결과 확인 및 수정
4. **로컬 데이터 관리 (Persistence)**
   - `AsyncStorage`를 이용한 일기 CRUD 및 목록 조회 (`useFocusEffect`로 화면 포커스 시 자동 갱신)

## 🛠 Tech Stack

- **Frontend:** React Native 0.85 (TypeScript) + React Navigation
- **AI Engine:** OpenAI GPT-4o (via OpenRouter API, axios)
- **Local Storage:** AsyncStorage
- **Image Picker:** `react-native-image-crop-picker` (iOS) + 자체 Kotlin 네이티브 모듈 (Android)
- **Location:** `@react-native-community/geolocation`
- **Native:** Kotlin (Android Native Module)
- **Env:** `react-native-dotenv`

## 👥 Team Members

- **황민솔**: 전반적인 시스템 아키텍처 설계, 네이티브 모듈 구현, AI 및 데이터 계층 연동
- **임재민**: 사용자 경험 설계(Figma), UI 컴포넌트 고도화 및 디자인 시스템 적용

## 🚀 시작하기 (Getting Started)

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

루트 폴더에 `.env` 파일을 생성하고 아래 키를 입력하세요.

```text
OPENROUTER_API_KEY=your_api_key_here
```

### 3. 안드로이드 실행

```bash
npm run android
```

> 처음 빌드는 Kotlin 네이티브 모듈 컴파일로 다소 시간이 걸릴 수 있습니다.
> Metro 캐시 이슈가 있으면 `npx react-native start --reset-cache` 후 다시 시도하세요.