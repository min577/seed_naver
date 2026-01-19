// 공공데이터포털 - 실시간 경매정보 API (산지 정보 포함)
// 한국농수산식품유통공사 전국 공영도매시장 실시간 경매정보

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const apiKey = process.env.PUBLIC_DATA_API_KEY;

    if (!apiKey) {
      throw new Error('PUBLIC_DATA_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    const product = req.query.product || ''; // 품목명 필터
    const pageNo = req.query.pageNo || '1';
    const numOfRows = req.query.numOfRows || '1000';

    // 최근 영업일 날짜 계산 (일요일 제외)
    const today = new Date();
    const dayOfWeek = today.getDay();

    // 일요일(0)이면 금요일(2일 전), 월요일(1)이면 금요일(3일 전), 그 외는 전날
    let daysBack = 1;
    if (dayOfWeek === 0) daysBack = 2; // 일요일 -> 금요일
    else if (dayOfWeek === 1) daysBack = 3; // 월요일 -> 금요일

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - daysBack);
    const dateStr = targetDate.toISOString().split('T')[0];

    const reqDate = req.query.date || dateStr;

    const url = `https://apis.data.go.kr/B552845/katRealTime2/trades2?serviceKey=${encodeURIComponent(apiKey)}&returnType=json&pageNo=${pageNo}&numOfRows=${numOfRows}&cond[scsbd_dt::LIKE]=${reqDate}`;

    console.log('실시간 경매정보 API 호출');
    console.log('조회 날짜:', reqDate, '(요일:', ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek] + ')');
    console.log('API URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(url);
    const text = await response.text();

    console.log('경매정보 API 응답 상태:', response.status);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.error('원본 응답 (첫 1000자):', text.substring(0, 1000));
      return res.status(200).json({
        success: false,
        error: 'API 응답 파싱 실패',
        rawResponse: text.substring(0, 1000),
        parseError: parseError.message,
        apiUrl: url
      });
    }

    // 응답 구조 확인
    console.log('파싱된 데이터 구조:', JSON.stringify(data).substring(0, 500));

    if (!data || !data.data) {
      console.error('예상치 못한 API 응답 구조');
      return res.status(200).json({
        success: false,
        error: 'API 응답 데이터 구조 오류',
        rawData: data,
        message: 'API 응답 데이터가 비어있거나 구조가 다릅니다.'
      });
    }

    let items = data.data || [];

    // 품목명 필터 적용
    if (product) {
      items = items.filter(item =>
        item.gds_sclsf_nm && item.gds_sclsf_nm.includes(product)
      );
    }

    // 산지 정보가 있는 항목만 필터링 (선택적)
    const itemsWithOrigin = items.filter(item => item.plor_nm);

    // 품목별로 집계
    const productMap = new Map();

    items.forEach(item => {
      const productName = item.gds_sclsf_nm || '알 수 없음';
      const origin = item.plor_nm || '미상';
      const volume = parseFloat(item.damt_qty) || 0;

      const key = `${productName}`;

      if (!productMap.has(key)) {
        productMap.set(key, {
          product: productName,
          totalVolume: 0,
          origins: new Map(),
          category: item.gds_lclsf_nm || '기타'
        });
      }

      const productData = productMap.get(key);
      productData.totalVolume += volume;

      if (!productData.origins.has(origin)) {
        productData.origins.set(origin, 0);
      }
      productData.origins.set(origin, productData.origins.get(origin) + volume);
    });

    // Map을 배열로 변환하고 정렬
    const result = Array.from(productMap.values())
      .map(item => ({
        product: item.product,
        category: item.category,
        volume: Math.round(item.totalVolume),
        origins: Array.from(item.origins.entries())
          .map(([name, vol]) => ({ name, volume: Math.round(vol) }))
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 3) // 상위 3개 산지
      }))
      .sort((a, b) => b.volume - a.volume);

    res.status(200).json({
      success: true,
      items: result,
      totalProducts: result.length,
      hasOriginData: itemsWithOrigin.length > 0
    });

  } catch (error) {
    console.error('실시간 경매정보 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '경매 정보를 가져오는 데 실패했습니다.'
    });
  }
};
