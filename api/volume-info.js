// Vercel Serverless Function - 물동량 정보 API
// 서울 열린데이터광장 API: 가락시장 반입물량 정보 조회
const axios = require('axios');

// 서울 열린데이터광장 API 설정
const SEOUL_API_KEY = process.env.SEOUL_API_KEY || '6c45424a54616c7335385850787664';

// 품목 코드 매핑 (부류 코드)
const CATEGORY_CODES = {
  vegetables: { code: '100', name: '채소류' },
  fruits: { code: '200', name: '과일류' },
  specialty: { code: '300', name: '특용작물' },
  flowers: { code: '600', name: '화훼류' }
};

// 도매시장 코드 매핑
const MARKET_CODES = {
  garak: { code: '110001', name: '가락시장' },
  gangseoe: { code: '110002', name: '강서시장' },
  yeongdeungpo: { code: '110003', name: '영등포시장' }
};

// 도매법인 정보 (CORP_CD_1 ~ CORP_CD_6 매핑)
const CORPORATION_INFO = {
  CORP_CD_1: { name: '서울청과', short: '서울' },
  CORP_CD_2: { name: '농협', short: '농협' },
  CORP_CD_3: { name: '중앙청과', short: '중앙' },
  CORP_CD_4: { name: '동화청과', short: '동화' },
  CORP_CD_5: { name: '한국청과', short: '한국' },
  CORP_CD_6: { name: '대아청과', short: '대아' }
};

// 분류 코드 매핑 (SORT_CD)
const SORT_CODE_MAP = {
  '00': { name: '합계', category: 'total' },
  '01': { name: '과일류', category: 'fruits' },
  '02': { name: '과일과채류', category: 'fruitVegetables' },
  '03': { name: '일반채소류', category: 'vegetables' }
};

// 가락시장 반입물량(정산후) 조회 - 서울 열린데이터광장
async function fetchGarakVolumeData(date) {
  // 현재 API 키가 유효하지 않으므로 바로 null 반환
  // 실제 API를 사용하려면 Vercel 환경변수에 SEOUL_API_KEY를 설정하세요
  const useRealApi = process.env.SEOUL_API_KEY && process.env.SEOUL_API_KEY !== '6c45424a54616c7335385850787664';

  if (!useRealApi) {
    console.log('SEOUL_API_KEY 환경변수가 설정되지 않아 더미 데이터를 사용합니다.');
    return null;
  }

  const serviceName = 'GarakPayAfter';
  const url = `http://openAPI.seoul.go.kr:8088/${process.env.SEOUL_API_KEY}/json/${serviceName}/1/1000/`;

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      params: date ? { P_SRCH_DATE: date } : {},
      headers: {
        'Accept': 'application/json'
      }
    });

    // 응답이 JSON인지 확인
    if (typeof response.data === 'string') {
      console.error('API 응답이 JSON이 아닙니다:', response.data.substring(0, 100));
      return null;
    }

    // 응답에 GarakPayAfter 키가 있는지 확인
    if (!response.data || !response.data.GarakPayAfter) {
      console.error('API 응답 형식이 올바르지 않습니다');
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('서울 열린데이터광장 API 조회 오류:', error.message);
    return null;
  }
}

// API 응답 데이터 파싱 - 품목별 물동량
function parseApiDataByProduct(apiData) {
  const rows = apiData.GarakPayAfter?.row || [];
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const items = [];

  rows.forEach(row => {
    const sortCode = row.SORT_CD;

    // 합계(00)와 대분류 계(01, 02, 03)는 제외하고 개별 품목만 추출
    if (sortCode === '00' || sortCode === '01' || sortCode === '02' || sortCode === '03' || sortCode === '21') {
      return;
    }

    const volume = parseFloat(row.SUM_TOT) || 0;
    if (volume <= 0) return;

    // 카테고리 결정 (SORT_CD 앞자리로 판단)
    let category = '기타';
    if (sortCode.startsWith('1')) category = '과일류';
    else if (sortCode.startsWith('2')) category = '과일과채류';
    else if (sortCode.startsWith('3')) category = '일반채소류';

    items.push({
      product: row.PUM_NM || row.PUM_CD,
      category: category,
      volume: Math.round(volume * 1000), // 톤 -> kg 변환
      unit: 'kg',
      corporations: {
        seoul: Math.round((parseFloat(row.CORP_CD_1) || 0) * 1000),
        nonghyup: Math.round((parseFloat(row.CORP_CD_2) || 0) * 1000),
        jungang: Math.round((parseFloat(row.CORP_CD_3) || 0) * 1000),
        donghwa: Math.round((parseFloat(row.CORP_CD_4) || 0) * 1000),
        hankook: Math.round((parseFloat(row.CORP_CD_5) || 0) * 1000),
        daea: Math.round((parseFloat(row.CORP_CD_6) || 0) * 1000)
      }
    });
  });

  return items.sort((a, b) => b.volume - a.volume);
}

