// ============================================
// API 설정
// ============================================

const API_CONFIG = {
    // 운영 서버 (외부 접속용)
    production: 'https://n8n.seedfarm.co.kr/webhook',

    // 내부 서버 (로컬 네트워크용)
    internal: 'http://192.168.49.200:5679/webhook',

    // 현재 사용할 서버 (production 또는 internal)
    current: 'production'
};

// API 기본 URL 반환
function getApiBaseUrl() {
    return API_CONFIG[API_CONFIG.current];
}

// API 엔드포인트
const API_ENDPOINTS = {
    marketPrice: '/market-price',      // 시장 가격 (현재가)
    priceCompare: '/price-compare',    // 가격 비교 (도매 vs 온라인)
    priceHistory: '/price-history'     // 가격 추이
};

// 전체 API URL 생성
function getApiUrl(endpoint) {
    return getApiBaseUrl() + endpoint;
}
