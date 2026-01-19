// 공공데이터포털 - 산지 정보 API
// 한국농수산식품유통공사 농축수산물 표준코드 API

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

    const type = req.query.type || 'origins'; // origins, goods, markets 등

    let endpoint = '';

    if (type === 'origins') {
      // 산지코드 조회
      endpoint = 'placeOrigins';
    } else if (type === 'goods') {
      // 품목코드 조회
      endpoint = 'goods';
    } else if (type === 'markets') {
      // 도매시장코드 조회
      endpoint = 'wholesaleMarkets';
    }

    const url = `https://apis.data.go.kr/B552845/katCode/${endpoint}?serviceKey=${encodeURIComponent(apiKey)}&returnType=json&pageNo=1&numOfRows=1000`;

    console.log('공공데이터 API 호출:', endpoint);

    const response = await fetch(url);
    const text = await response.text();

    console.log('API 응답 상태:', response.status);
    console.log('API 응답 (첫 500자):', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('API 응답을 파싱할 수 없습니다.');
    }

    // 응답 구조 확인
    if (!data || !data.data) {
      console.error('예상치 못한 API 응답 구조:', data);
      return res.status(200).json({
        success: true,
        type: type,
        items: [],
        message: 'API 응답 데이터가 비어있습니다.'
      });
    }

    const items = data.data || [];

    res.status(200).json({
      success: true,
      type: type,
      items: items,
      count: items.length
    });

  } catch (error) {
    console.error('산지 정보 API 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '산지 정보를 가져오는 데 실패했습니다.'
    });
  }
};