// API 응답 데이터 파싱 - 카테고리별 요약 (도매법인별)
function parseApiDataByCategory(apiData) {
  const rows = apiData.GarakPayAfter?.row || [];
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const items = [];
  let totalData = null;
  let dateStr = '';

  rows.forEach(row => {
    const sortCode = row.SORT_CD;
    dateStr = row.TODATE || dateStr;

    // 합계 데이터
    if (sortCode === '00') {
      totalData = {
        totalVolume: Math.round((parseFloat(row.SUM_TOT) || 0) * 1000),
        corporations: {
          seoul: Math.round((parseFloat(row.CORP_CD_1) || 0) * 1000),
          nonghyup: Math.round((parseFloat(row.CORP_CD_2) || 0) * 1000),
          jungang: Math.round((parseFloat(row.CORP_CD_3) || 0) * 1000),
          donghwa: Math.round((parseFloat(row.CORP_CD_4) || 0) * 1000),
          hankook: Math.round((parseFloat(row.CORP_CD_5) || 0) * 1000),
          daea: Math.round((parseFloat(row.CORP_CD_6) || 0) * 1000)
        }
      };
      return;
    }

    // 대분류 계(01, 02, 03)만 추출
    if (sortCode === '01' || sortCode === '02' || sortCode === '03') {
      const sortInfo = SORT_CODE_MAP[sortCode];
      items.push({
        category: sortInfo?.name || row.PUM_NM,
        categoryKey: sortInfo?.category || sortCode,
        volume: Math.round((parseFloat(row.SUM_TOT) || 0) * 1000),
        unit: 'kg',
        corporations: {
          seoul: Math.round((parseFloat(row.CORP_CD_1) || 0) * 1000),
          nonghyup: Math.round((parseFloat(row.CORP_CD_2) || 0) * 1000),
          jungang: Math.round((parseFloat(row.CORP_CD_3) || 0) * 1000),
          donghwa: Math.round((parseFloat(row.CORP_CD_4) || 0) * 1000),
          hankook: Math.round((parseFloat(row.CORP_CD_5) || 0) * 1000),
          daea: Math.round((parseFloat(row.CORP_CD_6) || 0) * 1000)
        }
      });
    }
  });

  return {
    items: items.sort((a, b) => b.volume - a.volume),
    total: totalData,
    date: dateStr
  };
}

// 더미 데이터 생성 - 품목별 물동량
function generateDummyVolumeByProduct() {
  const products = [
    { name: '배추', category: '채소류' },
    { name: '무', category: '채소류' },
    { name: '양배추', category: '채소류' },
    { name: '시금치', category: '채소류' },
    { name: '상추', category: '채소류' },
    { name: '토마토', category: '채소류' },
    { name: '오이', category: '채소류' },
    { name: '고추', category: '채소류' },
    { name: '사과', category: '과일류' },
    { name: '배', category: '과일류' },
    { name: '포도', category: '과일류' },
    { name: '딸기', category: '과일류' },
    { name: '감귤', category: '과일류' },
    { name: '수박', category: '과일류' },
    { name: '참외', category: '과일류' },
    { name: '바나나', category: '과일류' }
  ];

  return products.map(product => {
    const baseVolume = Math.floor(Math.random() * 500000) + 100000;
    const prevVolume = baseVolume * (1 + (Math.random() * 0.2 - 0.1));
    const change = ((baseVolume - prevVolume) / prevVolume * 100).toFixed(1);

    return {
      product: product.name,
      category: product.category,
      volume: baseVolume,
      unit: 'kg',
      prevVolume: Math.round(prevVolume),
      change: parseFloat(change),
      corporations: {
        seoul: Math.floor(baseVolume * 0.25),
        nonghyup: Math.floor(baseVolume * 0.20),
        jungang: Math.floor(baseVolume * 0.18),
        donghwa: Math.floor(baseVolume * 0.15),
        hankook: Math.floor(baseVolume * 0.12),
        daea: Math.floor(baseVolume * 0.10)
      }
    };
  }).sort((a, b) => b.volume - a.volume);
}

