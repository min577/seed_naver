// ============================================
// KAMIS 농산물 가격 정보 통합 대시보드
// ============================================

// DOM 요소
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');

// 탭 요소
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 탭 1: 가격 비교
const productSelect = document.getElementById('productSelect');
const refreshCompareBtn = document.getElementById('refreshCompareBtn');
const lastUpdateSpan = document.getElementById('lastUpdate');
const wholesaleCards = document.getElementById('wholesaleCards');
const comparisonBody = document.getElementById('comparisonBody');
const onlineSummary = document.getElementById('onlineSummary');
const onlineList = document.getElementById('onlineList');

// 탭 2: 가격 추이
const trendProductSelect = document.getElementById('trendProductSelect');
const periodSelect = document.getElementById('periodSelect');
const refreshTrendBtn = document.getElementById('refreshTrendBtn');
const priceChart = document.getElementById('priceChart');
const trendTableHead = document.getElementById('trendTableHead');
const trendTableBody = document.getElementById('trendTableBody');

// 탭 3: 지역별 가격
const regionProductSelect = document.getElementById('regionProductSelect');
const refreshRegionBtn = document.getElementById('refreshRegionBtn');
const regionCards = document.getElementById('regionCards');

// 탭 4: 물동량
const volumeViewSelect = document.getElementById('volumeViewSelect');
const volumeProductFilter = document.getElementById('volumeProductFilter');
const volumeProductSelect = document.getElementById('volumeProductSelect');
const refreshVolumeBtn = document.getElementById('refreshVolumeBtn');
const volumeSummary = document.getElementById('volumeSummary');
const volumeCards = document.getElementById('volumeCards');
const volumeChartSection = document.getElementById('volumeChartSection');
const volumeChart = document.getElementById('volumeChart');

// 탭 5: 검색
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsHeader = document.getElementById('searchResultsHeader');
const searchQuery = document.getElementById('searchQuery');
const searchResultsList = document.getElementById('searchResultsList');

// 모달
const priceChartModal = document.getElementById('priceChartModal');
const modalTitle = document.getElementById('modalTitle');
const modalChart = document.getElementById('modalChart');
const modalClose = document.getElementById('modalClose');

// 현재 상태
let currentProduct = 'tomato';

// 품목 정보
const productInfo = {
    tomato: { name: '토마토', emoji: '🍅' },
    apple: { name: '사과', emoji: '🍎' },
    pear: { name: '배', emoji: '🍐' },
    grape: { name: '포도', emoji: '🍇' },
    strawberry: { name: '딸기', emoji: '🍓' },
    watermelon: { name: '수박', emoji: '🍉' },
    cucumber: { name: '오이', emoji: '🥒' },
    pepper: { name: '고추', emoji: '🌶️' },
    cabbage: { name: '배추', emoji: '🥬' },
    onion: { name: '양파', emoji: '🧅' },
    potato: { name: '감자', emoji: '🥔' },
    garlic: { name: '마늘', emoji: '🧄' }
};

// 등급 정보
const gradeInfo = {
    high: { label: '상품', badge: 'grade-high' },
    mid: { label: '중품', badge: 'grade-mid' },
    low: { label: '하품', badge: 'grade-low' }
};

// ============================================
// 초기화
// ============================================
window.addEventListener('load', () => {
    initTabs();
    initEventListeners();
    fetchPriceCompare();
});

function initTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    // 탭 전환 시 데이터 로드
    if (tabId === 'price-compare') {
        // 이미 로드됨
    } else if (tabId === 'price-trend') {
        fetchPriceTrend();
    } else if (tabId === 'region-price') {
        fetchRegionPrice();
    } else if (tabId === 'volume') {
        fetchVolumeInfo();
    }
}

