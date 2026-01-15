// Vercel Serverless Function - 농산물 가격 비교 API
const axios = require('axios');

// KAMIS API 설정
const KAMIS_API_KEY = process.env.KAMIS_API_KEY || 'd3215754-6a87-4e9c-84c8-9807bbf7db5d';
const KAMIS_CERT_ID = process.env.KAMIS_CERT_ID || '4957';

// 품목 정보 (카테고리코드, 품목코드, 품목명, 네이버검색어, 제외키워드)
const PRODUCT_INFO = {
  tomato: {
    categoryCode: '200',
    itemCode: '225',
    name: '토마토',
    naverQuery: '완숙 토마토 1kg',
    excludeKeywords: ['퇴비', '비료', '계분', '상토', '화분', '씨앗', '종자', '모종', '방울', '대추', '체리', '소스', '케첩', '페이스트', '주스', '통조림', '캔', '건조', '분말'],
    priceRange: [3000, 25000],
    fallbackPrices: { high: 5200, mid: 3800 }
  },
  apple: {
    categoryCode: '400',
    itemCode: '411',
    name: '사과',
    naverQuery: '사과 1kg',
    excludeKeywords: ['주스', '잼', '식초', '칩', '말랭이', '건조', '통조림', '퓨레'],
    priceRange: [3000, 30000],
    fallbackPrices: { high: 8000, mid: 6000 }
  },
  pear: {
    categoryCode: '400',
    itemCode: '412',
    name: '배',
    naverQuery: '배 1kg',
    excludeKeywords: ['주스', '잼', '식초', '칩', '말랭이', '건조', '통조림', '배추', '배합'],
    priceRange: [3000, 35000],
    fallbackPrices: { high: 7000, mid: 5000 }
  },
  cucumber: {
    categoryCode: '200',
    itemCode: '221',
    name: '오이',
    naverQuery: '오이 1kg',
    excludeKeywords: ['피클', '절임', '씨앗', '종자', '모종', '소스'],
    priceRange: [2000, 15000],
    fallbackPrices: { high: 4500, mid: 3500 }
  },
  pepper: {
    categoryCode: '200',
    itemCode: '212',
    name: '고추',
    naverQuery: '청양고추 1kg',
    excludeKeywords: ['가루', '분말', '소스', '장', '씨앗', '종자', '모종', '건조', '말린'],
    priceRange: [5000, 40000],
    fallbackPrices: { high: 15000, mid: 12000 }
  },
  cabbage: {
    categoryCode: '200',
    itemCode: '211',
    name: '배추',
    naverQuery: '배추 1포기',
    excludeKeywords: ['김치', '절임', '씨앗', '종자', '모종'],
    priceRange: [2000, 15000],
    fallbackPrices: { high: 4000, mid: 3000 }
  },
  onion: {
    categoryCode: '200',
    itemCode: '215',
    name: '양파',
    naverQuery: '양파 1kg',
    excludeKeywords: ['링', '튀김', '가루', '분말', '씨앗', '종자', '모종', '절임'],
    priceRange: [1000, 10000],
    fallbackPrices: { high: 2500, mid: 1800 }
  },
  potato: {
    categoryCode: '200',
    itemCode: '216',
    name: '감자',
    naverQuery: '감자 1kg',
    excludeKeywords: ['칩', '튀김', '전분', '가루', '분말', '씨앗', '씨감자'],
    priceRange: [2000, 15000],
    fallbackPrices: { high: 4000, mid: 3000 }
  },
  grape: {
    categoryCode: '400',
    itemCode: '413',
    name: '포도',
    naverQuery: '포도 1kg',
    excludeKeywords: ['주스', '잼', '와인', '건포도', '씨앗'],
    priceRange: [5000, 40000],
    fallbackPrices: { high: 12000, mid: 9000 }
  },
  strawberry: {
    categoryCode: '400',
    itemCode: '415',
    name: '딸기',
    naverQuery: '딸기 1kg',
    excludeKeywords: ['잼', '주스', '아이스크림', '케이크', '건조', '냉동'],
    priceRange: [8000, 50000],
    fallbackPrices: { high: 20000, mid: 15000 }
  },
  watermelon: {
    categoryCode: '400',
    itemCode: '414',
    name: '수박',
    naverQuery: '수박 1통',
    excludeKeywords: ['주스', '씨앗', '화채'],
    priceRange: [10000, 50000],
    fallbackPrices: { high: 25000, mid: 18000 }
  },
  garlic: {
    categoryCode: '200',
    itemCode: '214',
    name: '마늘',
    naverQuery: '마늘 1kg',
    excludeKeywords: ['가루', '분말', '다진', '장아찌', '씨앗', '종구'],
    priceRange: [5000, 30000],
    fallbackPrices: { high: 12000, mid: 9000 }
  }
};

