// Vercel Serverless Function - 가격 추이 API
// KAMIS API: 일별/월별/연도별 가격 추이 조회
const axios = require('axios');

// KAMIS API 설정
const KAMIS_API_KEY = process.env.KAMIS_API_KEY || 'd3215754-6a87-4e9c-84c8-9807bbf7db5d';
const KAMIS_CERT_ID = process.env.KAMIS_CERT_ID || '4957';

// 품목 코드 매핑
const PRODUCT_CODES = {
  tomato: { categoryCode: '200', itemCode: '225', kindCode: '01', name: '토마토' },
  apple: { categoryCode: '400', itemCode: '411', kindCode: '01', name: '사과' },
  pear: { categoryCode: '400', itemCode: '412', kindCode: '01', name: '배' },
  grape: { categoryCode: '400', itemCode: '413', kindCode: '01', name: '포도' },
  strawberry: { categoryCode: '400', itemCode: '415', kindCode: '01', name: '딸기' },
  watermelon: { categoryCode: '400', itemCode: '414', kindCode: '00', name: '수박' },
  cucumber: { categoryCode: '200', itemCode: '221', kindCode: '01', name: '오이' },
  pepper: { categoryCode: '200', itemCode: '212', kindCode: '01', name: '고추' },
  cabbage: { categoryCode: '200', itemCode: '211', kindCode: '01', name: '배추' },
  onion: { categoryCode: '200', itemCode: '215', kindCode: '01', name: '양파' },
  potato: { categoryCode: '100', itemCode: '152', kindCode: '01', name: '감자' },
  garlic: { categoryCode: '200', itemCode: '214', kindCode: '01', name: '마늘' }
};

// 날짜 포맷 함수
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 일별 가격 추이 조회 (API 16번: 신)일별 품목별 도매 가격자료)
async function fetchDailyTrend(productKey) {
  const product = PRODUCT_CODES[productKey];
  if (!product) return null;

  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 30);

  const params = {
    action: 'periodProductList',
    p_productclscode: '02', // 도매
    p_startday: formatDate(startDate).replace(/-/g, ''),
    p_endday: formatDate(today).replace(/-/g, ''),
    p_itemcategorycode: product.categoryCode,
    p_itemcode: product.itemCode,
    p_kindcode: product.kindCode,
    p_productrankcode: '04', // 상품
    p_countrycode: '',
    p_convert_kg_yn: 'Y',
    p_cert_key: KAMIS_API_KEY,
    p_cert_id: KAMIS_CERT_ID,
    p_returntype: 'json'
  };

  const url = 'https://www.kamis.or.kr/service/price/xml.do';

  try {
    const response = await axios.get(url, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return response.data;
  } catch (error) {
    console.error('KAMIS 일별 추이 조회 오류:', error.message);
    return null;
  }
}