function initEventListeners() {
    // 탭 1: 가격 비교
    productSelect.addEventListener('change', (e) => {
        currentProduct = e.target.value;
        fetchPriceCompare();
    });
    refreshCompareBtn.addEventListener('click', fetchPriceCompare);

    // 탭 2: 가격 추이
    trendProductSelect.addEventListener('change', fetchPriceTrend);
    periodSelect.addEventListener('change', fetchPriceTrend);
    refreshTrendBtn.addEventListener('click', fetchPriceTrend);

    // 탭 3: 지역별 가격
    regionProductSelect.addEventListener('change', fetchRegionPrice);
    refreshRegionBtn.addEventListener('click', fetchRegionPrice);

    // 탭 4: 물동량
    volumeViewSelect.addEventListener('change', handleVolumeViewChange);
    volumeProductSelect.addEventListener('change', fetchVolumeInfo);
    refreshVolumeBtn.addEventListener('click', fetchVolumeInfo);

    // 탭 5: 검색
    searchBtn.addEventListener('click', handleSearch);
    document.getElementById('coupangBtn').addEventListener('click', openCoupangSearch);
    document.getElementById('coupangLinkBtn').addEventListener('click', openCoupangSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}

// ============================================
// 유틸리티 함수
// ============================================
function formatPrice(price) {
    if (!price || price === 0) return '-';
    return price.toLocaleString('ko-KR') + '원';
}

function showLoading() {
    loadingDiv.style.display = 'block';
}

function hideLoading() {
    loadingDiv.style.display = 'none';
}

function showError(message) {
    errorDiv.textContent = `❌ ${message}`;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function hideError() {
    errorDiv.style.display = 'none';
}

// ============================================
// 탭 1: 가격 비교
// ============================================
async function fetchPriceCompare() {
    showLoading();
    hideError();

    try {
        // Vercel API 호출 (KAMIS + 네이버 쇼핑)
        const response = await fetch(`/api/product-price-compare?product=${currentProduct}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '데이터를 가져오는 데 실패했습니다.');
        }

        renderWholesaleCards(data);
        renderComparisonTable(data);
        renderOnlineSummary(data);
        renderOnlineList(data);
        updateLastUpdate(data.date);

        if (data.kamisError) {
            showError(data.kamisError);
        }

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function renderWholesaleCards(data) {
    wholesaleCards.innerHTML = '';
    const wholesale = data.wholesale_summary || {};
    const retail = data.retail_summary || {};
    const isDummy = wholesale.isDummy || false;

    // 소매 가격 카드
    if (retail.price > 0) {
        const retailCard = document.createElement('div');
        retailCard.className = 'wholesale-card retail-card clickable';
        retailCard.dataset.priceType = 'retail';
        retailCard.innerHTML = `
            <div class="card-title">소매가격</div>
            <div class="card-grade">${productInfo[currentProduct].name}</div>
            <div class="card-price">${formatPrice(retail.price)}</div>
            <div class="card-unit">1kg 기준 (전국평균)</div>
            <div class="card-hint">클릭하여 추이 보기</div>
        `;
        retailCard.addEventListener('click', () => showPriceChartModal('retail', '소매가격'));
        wholesaleCards.appendChild(retailCard);
    }

    // 도매 가격 카드 (상품, 중품)
    const cards = [
        { grade: 'high', price: wholesale.high || 0, type: 'wholesale_high', label: '도매 상품' },
        { grade: 'mid', price: wholesale.mid || 0, type: 'wholesale_mid', label: '도매 중품' }
    ];

    cards.forEach(card => {
        if (card.price === 0) return;

        const div = document.createElement('div');
        div.className = 'wholesale-card clickable';
        div.dataset.priceType = card.type;
        div.innerHTML = `
            <div class="card-title">${card.label}</div>
            <div class="card-grade">${productInfo[currentProduct].name}</div>
            <div class="card-price">${formatPrice(card.price)}</div>
            <div class="card-unit">1kg 기준 ${isDummy ? '(참고가격)' : '(가락시장)'}</div>
            <div class="card-hint">클릭하여 추이 보기</div>
        `;
        div.addEventListener('click', () => showPriceChartModal(card.type, card.label));
        wholesaleCards.appendChild(div);
    });

    if (wholesaleCards.children.length === 0) {
        wholesaleCards.innerHTML = '<div class="no-data">가격 데이터가 없습니다.</div>';
    }
}

function renderComparisonTable(data) {
    comparisonBody.innerHTML = '';
    const wholesale = data.wholesale_summary || {};
    const retail = data.retail_summary || {};
    const online = data.online_summary || {};

    const rows = [
        { grade: 'high', wholesalePrice: wholesale.high || 0, retailPrice: retail.price || 0, onlinePrice: online.lowest_price || 0 },
        { grade: 'mid', wholesalePrice: wholesale.mid || 0, retailPrice: retail.price || 0, onlinePrice: online.lowest_price || 0 }
    ];

    rows.forEach(row => {
        if (row.wholesalePrice === 0 && row.onlinePrice === 0) return;

        const diff = row.onlinePrice - row.wholesalePrice;
        const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="grade-badge ${gradeInfo[row.grade].badge}">${gradeInfo[row.grade].label}</span></td>
            <td>${formatPrice(row.wholesalePrice)}</td>
            <td>${formatPrice(row.retailPrice)}</td>
            <td>${formatPrice(row.onlinePrice)}</td>
            <td class="price-diff ${diffClass}">${diff >= 0 ? '+' : ''}${formatPrice(diff)}</td>
        `;
        comparisonBody.appendChild(tr);
    });

    if (comparisonBody.children.length === 0) {
        comparisonBody.innerHTML = '<tr><td colspan="5" class="no-data">데이터가 없습니다.</td></tr>';
    }
}

function renderOnlineSummary(data) {
    onlineSummary.innerHTML = '';
    const online = data.online_summary || {};

    const items = [
        { label: '최저가', value: formatPrice(online.lowest_price || 0), sub: online.lowest_mall || '-' },
        { label: '중간가', value: formatPrice(online.median_price || 0), sub: '' },
        { label: '평균가', value: formatPrice(online.average_price || 0), sub: '' }
    ];

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="label">${item.label}</div>
            <div class="value">${item.value}</div>
            ${item.sub ? `<div class="sub">${item.sub}</div>` : ''}
        `;
        onlineSummary.appendChild(card);
    });
}

// 제목에서 단위 추출 (예: "1kg", "5kg", "10kg", "500g" 등)
function extractUnitFromTitle(title) {
    if (!title) return '';
    // kg 단위 추출 (예: 1kg, 5kg, 10kg) → 'kg'만 반환
    const kgMatch = title.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (kgMatch) return 'kg';
    // g 단위 추출 (예: 500g, 1000g) → 'g'만 반환
    const gMatch = title.match(/(\d+)\s*g(?![a-z])/i);
    if (gMatch) return 'g';
    // 개 단위 추출 (예: 10개, 20개) → '개'만 반환
    const countMatch = title.match(/(\d+)\s*개/);
    if (countMatch) return '개';
    // 포기 단위 추출 (예: 1포기, 2포기) → '포기'만 반환
    const pgiMatch = title.match(/(\d+)\s*포기/);
    if (pgiMatch) return '포기';
    // 통 단위 추출 (예: 1통) → '통'만 반환
    const tongMatch = title.match(/(\d+)\s*통/);
    if (tongMatch) return '통';
    return '';
}

function renderOnlineList(data) {
    onlineList.innerHTML = '';
    const items = data.online_detail || [];
    const topItems = items.slice(0, 10);

    if (topItems.length === 0) {
        onlineList.innerHTML = '<div class="no-data">온라인 데이터가 없습니다.</div>';
        return;
    }

    topItems.forEach((item, index) => {
        const unit = extractUnitFromTitle(item.title);
        const priceWithUnit = unit ? `${formatPrice(item.price)} / ${unit}` : formatPrice(item.price);

        const div = document.createElement('div');
        div.className = 'online-item';
        div.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="item-info">
                <div class="item-title">${item.title}</div>
                <div class="item-mall">${item.mall}</div>
            </div>
            <div class="item-price">${priceWithUnit}</div>
            <a href="${item.link}" target="_blank" class="item-link"><i data-lucide="external-link" class="link-icon"></i>바로가기</a>
        `;
        onlineList.appendChild(div);
    });

    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateLastUpdate(date) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR');
    lastUpdateSpan.textContent = `${dateStr} ${timeStr}`;
}