// 더미 데이터 생성 - 도매시장별 물동량
function generateDummyVolumeByMarket() {
  const markets = [
    { name: '가락시장', region: '서울 송파구' },
    { name: '강서시장', region: '서울 강서구' },
    { name: '영등포시장', region: '서울 영등포구' },
    { name: '구리농산물시장', region: '경기 구리시' },
    { name: '안양농산물시장', region: '경기 안양시' },
    { name: '수원농산물시장', region: '경기 수원시' },
    { name: '부산엄궁농산물시장', region: '부산 사상구' },
    { name: '대구북부농산물시장', region: '대구 북구' },
    { name: '대전오정농산물시장', region: '대전 대덕구' },
    { name: '광주각화농산물시장', region: '광주 서구' },
    { name: '인천구월농산물시장', region: '인천 남동구' },
    { name: '울산농산물시장', region: '울산 남구' }
  ];

  return markets.map((market, index) => {
    // 가락시장이 가장 크므로 높은 물동량 부여
    const baseVolume = index === 0
      ? Math.floor(Math.random() * 5000000) + 8000000
      : Math.floor(Math.random() * 2000000) + 500000;

    const prevVolume = baseVolume * (1 + (Math.random() * 0.15 - 0.075));
    const change = ((baseVolume - prevVolume) / prevVolume * 100).toFixed(1);

    return {
      market: market.name,
      region: market.region,
      totalVolume: baseVolume,
      unit: 'kg',
      prevVolume: Math.round(prevVolume),
      change: parseFloat(change),
      categories: {
        vegetables: Math.floor(baseVolume * 0.45),
        fruits: Math.floor(baseVolume * 0.40),
        specialty: Math.floor(baseVolume * 0.10),
        flowers: Math.floor(baseVolume * 0.05)
      }
    };
  }).sort((a, b) => b.totalVolume - a.totalVolume);
}

