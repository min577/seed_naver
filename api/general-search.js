// Vercel Serverless Function - 일반 상품 검색 API
const axios = require('axios');

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const query = req.query.query || '';

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '검색어를 입력해주세요.'
      });
    }

    // 네이버 쇼핑 API로 검색
    const naverResponse = await axios.get('https://openapi.naver.com/v1/search/shop.json', {
      params: {
        query: query,
        display: 50,
        sort: 'sim',
        exclude: 'used:rental'
      },
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET
      }
    });

    // 검색 결과 정리
    const items = naverResponse.data.items.map(item => ({
      mall: item.mallName,
      title: item.title.replace(/<\/?b>/g, ''),
      price: parseInt(item.lprice, 10),
      link: item.link,
      image: item.image || ''
    }));

    // 최저가순으로 정렬
    items.sort((a, b) => a.price - b.price);

    // 최종 응답
    res.status(200).json({
      success: true,
      query: query,
      total: items.length,
      items: items
    });

  } catch (error) {
    console.error('일반 검색 API 오류:', error.message);
    res.status(500).json({
      success: false,
      error: '검색 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