// ============================================
// 탭 2: 가격 추이
// ============================================
async function fetchPriceTrend() {
    showLoading();
    hideError();

    const product = trendProductSelect.value;
    const period = periodSelect.value;

    try {
        // Vercel API 호출
        const response = await fetch(`/api/price-trend?product=${product}&period=${period}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '가격 추이 데이터를 가져오는 데 실패했습니다.');
        }

        renderPriceChart(data);
        renderTrendTable(data);

    } catch (error) {
        showError(error.message);
        renderEmptyChart();
        renderEmptyTrendTable();
    } finally {
        hideLoading();
    }
}

function renderPriceChart(data) {
    const items = data.items || [];

    if (items.length === 0) {
        renderEmptyChart();
        return;
    }

    const displayItems = items.slice(-15);
    const maxPrice = Math.max(...displayItems.map(i => i.price || 0));
    const minPrice = Math.min(...displayItems.map(i => i.price || 0));
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;

    const chartWidth = 800;
    const chartHeight = 300;
    const marginTop = 30;
    const marginBottom = 60;
    const marginLeft = 60;
    const marginRight = 20;
    const graphWidth = chartWidth - marginLeft - marginRight;
    const graphHeight = chartHeight - marginTop - marginBottom;

    // 포인트 좌표 계산
    const points = displayItems.map((item, index) => {
        const x = marginLeft + (index / (displayItems.length - 1 || 1)) * graphWidth;
        const y = marginTop + graphHeight - ((item.price - minPrice + padding) / (priceRange + padding * 2)) * graphHeight;
        return { x, y, price: item.price, label: item.label };
    });

    // SVG 경로 생성
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // 영역 채우기 경로
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${marginTop + graphHeight} L ${points[0].x} ${marginTop + graphHeight} Z`;

    // Y축 눈금 (5개)
    const yTicks = [];
    for (let i = 0; i <= 4; i++) {
        const price = minPrice - padding + (priceRange + padding * 2) * (i / 4);
        const y = marginTop + graphHeight - (graphHeight * i / 4);
        yTicks.push({ y, price: Math.round(price) });
    }

    let html = `
        <div class="line-chart-container">
            <svg class="line-chart" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet">
                <!-- 그리드 라인 -->
                ${yTicks.map(tick => `
                    <line x1="${marginLeft}" y1="${tick.y}" x2="${chartWidth - marginRight}" y2="${tick.y}" class="grid-line" />
                `).join('')}

                <!-- Y축 레이블 -->
                ${yTicks.map(tick => `
                    <text x="${marginLeft - 10}" y="${tick.y + 4}" class="y-label">${formatPrice(tick.price)}</text>
                `).join('')}

                <!-- 영역 채우기 -->
                <path d="${areaPath}" class="chart-area" />

                <!-- 선 그래프 -->
                <path d="${linePath}" class="chart-line" />

                <!-- 데이터 포인트 및 툴팁 -->
                ${points.map(p => `
                    <g class="chart-point-group">
                        <circle cx="${p.x}" cy="${p.y}" r="5" class="chart-point" />
                        <g class="chart-tooltip" transform="translate(${p.x}, ${p.y - 15})">
                            <rect x="-40" y="-22" width="80" height="24" rx="4" class="tooltip-bg" />
                            <text x="0" y="-6" class="tooltip-text">${formatPrice(p.price)}</text>
                        </g>
                    </g>
                `).join('')}

                <!-- X축 레이블 -->
                ${points.map(p => `
                    <text x="${p.x}" y="${chartHeight - 35}" class="x-label">${p.label}</text>
                `).join('')}

                <!-- 출처 -->
                <text x="${chartWidth - marginRight}" y="${chartHeight - 5}" class="chart-source">출처: KAMIS (가락시장 도매가격)</text>
            </svg>
        </div>
    `;

    priceChart.innerHTML = html;
}

function renderEmptyChart() {
    priceChart.innerHTML = `
        <div class="chart-placeholder">
            <p>📊 가격 추이 데이터가 없습니다.</p>
            <p>품목과 기간을 선택하고 조회 버튼을 클릭하세요.</p>
        </div>
    `;
}

function renderTrendTable(data) {
    const items = data.items || [];
    const period = periodSelect.value;

    let dateLabel = '날짜';
    if (period === 'monthly') dateLabel = '월';
    else if (period === 'yearly') dateLabel = '연도';

    trendTableHead.innerHTML = `
        <tr>
            <th>${dateLabel}</th>
            <th>도매가격</th>
            <th>전기 대비</th>
        </tr>
    `;

    trendTableBody.innerHTML = '';

    if (items.length === 0) {
        trendTableBody.innerHTML = '<tr><td colspan="3" class="no-data">데이터가 없습니다.</td></tr>';
        return;
    }

    // 최근 일자가 먼저 보이도록 역순 정렬
    const reversedItems = [...items].reverse();

    reversedItems.forEach((item, index) => {
        // 역순이므로 다음 인덱스가 이전 날짜 (전기)
        const prevPrice = index < reversedItems.length - 1 ? reversedItems[index + 1].price : item.price;
        const change = item.price - prevPrice;
        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : '';
        const changeText = change === 0 ? '-' : `${change > 0 ? '+' : ''}${formatPrice(change)}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.label}</td>
            <td>${formatPrice(item.price)}</td>
            <td class="price-diff ${changeClass}">${changeText}</td>
        `;
        trendTableBody.appendChild(tr);
    });
}

function renderEmptyTrendTable() {
    trendTableHead.innerHTML = `
        <tr>
            <th>날짜</th>
            <th>도매가격</th>
            <th>전기 대비</th>
        </tr>
    `;
    trendTableBody.innerHTML = '<tr><td colspan="3" class="no-data">데이터가 없습니다.</td></tr>';
}

// ============================================
// 탭 3: 지역별 가격
// ============================================
async function fetchRegionPrice() {
    showLoading();
    hideError();

    const product = regionProductSelect.value;

    try {
        const response = await fetch(`/api/region-price?product=${product}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '지역별 가격 데이터를 가져오는 데 실패했습니다.');
        }

        renderRegionCards(data);

    } catch (error) {
        showError(error.message);
        renderEmptyRegionCards();
    } finally {
        hideLoading();
    }
}

function renderRegionCards(data) {
    regionCards.innerHTML = '';
    const items = data.items || [];

    if (items.length === 0) {
        regionCards.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
        return;
    }

    // 모든 지역 데이터를 카드로 표시
    items.forEach((item, index) => {
        const retailChange = item.retailChange || 0;
        const changeClass = retailChange > 0 ? 'up' : retailChange < 0 ? 'down' : 'same';
        const changeText = retailChange === 0 ? '변동없음' : `${retailChange > 0 ? '▲' : '▼'} ${formatPrice(Math.abs(retailChange))}`;
        const isHighest = index === 0;
        const isLowest = index === items.length - 1;

        const card = document.createElement('div');
        card.className = 'region-card' + (isHighest ? ' highest' : '') + (isLowest ? ' lowest' : '');
        card.innerHTML = `
            ${isHighest ? '<div class="region-badge highest-badge">최고가</div>' : ''}
            ${isLowest ? '<div class="region-badge lowest-badge">최저가</div>' : ''}
            <div class="region-name">${item.region}</div>
            <div class="region-prices">
                <div class="price-row">
                    <span class="price-label">소매 <span class="price-source">(대형마트)</span></span>
                    <span class="price-value">${formatPrice(item.retailPrice)}</span>
                </div>
                <div class="price-row wholesale">
                    <span class="price-label">도매 <span class="price-source">(가락시장)</span></span>
                    <span class="price-value">${formatPrice(item.wholesalePrice)}</span>
                </div>
            </div>
            <div class="region-change ${changeClass}">${changeText}</div>
        `;
        regionCards.appendChild(card);
    });
}

function renderEmptyRegionCards() {
    regionCards.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
}

// ============================================
// 탭 4: 물동량
// ============================================

// 뷰 타입 변경 시 품목 필터 표시/숨김
function handleVolumeViewChange() {
    const viewType = volumeViewSelect.value;
    // 품목별 뷰일 때만 품목 필터 표시
    if (viewType === 'product') {
        volumeProductFilter.style.display = 'flex';
    } else {
        volumeProductFilter.style.display = 'none';
    }
    fetchVolumeInfo();
}

async function fetchVolumeInfo() {
    showLoading();
    hideError();

    const viewType = volumeViewSelect.value;
    const productFilter = volumeProductSelect.value;

    try {
        let url = `/api/volume-info?view=${viewType}`;
        // 품목별 뷰에서 품목 필터가 있으면 추가
        if (viewType === 'product' && productFilter) {
            url += `&product=${encodeURIComponent(productFilter)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '물동량 데이터를 가져오는 데 실패했습니다.');
        }

        renderVolumeSummary(data);

        if (viewType === 'trend') {
            volumeChartSection.style.display = 'block';
            renderVolumeChart(data);
            renderVolumeTrendCards(data);
        } else {
            volumeChartSection.style.display = 'none';
            if (viewType === 'market') {
                renderVolumeMarketCards(data);
            } else {
                renderVolumeProductCards(data);
            }
        }

    } catch (error) {
        showError(error.message);
        renderEmptyVolumeCards();
    } finally {
        hideLoading();
    }
}

function formatVolume(volume) {
    if (!volume || volume === 0) return '-';
    if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + '천톤';
    } else if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + '톤';
    }
    return volume.toLocaleString('ko-KR') + 'kg';
}

