const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// n8n 워크플로우 기본 URL (환경변수에서 가져오기)
const N8N_BASE = process.env.N8N_BASE_URL || 'http://localhost:5678';

// ============================================
// 1. 도매시장 + 온라인몰 가격 비교 API
// ============================================
app.get('/api/tomato/price-compare', async (req, res) => {
  try {
    const n8nUrl = `${N8N_BASE}${process.env.N8N_PRICE_COMPARE_WEBHOOK || '/webhook/price-compare'}`;

    const response = await axios.get(n8nUrl, {
      timeout: 15000
    });

    res.json(response.data);
  } catch (error) {
    console.error('가격 비교 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '가격 비교 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// ============================================
// 2. 도매시장 실시간 가격 API
// ============================================
app.get('/api/tomato/market-price', async (req, res) => {
  try {
    const n8nUrl = `${N8N_BASE}${process.env.N8N_MARKET_PRICE_WEBHOOK || '/webhook/market-price'}`;

    const response = await axios.get(n8nUrl, {
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('시장 가격 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '시장 가격 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// ============================================
// 3. 가격 추이 (기간별) API
// ============================================
app.get('/api/tomato/price-history', async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({
      success: false,
      error: '시작일(start)과 종료일(end)을 지정해주세요. (YYYY-MM-DD 형식)'
    });
  }

  try {
    const n8nUrl = `${N8N_BASE}${process.env.N8N_PRICE_HISTORY_WEBHOOK || '/webhook/price-history'}`;

    const response = await axios.get(n8nUrl, {
      params: { start, end },
      timeout: 30000 // 기간별 조회는 시간이 걸릴 수 있음
    });

    res.json(response.data);
  } catch (error) {
    console.error('가격 추이 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '가격 추이 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// ============================================
// 4. 토마토 등급별 검색 (네이버 쇼핑 직접 호출)
// ============================================
app.get('/api/tomato/search', async (req, res) => {
  const { grade } = req.query;

  // 등급별 검색 키워드 매핑
  const gradeKeywords = {
    'high': '토마토 특 1kg',      // 상품 - 테니스공 크기
    'mid': '토마토 중 1kg',        // 중품 - 야구공 크기
    'low': '토마토 소 1kg',        // 하품 - 배드민턴공 크기
    'juice': '토마토 주스용 1kg'   // 주스용 - 탁구공 크기
  };

  const query = gradeKeywords[grade] || '토마토 1kg';

  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
      params: {
        query: query,
        display: 50,
        sort: 'asc' // 가격 오름차순
      },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    // 토마토 관련 상품만 필터링
    const items = response.data.items
      .filter(item => {
        const title = item.title.replace(/<\/?b>/g, '').toLowerCase();
        // 제외 키워드
        const excludeKeywords = ['씨앗', '모종', '퇴비', '비료', '소스', '케첩', '페이스트', '주스', '캔'];
        const hasExclude = excludeKeywords.some(kw => title.includes(kw));

        return title.includes('토마토') && !hasExclude;
      })
      .map(item => ({
        title: item.title.replace(/<\/?b>/g, ''),
        link: item.link,
        image: item.image,
        price: parseInt(item.lprice),
        mallName: item.mallName,
        brand: item.brand || item.maker || ''
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 20); // 상위 20개

    res.json({
      success: true,
      grade: grade,
      query: query,
      items: items,
      count: items.length
    });

  } catch (error) {
    console.error('네이버 API 호출 오류:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'API 호출 중 오류가 발생했습니다.',
      details: error.response?.data || error.message
    });
  }
});

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tomato-dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`🍅 토마토 가격 비교 대시보드가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`n8n 연동: ${N8N_BASE}`);
});