// KAMIS에서 농산물 도매가격 조회
async function fetchKamisPrice(productKey) {
  const product = PRODUCT_INFO[productKey];
  if (!product) return null;

  const today = new Date();
  const regday = today.toISOString().split('T')[0].replace(/-/g, '');

  const params = {
    action: 'dailyPriceByCategoryList',
    p_product_cls_code: '02',
    p_item_category_code: product.categoryCode,
    p_item_code: product.itemCode,
    p_country_code: '',
    p_regday: regday,
    p_convert_kg_yn: 'Y',
    p_cert_key: KAMIS_API_KEY,
    p_cert_id: KAMIS_CERT_ID,
    p_returntype: 'json'
  };

  const url = 'https://www.kamis.or.kr/service/price/xml.do';

  const response = await axios.get(url, {
    params,
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  return response.data;
}

// KAMIS 응답에서 가격 추출
function parseKamisPrice(data, productKey) {
  const product = PRODUCT_INFO[productKey];
  const today = new Date().toISOString().split('T')[0];

  if (!data || !data.data || !data.data.item) {
    return null;
  }

  const items = Array.isArray(data.data.item) ? data.data.item : [data.data.item];

  let highPrice = 0;
  let midPrice = 0;

  items.forEach(item => {
    const itemName = item.item_name || '';
    const kindName = item.kind_name || '';
    const price = parseInt((item.dpr1 || '0').replace(/,/g, ''), 10);

    if (itemName.includes(product.name) || kindName.includes(product.name)) {
      if (kindName.includes('상') || kindName.includes('특') || kindName.includes('1등')) {
        if (price > highPrice) highPrice = price;
      } else {
        if (price > midPrice) midPrice = price;
      }
    }
  });

  if (highPrice === 0 && midPrice > 0) {
    highPrice = Math.round(midPrice * 1.3);
  }
  if (midPrice === 0 && highPrice > 0) {
    midPrice = Math.round(highPrice * 0.75);
  }

  if (highPrice > 0 || midPrice > 0) {
    return {
      high: highPrice,
      mid: midPrice,
      date: today,
      source: 'KAMIS'
    };
  }

  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const productKey = req.query.product || 'tomato';
    const product = PRODUCT_INFO[productKey];

    if (!product) {
      return res.status(400).json({
        success: false,
        error: '지원하지 않는 품목입니다.',
        availableProducts: Object.keys(PRODUCT_INFO)
      });
    }

    const today = new Date().toISOString().split('T')[0];
    let wholesale = { high: 0, mid: 0, date: today };
    let kamisError = null;

    // KAMIS API 호출
    try {
      const kamisData = await fetchKamisPrice(productKey);
      const parsed = parseKamisPrice(kamisData, productKey);

      if (parsed && parsed.high > 0) {
        wholesale = parsed;
      } else {
        throw new Error('KAMIS에서 유효한 가격 데이터를 가져오지 못했습니다.');
      }
    } catch (kamisErr) {
      console.error('KAMIS API 오류:', kamisErr.message);
      kamisError = 'KAMIS API 연결 실패 - 참고가격으로 표시됩니다.';
      wholesale = {
        high: product.fallbackPrices.high,
        mid: product.fallbackPrices.mid,
        date: today,
        isDummy: true,
        source: '참고가격'
      };
    }

    // 네이버 쇼핑 API 호출
    const naverResponse = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
      params: { query: product.naverQuery, display: 100, sort: 'sim', exclude: 'used:rental' },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    // 온라인 가격 필터링
    const onlineItems = naverResponse.data.items
      .filter(item => {
        const title = item.title.replace(/<\/?b>/g, '').trim();
        if (!title.includes(product.name)) return false;
        if (product.excludeKeywords.some(kw => title.includes(kw))) return false;
        const price = parseInt(item.lprice, 10) || 0;
        if (price < product.priceRange[0] || price > product.priceRange[1]) return false;
        return true;
      })
      .map(item => ({
        mall: item.mallName,
        title: item.title.replace(/<\/?b>/g, ''),
        price: parseInt(item.lprice, 10),
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

    res.status(200).json({
      success: true,
      product: productKey,
      productName: product.name,
      date: today,
      wholesale_summary: wholesale,
      online_summary: online,
      kamisError: kamisError,
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
      sample_count: onlineItems.length,
      availableProducts: Object.entries(PRODUCT_INFO).map(([key, val]) => ({ key, name: val.name }))
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
