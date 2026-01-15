// Vercel Serverless Function - 지역별 가격 API
// KAMIS API: 지역별 도소매 가격 정보 조회
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

// 지역 코드 매핑
const REGION_CODES = {
  '1101': '서울',
  '2100': '부산',
  '2200': '대구',
  '2300': '인천',
  '2401': '광주',
  '2501': '대전',
  '2601': '울산',
  '3111': '수원',
  '3211': '춘천',
  '3311': '청주',
  '3511': '전주',
  '3711': '포항',
  '3911': '제주'
};

// 지역별 가격 정보 조회 (API 10번: 최근일자 지역별 도.소매가격정보)
async function fetchRegionPrice(productKey) {
  const product = PRODUCT_CODES[productKey];
  if (!product) return null;

  const today = new Date();
  const regday = today.toISOString().split('T')[0].replace(/-/g, '');

  const params = {
    action: 'recentlyAreaPriceTrendList',
    p_productclscode: '01', // 소매
    p_itemcategorycode: product.categoryCode,
    p_itemcode: product.itemCode,
    p_kindcode: product.kindCode,
    p_productrankcode: '04', // 상품
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
    console.error('KAMIS 지역별 가격 조회 오류:', error.message);
    return null;
  }
}

// 지역별 품목별 가격 조회 (API 14번)
async function fetchRegionProductPrice(productKey) {
  const product = PRODUCT_CODES[productKey];
  if (!product) return null;

  const today = new Date();
  const regday = today.toISOString().split('T')[0].replace(/-/g, '');

  const params = {
    action: 'itemAreaPriceList',
    p_productclscode: '01',
    p_regday: regday,
    p_itemcategorycode: product.categoryCode,
    p_itemcode: product.itemCode,
    p_kindcode: product.kindCode,
    p_productrankcode: '04',
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
    console.error('KAMIS 지역별 품목 가격 조회 오류:', error.message);
    return null;
  }
}

// 응답 데이터 파싱
function parseRegionData(data) {
  if (!data || !data.data || !data.data.item) {
    return [];
  }

  const items = Array.isArray(data.data.item) ? data.data.item : [data.data.item];
  const result = [];

  items.forEach(item => {
    const regionCode = item.countycode || item.areacode;
    const regionName = item.countyname || item.areaname || REGION_CODES[regionCode] || '기타';

    const price = parseInt((item.price || item.dpr1 || '0').replace(/,/g, ''), 10);
    const prevPrice = parseInt((item.d1 || item.dpr2 || '0').replace(/,/g, ''), 10);

    if (price > 0) {
      result.push({
        region: regionName,
        regionCode: regionCode,
        wholesalePrice: 0,
        retailPrice: price,
        change: prevPrice > 0 ? price - prevPrice : 0
      });
    }
  });

  // 중복 제거 및 정렬
  const uniqueRegions = {};
  result.forEach(item => {
    if (!uniqueRegions[item.region] || item.retailPrice > uniqueRegions[item.region].retailPrice) {
      uniqueRegions[item.region] = item;
    }
  });

  return Object.values(uniqueRegions).sort((a, b) => b.retailPrice - a.retailPrice);
}

// 더미 데이터 생성
function generateDummyData(productKey) {
  const basePrices = {
    tomato: 5000, apple: 8000, pear: 7000, grape: 12000,
    strawberry: 20000, watermelon: 25000, cucumber: 4500, pepper: 15000,
    cabbage: 4000, onion: 2500, potato: 4000, garlic: 12000
  };

  const basePrice = basePrices[productKey] || 5000;
  const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '수원', '청주', '전주', '제주'];

  return regions.map(region => {
    const variation = Math.random() * 0.3 - 0.15; // -15% ~ +15%
    const price = Math.round(basePrice * (1 + variation));
    const changeVar = Math.random() * 0.1 - 0.05;
    const change = Math.round(basePrice * changeVar);

    return {
      region: region,
      regionCode: '',
      wholesalePrice: Math.round(price * 0.7),
      retailPrice: price,
      change: change
    };
  }).sort((a, b) => b.retailPrice - a.retailPrice);
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

    const product = PRODUCT_CODES[productKey];
    if (!product) {
      return res.status(400).json({
        success: false,
        error: '지원하지 않는 품목입니다.',
        availableProducts: Object.keys(PRODUCT_CODES)
      });
    }

    // 먼저 API 14번 시도
    let data = await fetchRegionProductPrice(productKey);
    let items = parseRegionData(data);

    // 데이터가 없으면 API 10번 시도
    if (items.length === 0) {
      data = await fetchRegionPrice(productKey);
      items = parseRegionData(data);
    }

    // 여전히 데이터가 없으면 더미 데이터 사용
    if (items.length === 0) {
      items = generateDummyData(productKey);
      return res.status(200).json({
        success: true,
        product: productKey,
        productName: product.name,
        date: new Date().toISOString().split('T')[0],
        items: items,
        isDummy: true,
        message: 'KAMIS API에서 데이터를 가져오지 못해 참고 데이터로 표시됩니다.'
      });
    }

    res.status(200).json({
      success: true,
      product: productKey,
      productName: product.name,
      date: new Date().toISOString().split('T')[0],
      items: items
    });

  } catch (error) {
    console.error('지역별 가격 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '지역별 가격 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
