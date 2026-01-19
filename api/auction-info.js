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
    const numOfRows = req.query.numOfRows || '100';

    // 전국 공영도매시장 경매원천정보 API (산지 정보 포함)
    console.log('전국 공영도매시장 경매원천정보 API 조회 시작');

    // 단일 날짜로 테스트 (2024년 12월 31일)
    const dateStr = '2024-12-31';

    // API 엔드포인트: /trades
    const url = `https://apis.data.go.kr/B552845/katOrigin/trades?serviceKey=${encodeURIComponent(apiKey)}&returnType=json&pageNo=${pageNo}&numOfRows=${numOfRows}&cond[trd_clcln_ymd::EQ]=${dateStr}`;

    console.log('API 호출 URL:', url.replace(apiKey, 'HIDDEN'));
    console.log('조회 날짜:', dateStr);

    const response = await fetch(url);
    const text = await response.text();

    console.log('응답 상태:', response.status);
    console.log('응답 본문 (첫 2000자):', text.substring(0, 2000));

    let data = null;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      return res.status(200).json({
        success: false,
        error: 'API 응답 파싱 실패',
        rawResponse: text.substring(0, 2000),
        parseError: parseError.message
      });
    }

    console.log('파싱된 데이터 전체 구조:', JSON.stringify(data, null, 2).substring(0, 3000));

    // 응답 구조 확인
    if (!data || !data.response) {
      return res.status(200).json({
        success: false,
        error: '응답 구조 오류',
        message: 'response 객체가 없습니다',
        rawData: data,
        debugInfo: {
          hasData: !!data,
          hasResponse: !!(data?.response),
          dataKeys: data ? Object.keys(data) : []
        }
      });
    }

    const responseHeader = data.response.header;
    const responseBody = data.response.body;

    console.log('응답 헤더:', JSON.stringify(responseHeader));
    console.log('응답 바디 구조:', JSON.stringify(responseBody).substring(0, 1000));

    // 에러 코드 확인 (00 또는 0이면 정상)
    if (responseHeader && responseHeader.resultCode !== '00' && responseHeader.resultCode !== '0') {
      return res.status(200).json({
        success: false,
        error: 'API 오류',
        resultCode: responseHeader.resultCode,
        resultMessage: responseHeader.resultMsg,
        debugInfo: {
          apiUrl: url.replace(apiKey, 'HIDDEN'),
          date: dateStr
        }
      });
    }

    if (!responseBody) {
      return res.status(200).json({
        success: false,
        error: 'body 없음',
        message: 'response.body가 없습니다',
        responseHeader: responseHeader,
        debugInfo: {
          hasBody: !!responseBody,
          responseKeys: data.response ? Object.keys(data.response) : []
        }
      });
    }

    let items = responseBody.items?.item || [];

    // 배열이 아닌 경우 배열로 변환
    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    console.log('데이터 개수:', items.length);
    console.log('totalCount:', responseBody.totalCount);
    if (items.length > 0) {
      console.log('첫 번째 항목:', JSON.stringify(items[0]));
    }

    // 데이터가 없는 경우
    if (items.length === 0) {
      return res.status(200).json({
        success: false,
        error: '데이터 없음',
        message: `${dateStr} 데이터가 없습니다`,
        debugInfo: {
          resultCode: responseHeader?.resultCode,
          resultMessage: responseHeader?.resultMsg,
          totalCount: responseBody.totalCount,
          numOfRows: responseBody.numOfRows,
          pageNo: responseBody.pageNo,
          hasItems: !!responseBody.items,
          itemsType: typeof responseBody.items,
          apiUrl: url.replace(apiKey, 'HIDDEN')
        }
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
      date: dateStr
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
