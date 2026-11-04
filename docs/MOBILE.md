# 클로버 Android · iPhone 앱 (기존 Capacitor 프로젝트)

현재 권장 앱 구조는 서버의 웹을 직접 여는 Expo 앱입니다. 새 실행·로그인 유지·푸시 설정은 [EXPO.md](EXPO.md)를 참고하세요. 아래 내용은 보존된 Capacitor 프로젝트의 빌드 안내입니다.

기존 웹 화면을 **Capacitor 설치형 앱**으로 구성했습니다. 앱 내부에 화면과 체험 데이터를 포함하고, 실제 기기에서는 네이티브 녹음·음성 안내·설정 저장 기능을 사용합니다. 앱 아이콘과 Android/iOS 프로젝트를 포함합니다.

## 저녁 안부 확인 추가

당일 미사용 어르신의 안부 질문, 5분 재알림, 미응답 담당자 확인을 추가했습니다. 실제 앱 종료 상태 알림은 FCM/APNs 연결과 상시 서버가 필요합니다. [안부 기능 안내](WELLNESS.md)를 참고하세요.

## 지금 준비된 것

- Android 프로젝트: `android/` (앱 ID `kr.clover.care`, Android 7/API 24 이상)
- iOS Xcode 프로젝트: `ios/App/App.xcodeproj` (iOS 15 이상, Swift Package Manager 사용)
- 공통 앱 코드: `mobile/` + `public/`
- 초기 설정: 체험/서버 연결, 어르신/요양보호사/사회복지사, 연결할 어르신·보호사 선택
- 재실행 시 선택한 사용자 화면으로 바로 진입
- 어르신 화면: 마이크 하나, 한국어 음성 안내, 담당자 메뉴를 표시하지 않음
- 네이티브 녹음: 누르는 동안 녹음 → 손을 떼면 요청, 60초 자동 종료, 권한 요청 중 해제·화면 전환·앱 비활성화 시 취소
- 녹음 임시 파일: 읽은 뒤 삭제 (서버에는 Base64 JSON으로 전송)
- 네이티브 TTS, 안드로이드 뒤로 가기, 노치·홈 인디케이터 여백
- 체험 모드는 서버 없이 가상 일정 배정·수락·불가 사유·조율·내역 저장까지 동작

**아직 APK/IPA 설치 파일을 생성한 상태는 아닙니다.** 이 PC에는 JDK·Android SDK가 없으며 Windows에서는 Xcode 빌드가 불가능합니다. 공통 번들 생성, 두 플랫폼 동기화, 프로젝트 설정 검사와 자동 테스트를 완료했습니다. 실제 기기의 마이크·음성 안내·권한·백그라운드 복귀는 아직 검증하지 않았습니다.

## 공통 실행·빌드

Node.js 22 이상에서:

```sh
npm ci
npm test
npm run sync:mobile
npm run verify:mobile
```

`sync:mobile`은 공통 코드 번들을 만들고 Android/iOS 프로젝트에 복사합니다. `verify:mobile`은 프로젝트 파일, 권한, 개인정보 API 사용 사유, 리소스 중복과 복사된 번들을 검사합니다. 네이티브 컴파일이나 실기기 테스트를 대신하지 않습니다.

화면만 PC에서 확인하려면:

```sh
npm start
```