function renderVolumeSummary(data) {
    volumeSummary.innerHTML = '';
    const summary = data.summary || {};
    const viewType = data.viewType;
    const isApiData = !data.isDummy;

    let items = [];
    if (viewType === 'market') {
        if (isApiData && summary.categories !== undefined) {
            // 실제 API 데이터: 카테고리별 요약
            items = [
                { label: '카테고리', value: summary.categories || 0, unit: '개' },
                { label: '총 물동량', value: formatVolume(summary.totalVolume || 0), unit: '' },
                { label: '데이터 출처', value: '가락시장', unit: '' }
            ];
        } else {
            // 더미 데이터: 시장별 요약
            items = [
                { label: '전체 시장', value: summary.totalMarkets || 0, unit: '개' },
                { label: '총 물동량', value: formatVolume(summary.totalVolume || 0), unit: '' },
                { label: '최대 물동량', value: summary.topMarket || '-', unit: '' }
            ];
        }
    } else if (viewType === 'product') {
        if (isApiData) {
            items = [
                { label: '전체 품목', value: summary.totalProducts || 0, unit: '개' },
                { label: '총 물동량', value: formatVolume(summary.totalVolume || 0), unit: '' },
                { label: '데이터 출처', value: '가락시장', unit: '' }
            ];
        } else {
            items = [
                { label: '전체 품목', value: summary.totalProducts || 0, unit: '개' },
                { label: '총 물동량', value: formatVolume(summary.totalVolume || 0), unit: '' },
                { label: '최다 거래', value: summary.topProduct || '-', unit: '' }
            ];
        }
    } else {
        items = [
            { label: '일평균', value: formatVolume(summary.averageDaily || 0), unit: '' },
            { label: '최대', value: formatVolume(summary.maxVolume || 0), unit: '' },
            { label: '최소', value: formatVolume(summary.minVolume || 0), unit: '' },
            { label: '데이터', value: summary.dataPoints || 0, unit: '일' }
        ];
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `
            <div class="label">${item.label}</div>
            <div class="value">${item.value}${item.unit}</div>
        `;
        volumeSummary.appendChild(card);
    });

    if (data.isDummy) {
        const notice = document.createElement('div');
        notice.className = 'dummy-notice';
        notice.textContent = '참고: 현재 샘플 데이터로 표시됩니다.';
        volumeSummary.appendChild(notice);
    }
}

