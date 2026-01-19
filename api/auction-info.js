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

    // 전국 공영도매시장 경매원천정보 API (산지 정보 포함)
    console.log('전국 공영도매시장 경매원천정보 API 조회 시작');

    // 여러 날짜를 시도하여 데이터 찾기
    const testDates = [
      '2024-12-31',
      '2024-12-30',
      '2024-12-27',
      '2024-12-26',
      '2024-12-25',
      '2024-12-24',
      '2024-12-23',
      '2024-12-20',
      '2025-01-02',
      '2025-01-03',
      '2025-01-06',
      '2025-01-07',
      '2025-01-08',
      '2025-01-09',
      '2025-01-10'
    ];

    let data = null;
    let dateStr = '';
    let items = [];

    // 각 날짜를 시도하여 데이터가 있는지 확인
    for (const testDate of testDates) {
      const url = `https://apis.data.go.kr/B552845/katOrigin/trades?serviceKey=${encodeURIComponent(apiKey)}&returnType=json&pageNo=${pageNo}&numOfRows=${numOfRows}&cond[trd_clcln_ymd::EQ]=${testDate}`;

      console.log(`테스트 날짜: ${testDate}`);

      const response = await fetch(url);
      const text = await response.text();
      console.log('경매정보 API 응답 상태:', response.status);

      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', parseError);
        continue; // 다음 날짜 시도
      }

      // 응답 구조 확인
      if (!data || !data.response || !data.response.body) {
        console.log(`${testDate}: 응답 구조 오류`);
        continue;
      }

      const responseBody = data.response.body;
      let testItems = responseBody.items?.item || [];

      // 배열이 아닌 경우 배열로 변환
      if (!Array.isArray(testItems)) {
        testItems = testItems ? [testItems] : [];
      }

      console.log(`${testDate}: 데이터 개수 = ${testItems.length}, totalCount = ${responseBody.totalCount}`);

      // 데이터가 있으면 사용
      if (testItems.length > 0) {
        items = testItems;
        dateStr = testDate;
        console.log(`✓ ${testDate} 데이터 발견! (${items.length}건)`);
        console.log('첫 번째 항목 샘플:', JSON.stringify(items[0]));
        break; // 데이터를 찾았으므로 종료
      }
    }

    // 모든 날짜를 시도했지만 데이터가 없는 경우
    if (items.length === 0) {
      console.log('모든 테스트 날짜에서 데이터를 찾지 못했습니다.');
      return res.status(200).json({
        success: false,
        error: '데이터 없음',
        message: '여러 날짜를 시도했지만 데이터를 찾지 못했습니다. API가 현재 데이터를 제공하지 않을 수 있습니다.',
        testedDates: testDates
      });
    }

    // 품목명 필터 적용 (중분류명 기준)
    if (product) {
      items = items.filter(item =>
        (item.mdcls_nm && item.mdcls_nm.includes(product)) ||
        (item.smlcls_nm && item.smlcls_nm.includes(product))
      );
    }

    // 도매시장별, 품목별로 집계
    const marketProductMap = new Map();

    items.forEach(item => {
      // 품목명: 소분류 > 중분류 > 대분류 순서로 사용
      const productName = item.smlcls_nm || item.mdcls_nm || item.lrg_clsf_nm || '알 수 없음';
      const marketName = item.whsl_mrkt_nm || '미상';
      const marketCode = item.whsl_mrkt_cd || '';
      const origin = item.plor_nm || '미상';
      const volume = parseFloat(item.qty) || 0;

      // 키: "도매시장코드-품목명"
      const key = `${marketCode}-${productName}`;

      if (!marketProductMap.has(key)) {
        marketProductMap.set(key, {
          product: productName,
          market: marketName,
          marketCode: marketCode,
          totalVolume: 0,
          origins: new Map(),
          category: item.lrg_clsf_nm || '기타'
        });
      }

      const data = marketProductMap.get(key);
      data.totalVolume += volume;

      if (!data.origins.has(origin)) {
        data.origins.set(origin, 0);
      }
      data.origins.set(origin, data.origins.get(origin) + volume);
    });

    // Map을 배열로 변환하고 정렬
    const result = Array.from(marketProductMap.values())
      .map(item => ({
        product: item.product,
        market: item.market,
        marketCode: item.marketCode,
        category: item.category,
        volume: Math.round(item.totalVolume),
        origins: Array.from(item.origins.entries())
          .map(([name, vol]) => ({ name, volume: Math.round(vol) }))
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 3) // 상위 3개 산지
      }))
      .sort((a, b) => b.volume - a.volume);

    // 도매시장 목록 추출
    const markets = [...new Set(result.map(item => item.market))];

    console.log('최종 결과:', {
      totalProducts: result.length,
      totalMarkets: markets.length,
      sampleItem: result[0]
    });

    res.status(200).json({
      success: true,
      items: result,
      totalProducts: result.length,
      totalMarkets: markets.length,
      markets: markets,
      hasOriginData: items.filter(item => item.plor_nm).length > 0,
      date: dateStr,
      message: result.length === 0 ? `${dateStr} 데이터가 없습니다.` : undefined
    });

  } catch (error) {
    console.error('실시간 경매정보 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '경매 정보를 가져오는 데 실패했습니다.'
    });
  }
};
