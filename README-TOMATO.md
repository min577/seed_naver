# 토마토 가격 비교 대시보드 - 영업 전용

영업 부서를 위한 토마토 도매시장 vs 온라인몰 가격 비교 대시보드입니다.

## 주요 기능

### 1. 등급별 가격 비교 (상/중/하/주스용)
- **상품**: 테니스공 크기
- **중품**: 야구공 크기
- **하품**: 배드민턴공 크기
- **주스용**: 탁구공 크기

### 2. 가격 출처별 비교
- **도매시장 가격**: KAMIS API를 통한 가락시장 실시간 가격 (1kg 기준)
- **온라인몰 가격**: 네이버 쇼핑 API를 통한 온라인 최저가 (쿠팡, 스마트스토어 포함)

### 3. 실시간 비교 대시보드
- 등급별 도매가 vs 온라인가 비교 테이블
- 가격 차이 및 마진율 자동 계산
- 온라인 최저가 상위 10개 판매처 상세 정보
- 도매시장 등급별 가격 카드

## 기술 스택

- **Backend**: Node.js, Express
- **API**:
  - KAMIS API (한국농수산식품유통공사 - 도매시장 가격)
  - Naver Shopping API (온라인 판매가)
  - n8n 워크플로우 (데이터 수집 및 가공)
- **Frontend**: HTML, CSS, JavaScript
- **기타**: axios, dotenv, cors

## 설치 및 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 열고 n8n 워크플로우 URL을 설정하세요:

```env
# 네이버 API (이미 설정됨)
NAVER_CLIENT_ID=DVxnoAeRqeauwlQxr7Wb
NAVER_CLIENT_SECRET=hKeyoAy_QN
PORT=3000

# n8n 워크플로우 API 엔드포인트
N8N_BASE_URL=https://your-n8n-instance.com
N8N_MARKET_PRICE_WEBHOOK=/webhook/market-price
N8N_PRICE_COMPARE_WEBHOOK=/webhook/price-compare
N8N_PRICE_HISTORY_WEBHOOK=/webhook/price-history
```

**중요**: `N8N_BASE_URL`을 실제 n8n 인스턴스 주소로 변경하세요.

### 3. 토마토 대시보드 서버 실행

```bash
npm run tomato
```

개발 모드 (자동 재시작):
```bash
npm run tomato:dev
```

### 4. 웹사이트 접속

브라우저에서 다음 주소로 접속하세요:
```
http://localhost:3000
```

## n8n 워크플로우 구성

제공된 n8n 워크플로우는 다음 3개의 웹훅을 제공합니다:

### 1. `/webhook/market-price`
도매시장 실시간 가격 조회

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "item_name": "토마토",
    "price": 8500,
    "unit": "5kg",
    "rank": "상품",
    "date": "2026-01-14"
  }
}
```

### 2. `/webhook/price-compare` ⭐ 메인
도매가 vs 온라인가 비교 (대시보드 메인 데이터)

**응답 예시:**
```json
{
  "success": true,
  "date": "2026-01-14",
  "wholesale_summary": {
    "high": 8500,
    "mid": 7200,
    "cherry": 12000
  },
  "online_summary": {
    "lowest_price": 15000,
    "lowest_mall": "쿠팡",
    "median_price": 18000,
    "average_price": 19500,
    "mall_count": 30
  },
  "comparison": [
    {
      "grade": "상품",
      "wholesale_price": 8500,
      "online_lowest": 15000,
      "margin_rate": 76
    }
  ],
  "online_detail": [...]
}
```

### 3. `/webhook/price-history`
기간별 가격 추이 조회

**파라미터:**
- `start`: 시작일 (YYYY-MM-DD)
- `end`: 종료일 (YYYY-MM-DD)

## 프로젝트 구조

```
naver/
├── public/
│   ├── tomato-dashboard.html    # 토마토 대시보드 메인 페이지
│   ├── tomato-dashboard.css     # 대시보드 스타일
│   ├── tomato-dashboard.js      # 대시보드 로직
│   ├── index.html               # 기존 범용 검색 페이지
│   ├── style.css
│   └── script.js
├── server-tomato.js             # 토마토 전용 서버 (n8n 연동)
├── server.js                    # 기존 범용 서버
├── package.json
├── .env
└── README-TOMATO.md
```

## API 엔드포인트

### GET /api/tomato/price-compare
도매가 vs 온라인가 비교 데이터 (대시보드 메인)

**응답:** n8n `/webhook/price-compare` 결과 반환

### GET /api/tomato/market-price
도매시장 실시간 가격

**응답:** n8n `/webhook/market-price` 결과 반환

### GET /api/tomato/price-history
가격 추이 (기간별)

**파라미터:**
- `start`: 시작일 (YYYY-MM-DD)
- `end`: 종료일 (YYYY-MM-DD)

**응답:** n8n `/webhook/price-history` 결과 반환

### GET /api/tomato/search
토마토 등급별 검색 (네이버 쇼핑 직접 호출)

**파라미터:**
- `grade`: high, mid, low, juice

## 사용 방법

1. **대시보드 접속**
   - `http://localhost:3000` 접속

2. **데이터 새로고침**
   - "데이터 새로고침" 버튼 클릭

3. **가격 비교**
   - 등급별 도매가와 온라인가를 비교
   - 마진율 확인 (온라인가가 도매가보다 얼마나 높은지)

4. **상세 정보 확인**
   - 온라인 최저가 상위 10개 판매처 확인
   - "구매하러 가기" 링크로 실제 판매 페이지 이동

## 주의사항

### n8n 설정 필수
이 대시보드는 n8n 워크플로우가 실행 중이어야 정상 작동합니다.

1. 제공된 n8n 워크플로우를 n8n 인스턴스에 import
2. 워크플로우 활성화
3. `.env` 파일에 n8n URL 설정

### KAMIS API 키
n8n 워크플로우 내부에 이미 KAMIS API 키가 설정되어 있습니다:
- `cert_key`: `7c1e5d34-54b8-4427-a8a5-9cdf44166e7f`
- `cert_id`: `4422`

### API 호출 제한
- KAMIS API: 일 1,000건
- 네이버 쇼핑 API: 일 25,000건

## 기존 범용 검색 사용

기존 범용 검색 기능도 계속 사용 가능합니다:

```bash
npm start
# 또는
npm run dev
```

접속: `http://localhost:3000` → [index.html](public/index.html)

## 문의

문제가 발생하면 다음을 확인하세요:

1. n8n 워크플로우가 실행 중인지
2. `.env` 파일의 `N8N_BASE_URL`이 올바른지
3. 네이버 API 키가 유효한지
4. 브라우저 콘솔에 에러 메시지 확인

## 라이선스

ISC