[앱 공통 화면 미리보기](http://localhost:3000/mobile/)

이 주소는 **브라우저 미리보기**입니다. APK/IPA가 아니며 브라우저에서는 네이티브 녹음/TTS를 검증할 수 없습니다. 기존 웹 관리 화면은 [여기](http://localhost:3000/)에 유지됩니다.

## 첫 실행과 보호사 설정

1. **가상 데이터로 체험하기** 또는 **개발용 기관 서버 연결**을 선택합니다.
2. **연결 확인 · 사용자 불러오기**를 누릅니다.
3. 기기 사용자와 연결할 어르신·보호사를 선택합니다.
4. **클로버 시작하기**를 누릅니다.
5. 이후에는 선택한 화면으로 바로 시작합니다.

담당자 화면의 설정에서 **앱 기기 설정 변경**을 사용할 수 있습니다. 어르신 기기를 다시 설정할 때는 **상단 clover 로고를 4초간 누르세요**. 어르신에게 별도 메뉴를 노출하지 않기 위한 시제품 조작입니다. 이 동작은 인증이나 보호사 권한 검증이 아닙니다.

체험 모드에서는 음성 인식 성공이나 실제 접수처럼 표시하지 않습니다. 마이크를 누르면 음성 연결을 준비 중이라고 안내합니다. 일정 흐름은 담당자 화면의 **요청 시연**으로 확인하세요. 서버 연결 실패를 체험 모드로 자동 대체하지 않습니다.

## Android APK 만들기

1. Android Studio 2025.2.1 이상과 Android SDK Platform 36, Build Tools를 설치합니다.
2. JDK 21을 준비합니다. Android Studio에 포함된 `jbr`를 사용할 수 있습니다.
3. Android Studio에서 `android/` 폴더를 열고 Gradle 동기화를 완료합니다. 프로젝트 경로의 한글을 허용하는 Gradle 설정을 포함했습니다.
4. 기기를 연결해 Run 하거나 아래 명령으로 Debug APK를 만듭니다.

Windows PowerShell 예시 (실제 설치 경로에 맞춰 수정):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run android:apk
```

성공하면 `artifacts/clover-android-debug.apk`가 생성됩니다. 이 파일은 개발용 서명으로 만든 테스트 앱이며 Play 스토어용 배포 파일이 아닙니다. 스토어 배포에는 별도 서명키와 AAB 빌드가 필요합니다.

### Android에서 PC 로컬 서버 연결

PC의 `npm start`는 기존처럼 루프백 주소에만 바인딩합니다. 인터넷이나 LAN에 서버를 공개하지 않습니다.

1. USB 디버깅 가능한 테스트 기기를 연결합니다.
2. PC에서 `npm start`를 실행합니다.
3. SDK의 `adb reverse tcp:3000 tcp:3000`을 실행합니다.
4. 앱 첫 설정에서 서버 주소를 `http://localhost:3000`으로 입력합니다.

Debug 앱만 localhost/127.0.0.1 HTTP 개발 연결을 허용합니다. Release 앱은 HTTPS를 사용해야 합니다. 두 기기를 연결하려면 각 기기에 reverse를 설정하세요. 실제 음성 처리는 PC의 STT·Ollama 설정이 추가로 필요합니다.

## iPhone 앱 실행·배포

Mac, Xcode 26 이상이 필요합니다. Windows에서 아이폰 설치용 IPA를 만들거나 서명할 수 없습니다.

Mac으로 저장소를 옮긴 뒤:

```sh
npm ci
npm run sync:mobile
npm run open:ios
```

Xcode에서:

1. `App` 타깃의 **Signing & Capabilities**에서 본인의 Team과 사용 가능한 Bundle Identifier를 설정합니다.
2. 연결된 iPhone 또는 Simulator를 선택하고 Run 합니다.
3. 최초 녹음 시 한국어 마이크 권한 설명이 표시됩니다.
4. TestFlight/App Store 배포는 Apple Developer 계정과 배포 서명 설정 후 Archive에서 진행합니다.

시뮬레이터에서는 같은 Mac에서 실행한 Node 서버에 `http://localhost:3000`으로 연결할 수 있습니다. 실제 iPhone의 localhost는 iPhone 자체를 가리킵니다. 실제 기기 간 연동에는 인증·권한을 갖춘 HTTPS 서버 배포가 필요합니다. 현재 개발 서버를 외부에 그대로 노출하지 마세요.

## 실제 음성 처리 경로

`휴대폰 네이티브 녹음 → /api/voice-json → 로컬 STT → Ollama → 일정 배정 → 앱 안내`

LLM은 **휴대폰 안에 내장한 것이 아니라 기존 기관/PC 서버의 로컬 Ollama**를 사용합니다. 앱 설정을 완료했다고 음성 모델이 설치되지는 않습니다. 서버 환경 변수는 프로젝트 루트 `.env.example`과 README를 참고하세요.

Android/iOS 녹음은 AAC를 담은 M4A/MP4 파일로 전달됩니다. STT 서버가 해당 형식을 디코딩할 수 있어야 합니다. 네이버 API 키는 서버에서만 관리합니다.

## 플랫폼 구성

- `capacitor.config.json`: 앱 이름·ID·공통 번들 경로
- `mobile/main.js`: 초기 설정, 기기 저장, 네이티브 녹음/TTS/HTTP, 앱 생명주기
- `mobile/core.mjs`: 누르고 말하기 상태 제어, 서버 URL 검증
- `mobile/demo-store.mjs`: 기기 내 체험 데이터와 저장 트랜잭션
- `lib/voice-input.mjs`: 네이티브 음성 업로드 입력 검사
- `scripts/build-mobile.mjs`: 앱 번들 생성
- `scripts/build-android.mjs`: APK 빌드와 결과 복사
- `scripts/verify-mobile.mjs`: 양쪽 프로젝트·리소스 정적 검증
- `scripts/generate-app-icons.mjs`: 클로버 앱 아이콘·실행 이미지 생성
- `ios/App/App/PrivacyInfo.xcprivacy`: 설정 저장·파일 API 사용 사유

## 검증 기록과 남은 작업

현재 자동 테스트 45개가 통과합니다. 기존 일정 검사 외에 녹음 권한 대기 중 해제, 녹음 시작 중 취소, 파일 읽기 중 취소, 중복 전송, 녹음 시간 제한, 기기 내 저장 실패·동시 요청을 검사합니다.

브라우저 미리보기에서는 첫 설정·어르신 화면 자동 진입·설정 유지·담당자 체험 흐름을 확인합니다. Android Gradle/Swift 컴파일, 실기기 녹음과 접근성, 서버 음성 인식, 앱 서명·스토어 제출은 별도 환경에서 완료해야 합니다.

현재 역할 선택은 계정 인증이 아닙니다. 실서비스에는 보호사 계정/어르신 기기 페어링, 서버 역할별 권한, 푸시·미응답 처리, 실제 기관 일정·네이버 이동 시간 연동을 추가해야 합니다. 체험 모드의 로컬 데이터와 서버 데이터는 서로 동기화되지 않습니다.

공식 플랫폼 안내: [Capacitor 개발 환경](https://capacitorjs.com/docs/getting-started/environment-setup)

## Expo Go 테스트 프로젝트

별도 네이티브 빌드 없이 테스트하려면 [Expo Go 안내](EXPO.md)를 사용하세요. 보호사 가입·지역·근무 시간 수정이 공통 화면에 반영됩니다. Expo Go 프로젝트는 `expo/`, 기존 Capacitor 프로젝트는 `android/`와 `ios/`에 있습니다.
