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

    // 2025년 최근 날짜부터 시도 (API가 2026년 데이터를 아직 제공하지 않음)
    const testDates = [
      '2025-12-31',
      '2025-12-30',
      '2025-12-27',
      '2025-12-26',
      '2025-12-25',
      '2025-12-24',
      '2025-12-23',
      '2025-12-20',
      '2025-12-19',
      '2025-12-18'
    ];

    console.log('조회할 날짜 목록:', testDates);

    // 전국 주요 도매시장 코드 (32개 공영도매시장 중 주요 시장)
    const marketCodes = [
      { code: '110001', name: '서울가락' },
      { code: '210003', name: '부산엄궁' },
      { code: '220004', name: '부산반여' },
      { code: '230002', name: '대구북부' },
      { code: '240001', name: '인천삼산' },
      { code: '250001', name: '광주각화' },
      { code: '260001', name: '대전오정' },
      { code: '270001', name: '울산' },
      { code: '310001', name: '수원' },
      { code: '320001', name: '안양' },
      { code: '330001', name: '안산' },
      { code: '410003', name: '강릉' },
      { code: '420005', name: '청주' },
      { code: '430002', name: '천안' },
      { code: '440001', name: '전주' },
      { code: '450001', name: '포항' }
    ];

    let allItems = [];
    let successCount = 0;
    let dateStr = '';

    // 각 날짜별로 시도 (데이터를 찾으면 중단)
    for (const testDate of testDates) {
      console.log(`날짜 ${testDate} 조회 시작`);
      let dateItems = [];

      // 각 도매시장별로 데이터 조회
      for (const market of marketCodes) {
        try {
          const url = `https://apis.data.go.kr/B552845/katOrigin/trades?serviceKey=${encodeURIComponent(apiKey)}&returnType=json&pageNo=${pageNo}&numOfRows=${numOfRows}&cond[trd_clcln_ymd::EQ]=${testDate}&cond[whsl_mrkt_cd::EQ]=${market.code}`;

          const response = await fetch(url);
          const text = await response.text();

          let data = null;
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            continue;
          }

          // 응답 구조 확인
          if (!data || !data.response || !data.response.body) {
            continue;
          }

          const responseHeader = data.response.header;
          const responseBody = data.response.body;

          // 에러 코드 확인
          if (responseHeader && responseHeader.resultCode !== '00' && responseHeader.resultCode !== '0') {
            continue;
          }

          let items = responseBody.items?.item || [];

          // 배열이 아닌 경우 배열로 변환
          if (!Array.isArray(items)) {
            items = items ? [items] : [];
          }

          if (items.length > 0) {
            dateItems = dateItems.concat(items);
          }
        } catch (marketError) {
          console.error(`${market.name} 조회 오류:`, marketError.message);
        }
      }

      // 이 날짜에서 데이터를 찾았으면 사용하고 종료
      if (dateItems.length > 0) {
        allItems = dateItems;
        dateStr = testDate;
        successCount = marketCodes.filter(m =>
          dateItems.some(item => item.whsl_mrkt_cd === m.code)
        ).length;
        console.log(`✓ ${testDate} 데이터 발견! (${allItems.length}건, ${successCount}개 시장)`);
        break;
      }
    }

    console.log(`총 ${successCount}개 시장에서 ${allItems.length}건 수집`);

    // 데이터가 없는 경우
    if (allItems.length === 0) {
      return res.status(200).json({
        success: false,
        error: '데이터 없음',
        message: `최근 10일간 전국 도매시장 데이터가 없습니다`,
        debugInfo: {
          datesChecked: testDates,
          marketsChecked: marketCodes.length
        }
      });
    }

    // 품목명 필터 적용
    if (product) {
      allItems = allItems.filter(item =>
        (item.mdcls_nm && item.mdcls_nm.includes(product)) ||
        (item.smlcls_nm && item.smlcls_nm.includes(product))
      );
    }

    // 도매시장별, 품목별로 집계
    const marketProductMap = new Map();

    allItems.forEach(item => {
      const productName = item.smlcls_nm || item.mdcls_nm || item.lrg_clsf_nm || '알 수 없음';
      const marketName = item.whsl_mrkt_nm || '미상';
      const marketCode = item.whsl_mrkt_cd || '';
      const origin = item.plor_nm || '미상';
      const volume = parseFloat(item.qty) || 0;

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
      hasOriginData: allItems.filter(item => item.plor_nm).length > 0,
      date: dateStr,
      marketsChecked: marketCodes.length,
      marketsWithData: successCount
    });

  } catch (error) {
    console.error('실시간 경매정보 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '경매 정보를 가져오는 데 실패했습니다.',
      stack: error.stack
    });
  }
};
