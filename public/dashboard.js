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

// 탭 4: 검색
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsHeader = document.getElementById('searchResultsHeader');
const searchQuery = document.getElementById('searchQuery');
const searchResultsList = document.getElementById('searchResultsList');

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

    // 탭 4: 검색
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
        retailCard.className = 'wholesale-card retail-card';
        retailCard.innerHTML = `
            <div class="card-title">소매가격</div>
            <div class="card-grade">${productInfo[currentProduct].name}</div>
            <div class="card-price">${formatPrice(retail.price)}</div>
            <div class="card-unit">1kg 기준 (전국평균)</div>
        `;
        wholesaleCards.appendChild(retailCard);
    }

    // 도매 가격 카드 (상품, 중품)
    const cards = [
        { grade: 'high', price: wholesale.high || 0 },
        { grade: 'mid', price: wholesale.mid || 0 }
    ];

    cards.forEach(card => {
        if (card.price === 0) return;

        const div = document.createElement('div');
        div.className = 'wholesale-card';
        div.innerHTML = `
            <div class="card-title">도매 ${gradeInfo[card.grade].label}</div>
            <div class="card-grade">${productInfo[currentProduct].name}</div>
            <div class="card-price">${formatPrice(card.price)}</div>
            <div class="card-unit">1kg 기준 ${isDummy ? '(참고가격)' : '(가락시장)'}</div>
        `;
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
        const diffPercent = row.wholesalePrice > 0
            ? Math.round((diff / row.wholesalePrice) * 100)
            : 0;

        const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
        const marginClass = diffPercent >= 50 ? 'margin-high'
            : diffPercent >= 30 ? 'margin-mid'
            : 'margin-low';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="grade-badge ${gradeInfo[row.grade].badge}">${gradeInfo[row.grade].label}</span></td>
            <td>${formatPrice(row.wholesalePrice)}</td>
            <td>${formatPrice(row.retailPrice)}</td>
            <td>${formatPrice(row.onlinePrice)}</td>
            <td class="price-diff ${diffClass}">${diff >= 0 ? '+' : ''}${formatPrice(diff)}</td>
            <td><span class="margin-rate ${marginClass}">${diffPercent >= 0 ? '+' : ''}${diffPercent}%</span></td>
        `;
        comparisonBody.appendChild(tr);
    });

    if (comparisonBody.children.length === 0) {
        comparisonBody.innerHTML = '<tr><td colspan="6" class="no-data">데이터가 없습니다.</td></tr>';
    }
}

function renderOnlineSummary(data) {
    onlineSummary.innerHTML = '';
    const online = data.online_summary || {};

    const items = [
        { label: '최저가', value: formatPrice(online.lowest_price || 0), sub: online.lowest_mall || '-' },
        { label: '중간가', value: formatPrice(online.median_price || 0), sub: '' },
        { label: '평균가', value: formatPrice(online.average_price || 0), sub: '' },
        { label: '조사 샘플', value: (online.mall_count || 0) + '개', sub: '' }
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

function renderOnlineList(data) {
    onlineList.innerHTML = '';
    const items = data.online_detail || [];
    const topItems = items.slice(0, 10);

    if (topItems.length === 0) {
        onlineList.innerHTML = '<div class="no-data">온라인 데이터가 없습니다.</div>';
        return;
    }

    topItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'online-item';
        div.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="item-info">
                <div class="item-title">${item.title}</div>
                <div class="item-mall">${item.mall}</div>
            </div>
            <div class="item-price">${formatPrice(item.price)}</div>
            <a href="${item.link}" target="_blank" class="item-link">구매</a>
        `;
        onlineList.appendChild(div);
    });
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

    const maxPrice = Math.max(...items.map(i => i.price || 0));

    let html = '<div class="bar-chart">';
    items.slice(-15).forEach(item => {
        const height = maxPrice > 0 ? Math.round((item.price / maxPrice) * 250) : 0;
        html += `
            <div class="bar-item">
                <div class="bar-value">${formatPrice(item.price)}</div>
                <div class="bar" style="height: ${height}px"></div>
                <div class="bar-label">${item.label}</div>
            </div>
        `;
    });
    html += '</div>';

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

    items.forEach((item, index) => {
        const prevPrice = index > 0 ? items[index - 1].price : item.price;
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
                    <span class="price-label">소매</span>
                    <span class="price-value">${formatPrice(item.retailPrice)}</span>
                </div>
                <div class="price-row wholesale">
                    <span class="price-label">도매</span>
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
// 탭 4: 상품 검색
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
