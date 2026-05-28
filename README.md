# 실종자 지도 기반 웹서비스

문자로 전달되는 실종자 정보를 지도 핀, 상세 카드, 지역별 분석으로 재구성하는 발표용 풀스택 웹서비스입니다. 데이터는 임의 샘플을 만들지 않고 경찰청 안전Dream OPEN API를 통해 가져오도록 설계했습니다.

## 주요 기능

- 실시간 실종경보 지도: 안전Dream 실종경보 API 응답을 카카오맵 마커로 표시
- 경보 상세 카드: 사진, 이름, 나이, 성별, 발생 위치, 인상착의, 특징, 공식 상세 링크 제공
- 실종자 검색: 이름, 발생 지역, 성별, 나이 조건으로 안전Dream 검색 API 조회
- 지역별 분석: API 조회 결과를 지역 단위로 집계해 분포 차트 제공
- 보호자 등록 요청: 즉시 공개하지 않고 `review_pending` 상태로 저장

## API 키 설정

`.env.example`을 참고해 프로젝트 루트에 `.env`를 만듭니다.

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SAFEDREAM_ESNTL_ID=your_safe182_essential_id
SAFEDREAM_AUTH_KEY=your_safe182_auth_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
VITE_API_BASE_URL=http://localhost:4000
VITE_KAKAO_JAVASCRIPT_KEY=your_kakao_javascript_key
```

안전Dream API 키가 없으면 서버는 가짜 데이터를 반환하지 않고 설정 오류를 반환합니다. 카카오 JavaScript 키가 없으면 지도 영역에 설정 안내가 표시됩니다.

## 실행

```bash
npm install
npm run dev
```

- 프론트엔드: `http://localhost:5173`
- 백엔드: `http://localhost:4000`
- 상태 확인: `http://localhost:4000/api/health`

## 공식 API 출처

- 안전Dream OPEN API 안내: https://safe182.go.kr/home/api/guideMain.do
- 실종경보 API: `https://www.safe182.go.kr/api/lcm/amberList.do`
- 실종검색 API: `https://www.safe182.go.kr/api/lcm/findChildList.do`
- 카카오맵 Web API: https://apis.map.kakao.com/web/documentation/

## 주의

이 웹사이트는 공식 신고 시스템을 대체하지 않습니다. 신고와 제보는 경찰청 안전Dream 또는 182 안내로 연결하는 보조 서비스로 다룹니다.
