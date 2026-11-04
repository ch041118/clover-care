# 웹 중심 클로버 앱 · Expo

현재 `expo/App.js`는 서버의 **`/app/` 웹 화면을 직접 여는 앱**입니다. 운영 화면을 앱 파일에 포함하지 않습니다. 화면/가입/일정/근무 설정/안부 확인 로직은 웹과 서버에 두고, 앱은 로그인 유지·푸시·녹음·음성 안내를 맡습니다.

## 웹 실행

프로젝트 최상위에서:

```powershell
npm ci
npm start
```

브라우저에서 `http://localhost:3000/app/`를 엽니다. 보호사 회원가입과 로그인은 실제 서버 계정으로 처리됩니다. 계정/역할/어르신 연결 코드는 [AUTH.md](AUTH.md), 근무 지역과 시간은 **내 근무 설정**에서 관리합니다.

웹의 `public/` 파일을 수정하면 서버의 다음 화면 로드에 반영됩니다. 운영 배포에서는 같은 웹 서버에 수정 파일을 배포합니다. 실행 중인 Node 서버 코드 변경은 서버를 재시작합니다. 앱 네이티브 기능이나 브리지 API를 바꿀 때만 앱을 다시 빌드합니다.

## 휴대폰에서 Expo Go 테스트

```powershell
npm ci --prefix expo
npm run expo
```

1. SDK 57과 호환되는 Expo Go로 Metro의 QR 코드를 읽습니다.
2. 첫 화면의 **기관 웹 주소**에 휴대폰에서 접근 가능한 HTTPS 웹 주소를 입력합니다.
3. 웹 화면에서 회원가입/로그인 또는 어르신 기기 연결 코드를 입력합니다.
4. 앱을 종료하고 다시 열어도 유효한 세션은 유지됩니다.

원한다면 `expo/.env`에 `EXPO_PUBLIC_CLOVER_WEB_URL=https://care.example.org`를 지정해 초기 주소를 제공할 수 있습니다. 이 값은 앱에 포함되는 공개 주소이므로 비밀번호나 토큰을 넣지 않습니다.

PC의 `localhost:3000`은 실제 휴대폰의 localhost와 다릅니다. 현재 서버는 127.0.0.1에만 바인딩합니다. 휴대폰의 정상적인 서버 연결에는 HTTPS 리버스 프록시와 서버의 `PUBLIC_ORIGIN` 설정이 필요합니다. Android 개발 USB 연결은 `adb reverse tcp:3000 tcp:3000` 후 개발 빌드에서 `http://localhost:3000`을 사용할 수 있습니다. HTTP 루프백 예외는 개발 모드에서만 허용하며, 배포 앱은 HTTPS만 허용합니다. 터널이나 외부 배포를 자동 생성하지 않았습니다.

인터넷 연결이 끊기면 앱에서 재연결 화면을 표시하고 세션은 지우지 않습니다. 로그아웃/비밀번호 변경/서버 세션 만료 시 다시 로그인합니다. 설정에서 서버를 바꾸려면 이전 서버 세션을 로그아웃한 후 주소를 변경합니다.

## 푸시 알림

[Expo Go는 원격 푸시를 지원하지 않습니다](https://docs.expo.dev/push-notifications/faq/). Expo Go에서는 로그인 유지·웹 화면·녹음을 확인하고, 푸시는 개발용 설치 앱 또는 배포 앱에서 검증합니다. 실제로 등록하지 않은 푸시를 등록 완료로 표시하지 않습니다.

- 앱은 `expo-notifications`의 **기기 FCM/APNs 토큰**을 가져와 로그인한 계정에 등록합니다. Expo Push Service를 경유하지 않으며 기존 서버의 FCM/APNs 발송 코드를 사용합니다.
- 어르신: 안부 알림을 누르면 본인 마이크/안부 화면.
- 사회복지사: 알림을 누르면 오늘의 안부 확인 목록.
- 앱이 꺼져 있을 때 받은 알림도 로그인 완료 후 해당 화면으로 이동합니다. 알림 데이터에 들어 있는 외부 URL은 열지 않습니다.
- 앱이 열려 있을 때 새 알림을 받으면 웹 상태를 갱신합니다.
- 안부 응답 시 해당 알림을 지우고, 로그아웃 시 세션과 기기 등록을 서버에서 폐기합니다.
- **내 계정 → 앱 · 알림 설정**에서 알림 연결/끄기를 선택합니다. 어르신 화면에서는 상단 로고를 4초간 누르면 담당자 설정이 열립니다.

### 개발용 설치 앱 준비

`expo/eas.json`에 development/preview/production 프로필을 포함했습니다. Expo 계정 및 Android/iOS 서명 환경이 준비된 환경에서:

```powershell
cd expo
npx eas-cli build --profile development --platform android
# 또는 --platform ios
```

로컬 네이티브 빌드는 Android Studio/JDK/SDK 또는 Mac/Xcode가 필요합니다. 원격 EAS 빌드나 계정/서명 등록은 자동으로 실행하지 않았습니다.

- 앱 식별자: Android/iOS 모두 `kr.clover.care`.
- Android: Firebase의 해당 패키지용 `google-services.json` 경로를 `GOOGLE_SERVICES_JSON` 환경변수로 제공합니다. 서버에는 `FCM_SERVICE_ACCOUNT_FILE`을 설정합니다.
- iOS: Apple Push Notifications capability 및 서명/키가 필요합니다. 서버에 `APNS_KEY_FILE`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_TOPIC=kr.clover.care`, 빌드 환경에 맞는 `APNS_ENVIRONMENT`를 설정합니다.
- 기기에는 Firebase 앱 설정만 넣습니다. Firebase 서비스 계정과 Apple p8 발송 키는 서버에만 보관합니다.

## 보안과 개발 경계

- 세션 토큰은 Expo SecureStore에 보관합니다. 웹 JavaScript에는 반환하지 않고 네이티브 API 요청에만 사용합니다.
- WebView는 설정한 출처의 `/app/`만 열며 외부 링크, 임의 API 주소, 파일 접근을 허용하지 않습니다.
- 웹 메시지의 출처를 확인하고 계정/일정/안부/녹음 관련 허용 API만 호출합니다.
- 서버는 로그인/역할/소유권 검사를 별도로 수행합니다. 앱이 전달한 역할만으로 권한을 주지 않습니다.
- 녹음은 화면 이탈, 앱 비활성화, 제한 시간에 중단하며 임시 파일은 읽은 뒤 삭제합니다.
- 기존 Capacitor 코드와 `/mobile/` 기기 내 체험 화면은 유지합니다. 새 앱의 정상 사용 경로는 `/app/`입니다.

## 검증 명령

```powershell
npm test
npm run build:expo
npm run sync:mobile
npm run verify:mobile
```

브라우저 계정 흐름과 서버 HTTP 통합 테스트, 네이티브 브리지 출처 제한/푸시 등록 조건 테스트, Android/iOS JS 번들 생성을 검증합니다. 실제 휴대폰의 녹음/백그라운드 복귀/FCM·APNs 수신은 HTTPS 서버 및 푸시 인증서를 연결한 실기기에서 추가 검증해야 합니다. APK/IPA 생성이나 외부 배포는 완료한 상태가 아닙니다.
