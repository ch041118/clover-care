# 다른 와이파이에서 접속하기

현재 PC의 localhost 주소는 외부에서 열리지 않습니다. 이 구성은 인터넷에서 접근 가능한 Linux 서버에 웹앱을 올리고, 도메인으로 접속하게 합니다. 서버와 도메인은 아직 준비되지 않았으며, 이 파일을 추가하는 것만으로 외부 주소가 생기지는 않습니다.

## 준비

- Docker Engine과 Compose가 설치된 Linux 서버 1대. 인증의 메모리 사용량을 고려해 메모리 1GB 이상을 확보합니다.
- 실제 도메인의 A 레코드를 서버 공인 IPv4로 연결합니다. AAAA 레코드를 사용한다면 IPv6도 서버로 연결되어야 합니다.
- 서버 방화벽에서 80/443만 웹 접속에 개방합니다. 앱의 3000번 포트는 외부에 공개하지 않습니다.

Caddy는 공개 도메인과 80/443 연결이 갖추어지면 HTTPS 인증서를 발급·갱신하고 HTTP를 HTTPS로 전환합니다. [공식 안내](https://caddyserver.com/docs/automatic-https)

## 서버에서 실행

프로젝트 코드를 서버에 복사합니다. 로컬 `.env`, `data`, 인증키 파일을 공개 저장소나 이미지에 넣지 마세요. Docker 빌드에는 서버 소스만 들어가고 이 PC의 관리자 계정은 복사되지 않습니다.

프로젝트 루트에서:

```sh
cp deploy/env.example .env.deploy
```

`.env.deploy`에서 `CLOVER_DOMAIN=care.example.org`를 본인의 실제 도메인으로 바꿉니다. `https://`와 경로는 붙이지 않습니다.

```sh
docker compose --env-file .env.deploy config --quiet
docker compose --env-file .env.deploy up -d --build
docker compose --env-file .env.deploy ps
```

이후 다른 와이파이의 컴퓨터·휴대폰에서 `https://본인도메인/app/`을 엽니다. Expo 앱의 서버 주소에는 `https://본인도메인`을 입력합니다. `example.org`는 설명용이며 실제 접속 주소가 아닙니다.

Compose 변수는 `--env-file`에서 읽습니다. [Docker 공식 안내](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)

## 첫 관리자 계정

새 서버는 시연 데이터나 기본 관리자 비밀번호 없이 시작합니다. 최초 실행 후 아래 순서로 `admin` 계정을 만듭니다. 비밀번호는 숨김 입력하며 기존 계정을 덮어쓰지 않습니다.

```sh
docker compose --env-file .env.deploy stop app
docker compose --env-file .env.deploy run --rm --no-deps app node scripts/create-admin.mjs
docker compose --env-file .env.deploy up -d
```

로컬 테스트용 `adminpassword` 대신 새 서버용 비밀번호를 입력하세요. 로그인 후 ‘내 계정’에서 변경할 수 있습니다. 사회복지사·보호사·어르신 가입 화면은 동일합니다. 사회복지사 가입은 관리자 승인 전까지 차단됩니다. 관리자는 신청자의 신원을 확인한 뒤 승인해야 합니다.

## 연결 구조와 데이터

- 외부 사용자는 Caddy의 443번 포트로 연결합니다. Caddy가 내부 앱의 3000번 포트로 전달합니다.
- `PUBLIC_ORIGIN`으로 허용 도메인을 검사하고 Secure 로그인 쿠키를 사용합니다. 다른 출처의 브라우저 요청은 차단합니다.
- `TRUST_PROXY=true`는 이 Compose처럼 프록시만 백엔드에 접근할 수 있을 때 사용합니다. 직접 공개한 Node 서버에 켜지 마세요. 전달된 마지막 IP로 로그인 시도 제한을 구분합니다.
- 계정·일정은 `clover_data` 볼륨, 인증서는 Caddy 볼륨에 남습니다. 이미지 재빌드나 재시작으로 지워지지 않습니다. `down -v`는 데이터 볼륨을 삭제하므로 사용하지 마세요.
- 현재 파일 저장 방식은 앱 인스턴스 하나만 지원합니다. 여러 컨테이너를 같은 데이터 볼륨에 동시에 연결하거나 scale을 늘리지 마세요.
- 서버 종료 시 저장소 잠금을 해제합니다. 비정상 종료 후 동일 프로세스 번호로 컨테이너가 재시작하는 경우도 처리합니다.
- 업데이트: `docker compose --env-file .env.deploy up -d --build`. 계정·일정 파일은 앱을 멈춘 상태에서 별도로 백업합니다.

## 음성·지도·알림

웹 접속 설정만으로 STT, 로컬 LLM, 네이버 지도, 푸시가 연결되지는 않습니다. `.env.deploy`에 서버가 접근할 수 있는 주소와 키를 지정합니다. 컨테이너의 `127.0.0.1`은 개발 PC가 아니라 해당 컨테이너입니다. PC의 LLM을 계속 쓸 경우 별도의 비공개 네트워크 연결이 필요하며, LLM 포트를 공개하지 않습니다.

푸시 키 파일은 별도 읽기 전용 볼륨으로 마운트하고 `FCM_SERVICE_ACCOUNT_FILE` 또는 `APNS_KEY_FILE`을 컨테이너 안의 경로로 지정합니다. 키를 Docker 이미지에 포함하지 않습니다.

## 확인과 현재 검증 범위

- `https://본인도메인/api/health`가 `{"ok":true}`를 반환하는지 확인합니다.
- 외부 네트워크에서 가입·로그인·새로고침·로그아웃을 확인합니다.
- 서버를 재시작하고 같은 계정과 일정이 유지되는지 확인합니다.
- 휴대폰 마이크와 푸시는 각각 권한 및 연결 설정 후 실기기로 확인합니다.

로컬 자동 테스트는 외부 도메인을 프록시가 전달한 요청, Secure 쿠키, 잘못된 Host/Origin 차단, 운영 모드의 빈 저장소와 재시작을 검사합니다. Docker가 없는 개발 PC에서는 실제 이미지 빌드·인증서 발급·인터넷 접속까지 검증할 수 없습니다.

## 같은 와이파이에서 빠르게 확인하기

기존 서버를 종료하고 `npm run start:lan`을 실행합니다. 사설 IP가 여러 개면 `npm run start:lan -- 172.27.16.228`처럼 실제 Wi-Fi IP를 지정합니다. 실행 창에 나온 `http://IP:3000/app/`을 같은 와이파이의 다른 기기에서 엽니다. 이 모드는 지정한 Wi-Fi IP에만 바인딩하므로 이 PC에서도 같은 IP 주소로 접속합니다. 일반 로컬 모드로 돌아가려면 서버 종료 후 `npm start`를 실행합니다.

Windows 방화벽에서 막힐 경우, 신뢰하는 개인 Wi-Fi에서 관리자 PowerShell을 열고 프로젝트 폴더로 이동한 다음 `./scripts/enable-lan.ps1 -LanIp 실제IP`를 실행합니다. 현재 IP, Node 실행 파일, TCP 3000번, 같은 서브넷으로만 허용합니다. 해제하려면 관리자 PowerShell에서 `Remove-NetFirewallRule -Name 'CLover-LAN-3000-실제IP'`를 실행합니다. Wi-Fi IP가 바뀌면 재실행 및 새 방화벽 규칙이 필요합니다.

이 컴퓨터와 서버는 계속 켜져 있어야 합니다. 공유기의 기기 간 통신 차단이나 게스트 Wi-Fi에서는 접속이 안 될 수 있습니다. HTTP 주소는 화면·가입·로그인 확인용이며 브라우저 마이크 녹음은 HTTPS 연결이 필요합니다. [브라우저 마이크 조건](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
