# 네이버 쇼핑 최저가 검색 웹사이트

네이버 쇼핑 API를 활용하여 검색어를 입력하면 상품의 최저가와 판매 사이트를 보여주는 웹 애플리케이션입니다.

## 주요 기능

- 검색어 입력을 통한 상품 검색
- 최저가 순으로 상품 정렬
- 상품 이미지, 가격, 판매처 정보 표시
- 구매 사이트로 바로 이동
- 반응형 디자인 (모바일/태블릿 지원)

## 기술 스택

- **Backend**: Node.js, Express
- **API**: Naver Shopping API
- **Frontend**: HTML, CSS, JavaScript
- **기타**: axios, dotenv, cors

## 설치 및 실행 방법

### 1. 필수 요구사항
- Node.js (v14 이상)
- npm

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일이 이미 생성되어 있으며, 네이버 API 키가 설정되어 있습니다.

### 4. 서버 실행

```bash
npm start
```

개발 모드 (자동 재시작):
```bash
npm run dev
```

### 5. 웹사이트 접속

브라우저에서 다음 주소로 접속하세요:
```
http://localhost:3000
```

## 사용 방법

1. 검색창에 찾고 싶은 상품명을 입력합니다 (예: 아이폰, 노트북, 키보드)
2. 검색 버튼을 클릭하거나 Enter 키를 누릅니다
3. 최저가 순으로 정렬된 상품 목록이 표시됩니다
4. 원하는 상품을 클릭하거나 "구매하러 가기" 버튼을 눌러 판매 사이트로 이동합니다

## 프로젝트 구조

```
naver/
├── public/              # 프론트엔드 파일
│   ├── index.html      # 메인 HTML
│   ├── style.css       # 스타일시트
│   └── script.js       # 클라이언트 JavaScript
├── server.js           # Express 서버 & API
├── package.json        # 프로젝트 설정
├── .env               # 환경 변수 (API 키)
└── README.md          # 문서
```

## API 엔드포인트

### GET /api/search

상품 검색 API

**파라미터:**
- `query` (required): 검색할 상품명

**응답 예시:**
```json
{
  "total": 100,
  "items": [
    {
      "title": "상품명",
      "link": "상품 링크",
      "image": "이미지 URL",
      "lprice": 10000,
      "mallName": "쇼핑몰명",
      "brand": "브랜드명"
    }
  ]
}
```

## 주의사항

- `.env` 파일에는 네이버 API 키가 포함되어 있으므로 공개 저장소에 업로드하지 마세요
- 네이버 API 호출 제한(일 25,000건)을 고려하여 사용하세요

## 라이선스

ISC
