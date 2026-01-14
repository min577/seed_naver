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

// KAMIS API 설정
const KAMIS_API_KEY = process.env.KAMIS_API_KEY || '7c1e5d34-54b8-4427-a8a5-9cdf44166e7f';
const KAMIS_CERT_ID = process.env.KAMIS_CERT_ID || '4422';

// ============================================
// 토마토 대시보드 API
// ============================================

// 1. 도매시장 + 온라인몰 가격 비교 API
app.get('/api/tomato/price-compare', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let wholesale = { high: 0, mid: 0, cherry: 0, date: today };
    let kamisError = null;

    // KAMIS 도매가 조회 (타임아웃 시 더미 데이터 사용)
    try {
      const kamisUrl = `http://www.kamis.or.kr/service/price/xml.do?action=dailyPriceByCategoryList&p_product_cls_code=02&p_item_category_code=200&p_item_code=225&p_country_code=1101&p_regday=${today}&p_convert_kg_yn=Y&p_cert_key=${KAMIS_API_KEY}&p_cert_id=${KAMIS_CERT_ID}&p_returntype=json`;

      const kamisResponse = await axios.get(kamisUrl, { timeout: 8000 });

      // KAMIS 데이터 파싱
      let kamisData = kamisResponse.data.data || kamisResponse.data;
      if (typeof kamisData === 'string') {
        kamisData = JSON.parse(kamisData);
      }
      const innerData = kamisData.data || kamisData;
      const items = innerData.item || [];

      const parsePrice = (str) => {
        if (!str || str === '-') return 0;
        return parseInt(String(str).replace(/,/g, ''), 10) || 0;
      };

      // 토마토 등급별 가격
      const tomatoHigh = items.find(i => i.item_code === '225' && i.rank_code === '04');
      const tomatoMid = items.find(i => i.item_code === '225' && i.rank_code === '05');
      const cherryHigh = items.find(i => i.item_code === '422' && i.rank_code === '04');

      wholesale = {
        high: tomatoHigh ? parsePrice(tomatoHigh.dpr1) : 0,
        mid: tomatoMid ? parsePrice(tomatoMid.dpr1) : 0,
        cherry: cherryHigh ? parsePrice(cherryHigh.dpr1) : 0,
        date: today
      };
    } catch (kamisErr) {
      console.error('KAMIS API 오류:', kamisErr.message);
      kamisError = 'KAMIS API 서버 연결 실패 - 도매시장 가격 데이터를 가져올 수 없습니다.';
      // 더미 데이터로 대체 (참고용 예상 가격)
      wholesale = {
        high: 4500,  // 상품 예상 가격
        mid: 3200,   // 중품 예상 가격
        cherry: 0,
        date: today,
        isDummy: true
      };
    }

    // 네이버 쇼핑 API로 온라인 가격 조회
    const naverResponse = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
      params: { query: '완숙 토마토 1kg', display: 100, sort: 'sim', exclude: 'used:rental' },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    // 온라인 가격 필터링
    const onlineItems = naverResponse.data.items
      .filter(item => {
        const title = item.title.replace(/<\/?b>/g, '').trim();
        const excludeKeywords = ['퇴비', '비료', '계분', '상토', '화분', '씨앗', '종자', '모종', '방울', '대추', '체리', '소스', '케첩', '페이스트', '주스', '통조림', '캔', '건조', '분말'];
        if (!title.includes('토마토')) return false;
        if (excludeKeywords.some(kw => title.includes(kw))) return false;
        const price = parseInt(item.lprice, 10) || 0;
        if (price < 3000 || price > 25000) return false;
        const kgMatch = title.match(/\b([2-9]|[1-9]\d+)\s*kg\b/i);
        const kg1Match = title.match(/\b1\s*kg\b/i);
        if (kgMatch && !kg1Match) return false;
        return true;
      })
      .map(item => ({
        mall: item.mallName,
        title: item.title.replace(/<\/?b>/g, ''),
        price: parseInt(item.lprice, 10),
        price_per_kg: parseInt(item.lprice, 10),
        link: item.link,
        image: item.image || ''
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 30);

    const prices = onlineItems.map(i => i.price);
    const midIndex = Math.floor(prices.length / 2);

    const online = {
      lowest_price: prices[0] || 0,
      lowest_mall: onlineItems[0]?.mall || '',
      lowest_title: onlineItems[0]?.title || '',
      lowest_link: onlineItems[0]?.link || '',
      median_price: prices[midIndex] || 0,
      highest_price: prices[prices.length - 1] || 0,
      average_price: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      mall_count: onlineItems.length
    };

    // 최종 응답
    res.json({
      success: true,
      date: today,
      wholesale_summary: wholesale,
      online_summary: online,
      kamisError: kamisError,  // KAMIS API 오류 메시지 추가
      comparison: [
        {
          grade: '상품',
          wholesale_price: wholesale.high,
          online_lowest: online.lowest_price,
          margin_rate: wholesale.high > 0 ? Math.round(((online.lowest_price - wholesale.high) / wholesale.high) * 100) : 0
        },
        {
          grade: '중품',
          wholesale_price: wholesale.mid,
          online_lowest: online.lowest_price,
          margin_rate: wholesale.mid > 0 ? Math.round(((online.lowest_price - wholesale.mid) / wholesale.mid) * 100) : 0
        }
      ],
      online_detail: onlineItems,
      sample_count: onlineItems.length
    });

  } catch (error) {
    console.error('가격 비교 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '가격 비교 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 2. 도매시장 실시간 가격 API (간소화 버전)
app.get('/api/tomato/market-price', async (req, res) => {
  // price-compare와 동일한 데이터 반환
  res.redirect('/api/tomato/price-compare');
});

// 3. 가격 추이 (기간별) API (현재 미구현)
app.get('/api/tomato/price-history', async (req, res) => {
  res.status(501).json({
    success: false,
    error: '가격 추이 기능은 현재 개발 중입니다.'
  });
});

// 4. 토마토 등급별 검색 (네이버 쇼핑 직접 호출)
app.get('/api/tomato/search', async (req, res) => {
  const { grade } = req.query;
  const gradeKeywords = {
    'high': '토마토 특 1kg',
    'mid': '토마토 중 1kg',
    'low': '토마토 소 1kg',
    'juice': '토마토 주스용 1kg'
  };
  const query = gradeKeywords[grade] || '토마토 1kg';

  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
      params: { query: query, display: 50, sort: 'asc' },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    const items = response.data.items
      .filter(item => {
        const title = item.title.replace(/<\/?b>/g, '').toLowerCase();
        const excludeKeywords = ['씨앗', '모종', '퇴비', '비료', '소스', '케첩', '페이스트', '주스', '캔'];
        return title.includes('토마토') && !excludeKeywords.some(kw => title.includes(kw));
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
      .slice(0, 20);

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

// ============================================
// 기존 범용 검색 API (호환성 유지)
// ============================================
app.get('/api/search', async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요.' });
  }

  try {
    const response = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
      params: { query: query, display: 20, sort: 'sim' },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    const items = response.data.items.map(item => ({
      title: item.title.replace(/<\/?b>/g, ''),
      link: item.link,
      image: item.image,
      lprice: parseInt(item.lprice),
      hprice: parseInt(item.hprice),
      mallName: item.mallName,
      productId: item.productId,
      brand: item.brand,
      maker: item.maker,
      category1: item.category1,
      category2: item.category2
    })).sort((a, b) => a.lprice - b.lprice);

    res.json({
      total: response.data.total,
      items: items
    });
  } catch (error) {
    console.error('네이버 API 호출 오류:', error.response?.data || error.message);
    res.status(500).json({
      error: 'API 호출 중 오류가 발생했습니다.',
      details: error.response?.data || error.message
    });
  }
});

// ============================================
// 페이지 라우팅
// ============================================

// 메인 페이지 - 토마토 대시보드
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tomato-dashboard.html'));
});

// 범용 검색 페이지
app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 정적 파일 제공 (라우트 뒤에 배치)
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`🍅 토마토 가격 비교 대시보드가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`📦 범용 검색 페이지: http://localhost:${PORT}/search`);
  console.log(`📊 KAMIS API 직접 연동`);
});