function renderVolumeMarketCards(data) {
    volumeCards.innerHTML = '';
    const items = data.items || [];

    if (items.length === 0) {
        volumeCards.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
        return;
    }

    // API 데이터인지 더미 데이터인지 확인 (카테고리 데이터 vs 시장 데이터)
    const isApiCategoryData = items[0] && items[0].category && !items[0].market;

    if (isApiCategoryData) {
        // 실제 API 데이터: 카테고리별 물동량 (가락시장)
        items.forEach((item, index) => {
            const isTop = index < 3;
            const categoryEmoji = getCategoryEmoji(item.categoryKey || item.category);

            const card = document.createElement('div');
            card.className = 'volume-card category-card' + (isTop ? ' top-category' : '');
            card.innerHTML = `
                <div class="volume-rank">${index + 1}</div>
                <div class="volume-info">
                    <div class="volume-name">${categoryEmoji} ${item.category}</div>
                    <div class="volume-region">가락시장</div>
                </div>
                <div class="volume-data">
                    <div class="volume-amount">${formatVolume(item.volume)}</div>
                </div>
                <div class="volume-corporations">
                    ${renderCorporations(item.corporations)}
                </div>
            `;
            volumeCards.appendChild(card);
        });
    } else {
        // 더미 데이터: 시장별 물동량
        items.forEach((item, index) => {
            const changeClass = item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'same';
            const changeText = item.change === 0 ? '변동없음' : `${item.change > 0 ? '▲' : '▼'} ${Math.abs(item.change).toFixed(1)}%`;
            const isTop = index < 3;

            const card = document.createElement('div');
            card.className = 'volume-card' + (isTop ? ' top-market' : '');
            card.innerHTML = `
                <div class="volume-rank">${index + 1}</div>
                <div class="volume-info">
                    <div class="volume-name">${item.market}</div>
                    <div class="volume-region">${item.region}</div>
                </div>
                <div class="volume-data">
                    <div class="volume-amount">${formatVolume(item.totalVolume)}</div>
                    <div class="volume-change ${changeClass}">${changeText}</div>
                </div>
                <div class="volume-categories">
                    <span class="cat-item veg">채소 ${formatVolume(item.categories?.vegetables || 0)}</span>
                    <span class="cat-item fruit">과일 ${formatVolume(item.categories?.fruits || 0)}</span>
                </div>
            `;
            volumeCards.appendChild(card);
        });
    }
}

