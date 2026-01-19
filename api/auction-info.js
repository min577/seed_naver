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

    // 최근 7일 이내 데이터 조회 (당일 데이터는 정산 전이라 없을 수 있음)
    const today = new Date();
    today.setDate(today.getDate() - 2); // 2일 전 날짜 (더 안정적)
    const dateStr = today.toISOString().split('T')[0];

    // API 엔드포인트: /trades
    // 필수 파라미터: cond[trd_clcln_ymd::EQ] (거래정산일자)
    // 도매시장코드를 생략하면 전국 모든 도매시장 데이터 조회
    const url = `https://apis.data.go.kr/B552845/katOrigin/trades?serviceKey=${encodeURIComponent(apiKey)}&returnType=json&pageNo=${pageNo}&numOfRows=${numOfRows}&cond[trd_clcln_ymd::EQ]=${dateStr}`;

    let data = null;
    let text = '';

    console.log('경매원천정보 API 조회 (URL):', url);
    console.log('조회 날짜:', dateStr);
    console.log('전국 도매시장 데이터 조회');

    const response = await fetch(url);
    text = await response.text();
    console.log('경매정보 API 응답 상태:', response.status);

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

    // 공공데이터포털 API 응답 구조: response.body.items.item
    if (!data || !data.response || !data.response.body) {
      console.error('예상치 못한 API 응답 구조');
      return res.status(200).json({
        success: false,
        error: 'API 응답 데이터 구조 오류',
        rawData: data,
        message: 'API 응답 데이터가 비어있거나 구조가 다릅니다.'
      });
    }

    const responseBody = data.response.body;
    let items = responseBody.items?.item || [];

    // 배열이 아닌 경우 배열로 변환
    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    console.log('경매 데이터 개수:', items.length);
    console.log('totalCount:', responseBody.totalCount);
    if (items.length > 0) {
      console.log('첫 번째 항목 샘플:', JSON.stringify(items[0]));
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
      message: result.length === 0 ? `${dateStr} 데이터가 없습니다. API 키 또는 날짜를 확인하세요.` : undefined
    });

  } catch (error) {
    console.error('실시간 경매정보 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '경매 정보를 가져오는 데 실패했습니다.'
    });
  }
};