// 더미 데이터 생성 - 일별 물동량 추이
function generateDummyVolumeTrend(days = 14) {
  const items = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 주말(일요일)은 경매 없음
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) continue; // 일요일 제외

    const baseVolume = 8000000 + Math.floor(Math.random() * 2000000);
    // 월요일은 물량이 많음 (주말 동안 축적)
    const multiplier = dayOfWeek === 1 ? 1.2 : 1;

    items.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek],
      totalVolume: Math.floor(baseVolume * multiplier),
      vegetables: Math.floor(baseVolume * multiplier * 0.45),
      fruits: Math.floor(baseVolume * multiplier * 0.40),
      specialty: Math.floor(baseVolume * multiplier * 0.10),
      flowers: Math.floor(baseVolume * multiplier * 0.05)
    });
  }

  return items;
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
    const viewType = req.query.view || 'market'; // market, product, trend
    const date = req.query.date;

    // 서울 열린데이터광장 API 호출 시도
    let apiData = null;
    if (SEOUL_API_KEY && SEOUL_API_KEY !== 'sample') {
      apiData = await fetchGarakVolumeData(date);
    }

    // API 응답 확인
    const hasApiData = apiData && apiData.GarakPayAfter && apiData.GarakPayAfter.RESULT?.CODE === 'INFO-000';

    // API 데이터가 없으면 더미 데이터 사용
    if (!hasApiData) {
      let items;
      let summary = {};

      if (viewType === 'product') {
        items = generateDummyVolumeByProduct();
        summary = {
          totalProducts: items.length,
          totalVolume: items.reduce((sum, item) => sum + item.volume, 0),
          topProduct: items[0]?.product || '-'
        };
      } else if (viewType === 'trend') {
        items = generateDummyVolumeTrend(14);
        const avgVolume = items.reduce((sum, item) => sum + item.totalVolume, 0) / items.length;
        summary = {
          averageDaily: Math.round(avgVolume),
          maxVolume: Math.max(...items.map(i => i.totalVolume)),
          minVolume: Math.min(...items.map(i => i.totalVolume)),
          dataPoints: items.length
        };
      } else {
        // 기본: market 뷰
        items = generateDummyVolumeByMarket();
        summary = {
          totalMarkets: items.length,
          totalVolume: items.reduce((sum, item) => sum + item.totalVolume, 0),
          topMarket: items[0]?.market || '-'
        };
      }

      return res.status(200).json({
        success: true,
        viewType: viewType,
        date: date || new Date().toISOString().split('T')[0],
        items: items,
        summary: summary,
        isDummy: true,
        message: '서울 열린데이터광장 API 인증키가 없어 참고 데이터로 표시됩니다. 실제 데이터를 보려면 SEOUL_API_KEY 환경변수를 설정하세요.'
      });
    }

    // 실제 API 데이터 처리
    let items;
    let summary = {};
    let apiDate = '';

    if (viewType === 'product') {
      // 품목별 물동량
      items = parseApiDataByProduct(apiData);
      if (items && items.length > 0) {
        summary = {
          totalProducts: items.length,
          totalVolume: items.reduce((sum, item) => sum + item.volume, 0),
          topProduct: items[0]?.product || '-'
        };
      }
    } else if (viewType === 'trend') {
      // 추이 데이터는 더미 사용 (API가 단일 날짜만 제공)
      items = generateDummyVolumeTrend(14);
      const avgVolume = items.reduce((sum, item) => sum + item.totalVolume, 0) / items.length;
      summary = {
        averageDaily: Math.round(avgVolume),
        maxVolume: Math.max(...items.map(i => i.totalVolume)),
        minVolume: Math.min(...items.map(i => i.totalVolume)),
        dataPoints: items.length
      };
      return res.status(200).json({
        success: true,
        viewType: viewType,
        date: date || new Date().toISOString().split('T')[0],
        items: items,
        summary: summary,
        isDummy: true,
        message: '추이 데이터는 참고용 데이터입니다.'
      });
    } else {
      // 기본: market 뷰 (카테고리별 요약)
      const categoryData = parseApiDataByCategory(apiData);
      if (categoryData) {
        items = categoryData.items;
        apiDate = categoryData.date;
        const total = categoryData.total;
        summary = {
          totalVolume: total?.totalVolume || 0,
          corporations: total?.corporations || {},
          categories: items.length
        };
      }
    }

    // 파싱 실패 시 더미 데이터 사용
    if (!items || items.length === 0) {
      if (viewType === 'product') {
        items = generateDummyVolumeByProduct();
        summary = {
          totalProducts: items.length,
          totalVolume: items.reduce((sum, item) => sum + item.volume, 0),
          topProduct: items[0]?.product || '-'
        };
      } else {
        items = generateDummyVolumeByMarket();
        summary = {
          totalMarkets: items.length,
          totalVolume: items.reduce((sum, item) => sum + item.totalVolume, 0),
          topMarket: items[0]?.market || '-'
        };
      }
      return res.status(200).json({
        success: true,
        viewType: viewType,
        date: date || new Date().toISOString().split('T')[0],
        items: items,
        summary: summary,
        isDummy: true,
        message: 'API 데이터 파싱 실패로 참고 데이터를 표시합니다.'
      });
    }

    // 날짜 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
    let formattedDate = date || new Date().toISOString().split('T')[0];
    if (apiDate && apiDate.length === 8) {
      formattedDate = `${apiDate.slice(0, 4)}-${apiDate.slice(4, 6)}-${apiDate.slice(6, 8)}`;
    }

    res.status(200).json({
      success: true,
      viewType: viewType,
      date: formattedDate,
      items: items,
      summary: summary,
      source: '가락시장 (서울 열린데이터광장)'
    });

  } catch (error) {
    console.error('물동량 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '물동량 데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