// 카테고리별 이모지 반환
function getCategoryEmoji(categoryKey) {
    const emojis = {
        fruits: '🍎',
        fruitVegetables: '🍅',
        vegetables: '🥬',
        total: '📦'
    };
    return emojis[categoryKey] || '📦';
}

// 도매법인별 물동량 렌더링
function renderCorporations(corporations) {
    if (!corporations) return '';

    const corpNames = {
        seoul: '서울청과',
        nonghyup: '농협',
        jungang: '중앙청과',
        donghwa: '동화청과',
        hankook: '한국청과',
        daea: '대아청과'
    };

    const sortedCorps = Object.entries(corporations)
        .filter(([key, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (sortedCorps.length === 0) return '';

    return sortedCorps.map(([key, value]) =>
        `<span class="corp-item">${corpNames[key] || key}: ${formatVolume(value)}</span>`
    ).join('');
}

// 산지별 물동량 렌더링
function renderOrigins(origins) {
    if (!origins || origins.length === 0) return '';

    return origins.map(origin =>
        `<span class="origin-item">${origin.name}: ${formatVolume(origin.volume)}</span>`
    ).join('');
}

function renderVolumeProductCards(data) {
    volumeCards.innerHTML = '';
    const items = data.items || [];

    if (items.length === 0) {
        volumeCards.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
        return;
    }

    const hasOriginData = items[0] && items[0].origins;
    const hasCorporationData = items[0] && items[0].corporations;

    items.forEach((item, index) => {
        const isTop = index < 3;

        const card = document.createElement('div');
        card.className = 'volume-card product-card' + (isTop ? ' top-product' : '');

        if (hasOriginData) {
            // 공공데이터 API 데이터: 산지 정보 표시
            card.innerHTML = `
                <div class="volume-rank">${index + 1}</div>
                <div class="volume-info">
                    <div class="volume-name">${item.product}</div>
                    <div class="volume-category-badge">${item.category}</div>
                </div>
                <div class="volume-data">
                    <div class="volume-amount">${formatVolume(item.volume)}</div>
                </div>
                <div class="volume-origins">
                    ${renderOrigins(item.origins)}
                </div>
            `;
        } else if (hasCorporationData) {
            // 서울시 API 데이터: 도매법인 정보 표시
            card.innerHTML = `
                <div class="volume-rank">${index + 1}</div>
                <div class="volume-info">
                    <div class="volume-name">${item.product}</div>
                    <div class="volume-category-badge">${item.category}</div>
                </div>
                <div class="volume-data">
                    <div class="volume-amount">${formatVolume(item.volume)}</div>
                </div>
                <div class="volume-corporations">
                    ${renderCorporations(item.corporations)}
                </div>
            `;
        } else {
            // 더미 데이터: 변동률 표시
            const changeClass = item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'same';
            const changeText = item.change === 0 ? '변동없음' : `${item.change > 0 ? '▲' : '▼'} ${Math.abs(item.change).toFixed(1)}%`;

            card.innerHTML = `
                <div class="volume-rank">${index + 1}</div>
                <div class="volume-info">
                    <div class="volume-name">${item.product}</div>
                    <div class="volume-category-badge">${item.category}</div>
                </div>
                <div class="volume-data">
                    <div class="volume-amount">${formatVolume(item.volume)}</div>
                    <div class="volume-change ${changeClass}">${changeText}</div>
                </div>
            `;
        }

        volumeCards.appendChild(card);
    });
}

function renderVolumeTrendCards(data) {
    volumeCards.innerHTML = '';
    const items = data.items || [];

    if (items.length === 0) {
        volumeCards.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
        return;
    }

    // 최근 7일만 카드로 표시
    const recentItems = items.slice(-7).reverse();

    recentItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'volume-card trend-card';
        card.innerHTML = `
            <div class="trend-date">
                <div class="date-main">${item.date}</div>
                <div class="date-day">${item.dayOfWeek}요일</div>
            </div>
            <div class="trend-volume">
                <div class="total-volume">${formatVolume(item.totalVolume)}</div>
            </div>
            <div class="trend-breakdown">
                <span class="cat-item veg">채소 ${formatVolume(item.vegetables)}</span>
                <span class="cat-item fruit">과일 ${formatVolume(item.fruits)}</span>
            </div>
        `;
        volumeCards.appendChild(card);
    });
}

function renderVolumeChart(data) {
    const items = data.items || [];

    if (items.length === 0) {
        volumeChart.innerHTML = '<div class="chart-placeholder"><p>📊 물동량 추이 데이터가 없습니다.</p></div>';
        return;
    }

    const maxVolume = Math.max(...items.map(i => i.totalVolume || 0));

    let html = '<div class="bar-chart volume-bar-chart">';
    items.forEach(item => {
        const height = maxVolume > 0 ? Math.round((item.totalVolume / maxVolume) * 200) : 0;
        html += `
            <div class="bar-item">
                <div class="bar-value">${formatVolume(item.totalVolume)}</div>
                <div class="bar volume-bar" style="height: ${height}px"></div>
                <div class="bar-label">${item.date.slice(5)} (${item.dayOfWeek})</div>
            </div>
        `;
    });
    html += '</div>';

    volumeChart.innerHTML = html;
}

function renderEmptyVolumeCards() {
    volumeSummary.innerHTML = '';
    volumeCards.innerHTML = '<div class="no-data">데이터가 없습니다.</div>';
    volumeChartSection.style.display = 'none';
}

// ============================================
// 탭 5: 상품 검색
// ============================================

// 쿠팡 검색 페이지 열기 (최저가순 정렬)
function openCoupangSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        showError('검색어를 입력해주세요.');
        return;
    }
    // sorter=salePriceAsc: 낮은 가격순 정렬
    const coupangUrl = `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(query)}&sorter=salePriceAsc`;
    window.open(coupangUrl, '_blank');
}