// 월별 가격 추이 조회 (API 3번: 월별 도.소매가격정보)
async function fetchMonthlyTrend(productKey) {
  const product = PRODUCT_CODES[productKey];
  if (!product) return null;

  const today = new Date();
  const year = today.getFullYear();

  const params = {
    action: 'monthlyPriceTrendList',
    p_yyyy: year.toString(),
    p_period: '3', // 최근 3년
    p_itemcategorycode: product.categoryCode,
    p_itemcode: product.itemCode,
    p_kindcode: product.kindCode,
    p_productrankcode: '04',
    p_countrycode: '',
    p_convert_kg_yn: 'Y',
    p_cert_key: KAMIS_API_KEY,
    p_cert_id: KAMIS_CERT_ID,
    p_returntype: 'json'
  };

  const url = 'https://www.kamis.or.kr/service/price/xml.do';

  try {
    const response = await axios.get(url, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return response.data;
  } catch (error) {
    console.error('KAMIS 월별 추이 조회 오류:', error.message);
    return null;
  }
}

// 연도별 가격 추이 조회 (API 4번: 연도별 도.소매가격정보)
async function fetchYearlyTrend(productKey) {
  const product = PRODUCT_CODES[productKey];
  if (!product) return null;

  const params = {
    action: 'yearlyPriceTrendList',
    p_itemcategorycode: product.categoryCode,
    p_itemcode: product.itemCode,
    p_kindcode: product.kindCode,
    p_productrankcode: '04',
    p_countrycode: '',
    p_convert_kg_yn: 'Y',
    p_cert_key: KAMIS_API_KEY,
    p_cert_id: KAMIS_CERT_ID,
    p_returntype: 'json'
  };

  const url = 'https://www.kamis.or.kr/service/price/xml.do';

  try {
    const response = await axios.get(url, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    return response.data;
  } catch (error) {
    console.error('KAMIS 연도별 추이 조회 오류:', error.message);
    return null;
  }
}

// 응답 데이터 파싱
function parseTrendData(data, period) {
  if (!data || !data.data || !data.data.item) {
    return [];
  }

  const items = Array.isArray(data.data.item) ? data.data.item : [data.data.item];
  const result = [];

  items.forEach(item => {
    // 일별 데이터
    if (period === 'daily' && item.regday) {
      const price = parseInt((item.price || '0').replace(/,/g, ''), 10);
      if (price > 0) {
        result.push({
          label: item.regday,
          price: price,
          retailPrice: 0
        });
      }
    }
    // 월별/연도별 데이터
    else if (item.yyyy) {
      // 월별 데이터 파싱
      for (let m = 1; m <= 12; m++) {
        const monthKey = `m${m}`;
        const priceStr = item[monthKey];
        if (priceStr && priceStr !== '-') {
          const price = parseInt(priceStr.replace(/,/g, ''), 10);
          if (price > 0) {
            result.push({
              label: period === 'yearly' ? item.yyyy : `${item.yyyy}.${String(m).padStart(2, '0')}`,
              price: price,
              retailPrice: 0,
              year: item.yyyy,
              month: m
            });
          }
        }
      }
    }
  });

  // 연도별인 경우 연평균으로 집계
  if (period === 'yearly') {
    const yearlyAvg = {};
    result.forEach(item => {
      if (!yearlyAvg[item.year]) {
        yearlyAvg[item.year] = { sum: 0, count: 0 };
      }
      yearlyAvg[item.year].sum += item.price;
      yearlyAvg[item.year].count++;
    });

    return Object.keys(yearlyAvg)
      .sort()
      .slice(-5)
      .map(year => ({
        label: year + '년',
        price: Math.round(yearlyAvg[year].sum / yearlyAvg[year].count),
        retailPrice: 0
      }));
  }

  // 월별인 경우 최근 12개월
  if (period === 'monthly') {
    return result.slice(-12);
  }

  return result;
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
    const period = req.query.period || 'daily'; // daily, monthly, yearly

    const product = PRODUCT_CODES[productKey];
    if (!product) {
      return res.status(400).json({
        success: false,
        error: '지원하지 않는 품목입니다.',
        availableProducts: Object.keys(PRODUCT_CODES)
      });
    }

    let data = null;

    if (period === 'daily') {
      data = await fetchDailyTrend(productKey);
    } else if (period === 'monthly') {
      data = await fetchMonthlyTrend(productKey);
    } else if (period === 'yearly') {
      data = await fetchYearlyTrend(productKey);
    }

    const items = parseTrendData(data, period);

    // KAMIS 데이터가 없으면 더미 데이터 생성
    if (items.length === 0) {
      const dummyItems = generateDummyData(period, productKey);
      return res.status(200).json({
        success: true,
        product: productKey,
        productName: product.name,
        period: period,
        items: dummyItems,
        isDummy: true,
        message: 'KAMIS API에서 데이터를 가져오지 못해 참고 데이터로 표시됩니다.'
      });
    }

    res.status(200).json({
      success: true,
      product: productKey,
      productName: product.name,
      period: period,
      items: items
    });

  } catch (error) {
    console.error('가격 추이 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '가격 추이 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

// 더미 데이터 생성 (API 연결 실패 시)
function generateDummyData(period, productKey) {
  const basePrices = {
    tomato: 5000, apple: 8000, pear: 7000, grape: 12000,
    strawberry: 20000, watermelon: 25000, cucumber: 4500, pepper: 15000,
    cabbage: 4000, onion: 2500, potato: 4000, garlic: 12000
  };

  const basePrice = basePrices[productKey] || 5000;
  const items = [];

  if (period === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variation = Math.random() * 0.2 - 0.1; // -10% ~ +10%
      items.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        price: Math.round(basePrice * (1 + variation)),
        retailPrice: 0
      });
    }
  } else if (period === 'monthly') {
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const variation = Math.random() * 0.3 - 0.15;
      items.push({
        label: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`,
        price: Math.round(basePrice * (1 + variation)),
        retailPrice: 0
      });
    }
  } else if (period === 'yearly') {
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
      const variation = Math.random() * 0.4 - 0.2;
      items.push({
        label: `${currentYear - i}년`,
        price: Math.round(basePrice * (1 + variation)),
        retailPrice: 0
      });
    }
  }

  return items;
}
