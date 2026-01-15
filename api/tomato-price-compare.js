// Vercel Serverless Function - 토마토 가격 비교 API
const axios = require('axios');

// KAMIS API 설정
const KAMIS_API_KEY = process.env.KAMIS_API_KEY || 'd3215754-6a87-4e9c-84c8-9807bbf7db5d';
const KAMIS_CERT_ID = process.env.KAMIS_CERT_ID || '4957';

// KAMIS에서 토마토 도매가격 조회
async function fetchKamisTomatoPrice() {
  const today = new Date();
  const regday = today.toISOString().split('T')[0].replace(/-/g, '');

  // KAMIS API 파라미터
  const params = {
    action: 'dailyPriceByCategoryList',
    p_product_cls_code: '02',  // 도매
    p_item_category_code: '200',  // 채소류
    p_item_code: '225',  // 토마토
    p_country_code: '',
    p_regday: regday,
    p_convert_kg_yn: 'Y',
    p_cert_key: KAMIS_API_KEY,
    p_cert_id: KAMIS_CERT_ID,
    p_returntype: 'json'
  };

  const url = 'https://www.kamis.or.kr/service/price/xml.do';

  console.log('KAMIS API 호출:', url, params);

  const response = await axios.get(url, {
    params,
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  console.log('KAMIS 응답:', JSON.stringify(response.data).substring(0, 500));

  return response.data;
}

// KAMIS 응답에서 토마토 가격 추출
function parseKamisPrice(data) {
  const today = new Date().toISOString().split('T')[0];

  if (!data || !data.data || !data.data.item) {
    return null;
  }

  const items = Array.isArray(data.data.item) ? data.data.item : [data.data.item];

  // 토마토 관련 항목 찾기
  let highPrice = 0;
  let midPrice = 0;
  let cherryPrice = 0;

  items.forEach(item => {
    const itemName = item.item_name || '';
    const kindName = item.kind_name || '';
    const price = parseInt((item.dpr1 || '0').replace(/,/g, ''), 10);

    if (itemName.includes('토마토') || kindName.includes('토마토')) {
      if (kindName.includes('방울') || kindName.includes('체리')) {
        if (price > cherryPrice) cherryPrice = price;
      } else if (kindName.includes('상') || kindName.includes('특')) {
        if (price > highPrice) highPrice = price;
      } else {
        if (price > midPrice) midPrice = price;
      }
    }
  });

  // 상품 가격이 없으면 중품 가격의 1.3배로 추정
  if (highPrice === 0 && midPrice > 0) {
    highPrice = Math.round(midPrice * 1.3);
  }
  // 중품 가격이 없으면 상품 가격의 0.75배로 추정
  if (midPrice === 0 && highPrice > 0) {
    midPrice = Math.round(highPrice * 0.75);
  }

  if (highPrice > 0 || midPrice > 0) {
    return {
      high: highPrice,
      mid: midPrice,
      cherry: cherryPrice,
      date: today,
      source: 'KAMIS'
    };
  }

  return null;
}

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    let wholesale = { high: 0, mid: 0, cherry: 0, date: today };
    let kamisError = null;

    // KAMIS API 직접 호출
    try {
      const kamisData = await fetchKamisTomatoPrice();
      const parsed = parseKamisPrice(kamisData);

      if (parsed && parsed.high > 0) {
        wholesale = parsed;
      } else {
        throw new Error('KAMIS에서 유효한 가격 데이터를 가져오지 못했습니다.');
      }
    } catch (kamisErr) {
      console.error('KAMIS API 오류:', kamisErr.message);
      kamisError = 'KAMIS API 연결 실패 - 가락시장 참고가격으로 표시됩니다.';
      // 가락시장 최근 평균 시세 기준 참고가격
      wholesale = {
        high: 5200,  // 상품 참고가격 (10kg 기준 52,000원)
        mid: 3800,   // 중품 참고가격 (10kg 기준 38,000원)
        cherry: 8500, // 방울토마토 참고가격
        date: today,
        isDummy: true,
        source: '참고가격'
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
    res.status(200).json({
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
};