async function handleSearch() {
    const query = searchInput.value.trim();

    if (!query) {
        showError('검색어를 입력해주세요.');
        return;
    }

    showLoading();
    hideError();

    try {
        const response = await fetch(`/api/general-search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '검색 중 오류가 발생했습니다.');
        }

        renderSearchResults(data);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function renderSearchResults(data) {
    searchQuery.textContent = `"${data.query}"`;
    searchResultsHeader.style.display = 'block';
    searchResultsList.innerHTML = '';

    const items = data.items || [];

    if (items.length === 0) {
        searchResultsList.innerHTML = '<div class="no-data">검색 결과가 없습니다.</div>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="search-item-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E이미지 없음%3C/text%3E%3C/svg%3E'">
            <div class="search-item-title">${item.title}</div>
            <div class="search-item-mall">🏪 ${item.mall}</div>
            <div class="search-item-price">${formatPrice(item.price)}</div>
            <a href="${item.link}" target="_blank" class="search-item-link">구매하기 →</a>
        `;
        searchResultsList.appendChild(div);
    });
}

// ============================================
// 모달: 가격 추이 그래프
// ============================================
async function showPriceChartModal(priceType, label) {
    modalTitle.textContent = `${productInfo[currentProduct].name} ${label} 추이 (최근 30일)`;
    modalChart.innerHTML = '<div class="loading-small"><div class="spinner"></div><p>데이터 로딩 중...</p></div>';
    priceChartModal.style.display = 'flex';

    try {
        const response = await fetch(`/api/price-trend?product=${currentProduct}&period=daily&priceType=${priceType}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '가격 추이 데이터를 가져오는 데 실패했습니다.');
        }

        renderModalChart(data, priceType, label);
    } catch (error) {
        modalChart.innerHTML = `<div class="chart-placeholder"><p>❌ ${error.message}</p></div>`;
    }
}

function renderModalChart(data, priceType, label) {
    const items = data.items || [];

    if (items.length === 0) {
        modalChart.innerHTML = '<div class="chart-placeholder"><p>📊 가격 추이 데이터가 없습니다.</p></div>';
        return;
    }

    const displayItems = items.slice(-30);
    const maxPrice = Math.max(...displayItems.map(i => i.price || 0));
    const minPrice = Math.min(...displayItems.map(i => i.price || 0));
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;

    const chartWidth = 750;
    const chartHeight = 300;
    const marginTop = 30;
    const marginBottom = 70;
    const marginLeft = 60;
    const marginRight = 20;
    const graphWidth = chartWidth - marginLeft - marginRight;
    const graphHeight = chartHeight - marginTop - marginBottom;

    const points = displayItems.map((item, index) => {
        const x = marginLeft + (index / (displayItems.length - 1 || 1)) * graphWidth;
        const y = marginTop + graphHeight - ((item.price - minPrice + padding) / (priceRange + padding * 2)) * graphHeight;
        return { x, y, price: item.price, label: item.label };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${marginTop + graphHeight} L ${points[0].x} ${marginTop + graphHeight} Z`;

    const yTicks = [];
    for (let i = 0; i <= 4; i++) {
        const price = minPrice - padding + (priceRange + padding * 2) * (i / 4);
        const y = marginTop + graphHeight - (graphHeight * i / 4);
        yTicks.push({ y, price: Math.round(price) });
    }

    // 선 색상 및 출처 결정
    const lineColor = priceType === 'retail' ? '#10b981' : '#2563eb';
    const areaColor = priceType === 'retail' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)';
    const sourceText = priceType === 'retail' ? '출처: KAMIS (대형마트)' : '출처: KAMIS (가락시장)';

    const html = `
        <div class="line-chart-container modal-line-chart">
            <svg class="line-chart" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet">
                ${yTicks.map(tick => `
                    <line x1="${marginLeft}" y1="${tick.y}" x2="${chartWidth - marginRight}" y2="${tick.y}" class="grid-line" />
                `).join('')}

                ${yTicks.map(tick => `
                    <text x="${marginLeft - 10}" y="${tick.y + 4}" class="y-label">${formatPrice(tick.price)}</text>
                `).join('')}

                <path d="${areaPath}" fill="${areaColor}" />
                <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

                ${points.map(p => `
                    <g class="chart-point-group">
                        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="${lineColor}" stroke-width="2" />
                        <g class="chart-tooltip" transform="translate(${p.x}, ${p.y - 15})">
                            <rect x="-40" y="-22" width="80" height="24" rx="4" class="tooltip-bg" />
                            <text x="0" y="-6" class="tooltip-text">${formatPrice(p.price)}</text>
                        </g>
                    </g>
                `).join('')}

                ${points.filter((_, i) => i % 5 === 0 || i === points.length - 1).map(p => `
                    <text x="${p.x}" y="${chartHeight - 45}" class="x-label">${p.label}</text>
                `).join('')}

                <text x="${chartWidth - marginRight}" y="${chartHeight - 10}" class="chart-source">${sourceText}</text>
            </svg>
        </div>
    `;

    modalChart.innerHTML = html;
}

function closeModal() {
    priceChartModal.style.display = 'none';
}

// 모달 닫기 이벤트
modalClose.addEventListener('click', closeModal);
priceChartModal.addEventListener('click', (e) => {
    if (e.target === priceChartModal) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
