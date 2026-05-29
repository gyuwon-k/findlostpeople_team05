# FindLostPeople Team 05 협업 가이드

이 문서는 팀원이 프로젝트를 처음 내려받고, 각자 개인 브랜치를 만들어 작업한 뒤, Pull Request로 팀 개발 브랜치에 합치는 방법을 정리한 가이드입니다.

## 1. 브랜치 구조

우리 팀은 아래 흐름으로 작업합니다.

```text
개인 작업 브랜치 -> codex/team05-collab -> main
```

브랜치 역할은 다음과 같습니다.

```text
main
최종 안정 버전만 올리는 브랜치입니다.

codex/team05-collab
팀 개발 내용을 모으는 공용 개발 브랜치입니다.

feature/본인이름-작업내용
각자 실제 작업하는 개인 브랜치입니다.
```

중요:

- `main`에 직접 작업하지 않습니다.
- `codex/team05-collab`에도 직접 push하지 않습니다.
- 각자 개인 브랜치를 만들어 작업합니다.
- 작업이 끝나면 GitHub에서 Pull Request를 만들어 `codex/team05-collab`에 합칩니다.

## 2. 프로젝트 처음 받기

GitHub 저장소:

https://github.com/gyuwon-k/findlostpeople_team05

터미널 또는 PowerShell에서 아래 명령어를 실행합니다.

```bash
git clone https://github.com/gyuwon-k/findlostpeople_team05.git
cd findlostpeople_team05
```

## 3. 팀 개발 브랜치로 이동하기

우리 팀 공용 개발 브랜치는 아래 브랜치입니다.

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

## 4. 개인 작업 브랜치 만들기

작업을 시작하기 전에 항상 팀 개발 브랜치의 최신 내용을 먼저 받습니다.

```bash
git switch codex/team05-collab
git pull
```

그 다음 개인 작업 브랜치를 만듭니다.

```bash
git switch -c feature/본인이름-작업내용
```

예시:

```bash
git switch -c feature/minji-map-ui
git switch -c feature/jiho-search-api
git switch -c feature/seoyeon-detail-page
```

브랜치 이름은 영어 소문자와 `-`를 사용해서 간단하게 작성하는 것을 권장합니다.

## 5. 패키지 설치하기

프로젝트 실행에 필요한 패키지를 설치합니다.

```bash
npm install
```

## 6. 환경변수 파일 만들기

`.env.example` 파일을 복사해서 `.env` 파일을 만듭니다.

Windows PowerShell:

```powershell
Copy-Item env.example .env
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

주의:

- `.env` 파일은 개인 API 키가 들어가는 파일입니다.
- `.env` 파일은 절대 GitHub에 올리면 안 됩니다.
- `.gitignore`에 `.env`가 등록되어 있으므로 보통은 자동으로 제외됩니다.

## 7. 프로젝트 실행하기

```bash
npm run dev
```

실행 후 터미널에 표시되는 주소를 브라우저에서 열면 됩니다.

보통 아래 주소를 사용합니다.

```text
http://localhost:5173
```

## 8. 작업 내용 저장하기

작업을 마친 뒤 아래 순서대로 실행합니다.

```bash
git status
git add .
git commit -m "작업 내용 간단히 작성"
```

커밋 메시지 예시:

```bash
git commit -m "검색 화면 UI 수정"
git commit -m "실종자 상세 정보 카드 추가"
git commit -m "지도 마커 표시 오류 수정"
```

## 9. 개인 브랜치를 GitHub에 올리기

처음 push할 때는 아래 명령어를 사용합니다.

```bash
git push -u origin feature/본인이름-작업내용
```

예시:

```bash
git push -u origin feature/minji-map-ui
```

한 번 올린 뒤부터는 아래 명령어만 사용해도 됩니다.

```bash
git push
```

## 10. Pull Request 만들기

GitHub 저장소에 들어갑니다.

https://github.com/gyuwon-k/findlostpeople_team05

개인 브랜치를 push하면 GitHub 화면에 Pull Request를 만들 수 있는 버튼이 보입니다.

Pull Request 방향은 아래처럼 설정합니다.

```text
base: codex/team05-collab
compare: feature/본인이름-작업내용
```

예시:

```text
base: codex/team05-collab
compare: feature/minji-map-ui
```

Pull Request 제목에는 작업 내용을 간단히 적습니다.

예시:

```text
검색 화면 UI 수정
지도 마커 표시 기능 추가
실종자 상세 페이지 구현
```

팀원이 확인한 뒤 문제가 없으면 `codex/team05-collab` 브랜치에 merge합니다.

## 11. 다른 팀원 작업 내용 가져오기

다른 팀원의 작업이 `codex/team05-collab`에 합쳐졌다면, 내 브랜치에도 최신 내용을 반영하는 것이 좋습니다.

먼저 내 작업 내용을 커밋합니다.

```bash
git status
git add .
git commit -m "내 작업 내용"
```

그 다음 아래 명령어를 실행합니다.

```bash
git switch codex/team05-collab
git pull
git switch feature/본인이름-작업내용
git merge codex/team05-collab
```

충돌이 나면 충돌난 파일을 수정한 뒤 다시 커밋합니다.

```bash
git add .
git commit -m "충돌 해결"
```

## 12. 자주 쓰는 Git 명령어

현재 상태 확인:

```bash
git status
```

현재 브랜치 확인:

```bash
git branch
```

브랜치 이동:

```bash
git switch 브랜치이름
```

새 브랜치 만들기:

```bash
git switch -c 새브랜치이름
```

최신 내용 받기:

```bash
git pull
```

작업 내용 저장:

```bash
git add .
git commit -m "작업 내용"
```

작업 내용 GitHub에 올리기:

```bash
git push
```

## 13. 전체 작업 흐름 요약

처음 프로젝트를 받는 경우:

```bash
git clone https://github.com/gyuwon-k/findlostpeople_team05.git
cd findlostpeople_team05
git switch codex/team05-collab
git pull
git switch -c feature/본인이름-작업내용
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

작업 후 개인 브랜치에 저장하고 올리기:

```bash
git status
git add .
git commit -m "작업 내용"
git push -u origin feature/본인이름-작업내용
```

GitHub에서 Pull Request 만들기:

```text
base: codex/team05-collab
compare: feature/본인이름-작업내용
```

## 14. 팀 협업 규칙

- `main` 브랜치에 직접 작업하지 않습니다.
- `codex/team05-collab` 브랜치에 직접 push하지 않습니다.
- 각자 `feature/본인이름-작업내용` 형식의 개인 브랜치를 만들어 작업합니다.
- 작업 시작 전에는 `codex/team05-collab`에서 `git pull`을 먼저 실행합니다.
- 작업이 끝나면 개인 브랜치를 GitHub에 push합니다.
- 개인 브랜치에서 `codex/team05-collab`으로 Pull Request를 만듭니다.
- `.env` 파일은 절대 GitHub에 올리지 않습니다.
- 같은 파일을 여러 명이 동시에 수정할 예정이면 미리 팀원들과 공유합니다.
