# FindLostPeople Team 05 협업 가이드

이 문서는 팀원이 프로젝트를 처음 내려받고, 실행하고, 작업 내용을 GitHub에 올리는 방법을 정리한 가이드입니다.

## 1. 프로젝트 처음 받기

GitHub 저장소:

https://github.com/gyuwon-k/findlostpeople_team05

터미널 또는 PowerShell에서 아래 명령어를 실행합니다.

```bash
git clone https://github.com/gyuwon-k/findlostpeople_team05.git
cd findlostpeople_team05
```

## 2. 협업 브랜치로 이동하기

우리 팀 협업 브랜치는 아래 브랜치입니다.

```bash
codex/team05-collab
```

프로젝트 폴더 안에서 아래 명령어를 실행합니다.

```bash
git switch codex/team05-collab
```

만약 브랜치가 없다고 나오면 아래 명령어를 실행합니다.

```bash
git fetch origin
git switch -c codex/team05-collab origin/codex/team05-collab
```

## 3. 패키지 설치하기

프로젝트 실행에 필요한 패키지를 설치합니다.

```bash
npm install
```

## 4. 환경변수 파일 만들기

`.env.example` 파일을 복사해서 `.env` 파일을 만듭니다.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS 또는 Git Bash:

```bash
cp .env.example .env
```

그 다음 `.env` 파일을 열고 필요한 API 키 값을 입력합니다.

예시:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SAFEDREAM_ESNTL_ID=your_safe182_essential_id
SAFEDREAM_AUTH_KEY=your_safe182_auth_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
VITE_API_BASE_URL=http://localhost:4000
VITE_KAKAO_JAVASCRIPT_KEY=your_kakao_javascript_key
```

주의: `.env` 파일은 개인 API 키가 들어가는 파일이므로 GitHub에 올리면 안 됩니다.

## 5. 프로젝트 실행하기

```bash
npm run dev
```

실행 후 터미널에 표시되는 주소를 브라우저에서 열면 됩니다.

보통 아래 주소를 사용합니다.

```text
http://localhost:5173
```

## 6. 작업 시작 전 반드시 최신 내용 받기

다른 팀원이 올린 작업이 있을 수 있으므로, 작업을 시작하기 전에 항상 아래 명령어를 실행합니다.

```bash
git pull
```

## 7. 작업 내용 GitHub에 올리기

작업을 마친 뒤 아래 순서대로 실행합니다.

```bash
git status
git add .
git commit -m "작업 내용 간단히 작성"
git push
```

커밋 메시지 예시:

```bash
git commit -m "검색 화면 UI 수정"
git commit -m "실종자 상세 정보 카드 추가"
git commit -m "지도 마커 표시 오류 수정"
```

## 8. 자주 쓰는 Git 명령어

현재 상태 확인:

```bash
git status
```

현재 브랜치 확인:

```bash
git branch
```

최신 내용 받기:

```bash
git pull
```

작업 내용 올리기:

```bash
git add .
git commit -m "작업 내용"
git push
```

## 9. 협업 규칙

- `main` 브랜치에 직접 작업하지 않습니다.
- 팀원들은 `codex/team05-collab` 브랜치에서 작업합니다.
- 작업 시작 전에는 항상 `git pull`을 먼저 실행합니다.
- `.env` 파일은 절대 GitHub에 올리지 않습니다.
- 기능별로 커밋 메시지를 간단하고 명확하게 작성합니다.
- 같은 파일을 여러 명이 동시에 수정하면 충돌이 날 수 있으니, 큰 작업은 미리 팀원들과 공유합니다.

## 10. 전체 명령어 요약

처음 프로젝트를 받는 경우:

```bash
git clone https://github.com/gyuwon-k/findlostpeople_team05.git
cd findlostpeople_team05
git switch codex/team05-collab
npm install
```

Windows PowerShell에서 환경변수 파일 만들기:

```powershell
Copy-Item .env.example .env
```

프로젝트 실행:

```bash
npm run dev
```

작업 후 GitHub에 올리기:

```bash
git pull
git add .
git commit -m "작업 내용"
git push
```
