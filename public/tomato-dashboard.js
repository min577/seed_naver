// DOM 요소
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const dashboardDiv = document.getElementById('dashboard');
const refreshBtn = document.getElementById('refreshBtn');
const lastUpdateSpan = document.getElementById('lastUpdate');
const dashboardTitle = document.getElementById('dashboardTitle');
const productSelect = document.getElementById('productSelect');

// 검색 요소
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const searchQuery = document.getElementById('searchQuery');
const closeSearchBtn = document.getElementById('closeSearchBtn');

// 테이블 및 섹션
const comparisonBody = document.getElementById('comparisonBody');
const onlineSummary = document.getElementById('onlineSummary');
const onlineList = document.getElementById('onlineList');
const wholesaleCards = document.getElementById('wholesaleCards');

// 현재 선택된 품목
let currentProduct = 'tomato';

// 품목별 이모지 및 정보
const productEmoji = {
    tomato: '🍅',
    apple: '🍎',
    pear: '🍐',
    grape: '🍇',
    strawberry: '🍓',
    watermelon: '🍉',
    cucumber: '🥒',
    pepper: '🌶️',
    cabbage: '🥬',
    onion: '🧅',
    potato: '🥔',
    garlic: '🧄'
};

// 등급 정보
const gradeInfo = {
    high: { label: '상품', size: '상급 품질', badge: 'grade-high' },
    mid: { label: '중품', size: '중급 품질', badge: 'grade-mid' },
    low: { label: '하품', size: '하급 품질', badge: 'grade-low' },
    cherry: { label: '방울/주스용', size: '소형', badge: 'grade-juice' }
};

// 페이지 로드 시 데이터 가져오기
window.addEventListener('load', fetchData);
refreshBtn.addEventListener('click', fetchData);

// 품목 변경 이벤트
productSelect.addEventListener('change', (e) => {
    currentProduct = e.target.value;
    fetchData();
});

// 검색 기능
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});
closeSearchBtn.addEventListener('click', closeSearch);

async function fetchData() {
    showLoading();
    hideError();
    dashboardDiv.style.display = 'none';

    try {
        const response = await fetch(`/api/product-price-compare?product=${currentProduct}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || '데이터를 가져오는 데 실패했습니다.');
        }

        // 제목 업데이트
        const emoji = productEmoji[currentProduct] || '📦';
        dashboardTitle.textContent = `${emoji} ${data.productName} 가격 비교 대시보드`;

        renderDashboard(data);
        updateLastUpdateTime(data.date);

        // KAMIS API 에러가 있으면 경고 표시
        if (data.kamisError) {
            showError(data.kamisError + ' (참고용 예상 가격으로 표시됩니다)');
        }

        hideLoading();
        dashboardDiv.style.display = 'block';

    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function renderDashboard(data) {
    renderComparisonTable(data);
    renderOnlineSummary(data);
    renderOnlineList(data);
    renderWholesaleCards(data);
}

// 1. 비교 테이블 렌더링
function renderComparisonTable(data) {
    comparisonBody.innerHTML = '';

    const wholesale = data.wholesale_summary || {};
    const online = data.online_summary || {};

    const rows = [
        {
            grade: 'high',
            wholesalePrice: wholesale.high || 0,
            onlinePrice: online.lowest_price || 0
        },
        {
            grade: 'mid',
            wholesalePrice: wholesale.mid || 0,
            onlinePrice: online.lowest_price || 0
        }
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
            <td>${gradeInfo[row.grade].size}</td>
            <td class="price">${formatPrice(row.wholesalePrice)}</td>
            <td class="price">${formatPrice(row.onlinePrice)}</td>
            <td class="price-diff ${diffClass}">${diff >= 0 ? '+' : ''}${formatPrice(diff)}</td>
            <td><span class="margin-rate ${marginClass}">${diffPercent >= 0 ? '+' : ''}${diffPercent}%</span></td>
        `;
        comparisonBody.appendChild(tr);
    });

    if (comparisonBody.children.length === 0) {
        comparisonBody.innerHTML = '<tr><td colspan="6" class="no-data">데이터가 없습니다.</td></tr>';
    }
}

// 2. 온라인 요약 렌더링
function renderOnlineSummary(data) {
    onlineSummary.innerHTML = '';

    const online = data.online_summary || {};

    const summaryItems = [
        { label: '최저가', value: formatPrice(online.lowest_price || 0), sub: online.lowest_mall || '-' },
        { label: '중간가', value: formatPrice(online.median_price || 0), sub: '' },
        { label: '평균가', value: formatPrice(online.average_price || 0), sub: '' },
        { label: '조사 샘플', value: (online.mall_count || 0) + '개', sub: '' }
    ];

    summaryItems.forEach(item => {
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

// 3. 온라인 리스트 렌더링
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
            <div class="rank">#${index + 1}</div>
            <div class="item-title">${item.title}</div>
            <div class="item-price">${formatPrice(item.price)}</div>
            <div class="item-mall">🏪 ${item.mall}</div>
            <a href="${item.link}" target="_blank" class="item-link">구매하러 가기 →</a>
        `;
        onlineList.appendChild(div);
    });
}

// 4. 도매시장 카드 렌더링
function renderWholesaleCards(data) {
    wholesaleCards.innerHTML = '';

    const wholesale = data.wholesale_summary || {};
    const isDummy = wholesale.isDummy || false;

    const cards = [
        { grade: 'high', price: wholesale.high || 0 },
        { grade: 'mid', price: wholesale.mid || 0 }
    ];

    cards.forEach(card => {
        if (card.price === 0) return;

        const div = document.createElement('div');
        div.className = 'wholesale-card';
        div.innerHTML = `
            <div class="card-title">${gradeInfo[card.grade].label}</div>
            <div class="card-grade">${gradeInfo[card.grade].size}</div>
            <div class="card-price">${formatPrice(card.price)}</div>
            <div class="card-unit">1kg 기준 ${isDummy ? '(참고가격)' : '(가락시장)'}</div>
        `;
        wholesaleCards.appendChild(div);
    });

    if (wholesaleCards.children.length === 0) {
        wholesaleCards.innerHTML = '<div class="no-data">도매시장 데이터가 없습니다.</div>';
    }
}

// 유틸리티 함수
function formatPrice(price) {
    if (!price || price === 0) return '0원';
    return price.toLocaleString('ko-KR') + '원';
}

function updateLastUpdateTime(date) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR');
    lastUpdateSpan.textContent = `${dateStr} ${timeStr}`;
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
    }, 8000);
}

function hideError() {
    errorDiv.style.display = 'none';
}

// 일반 검색 기능
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
        hideLoading();

    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function renderSearchResults(data) {
    searchQuery.textContent = `"${data.query}"`;
    searchResultsList.innerHTML = '';

    const items = data.items || [];

    if (items.length === 0) {
        searchResultsList.innerHTML = '<div class="no-data">검색 결과가 없습니다.</div>';
    } else {
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `
                <img src="${item.image}" alt="${item.title}" class="search-item-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E이미지 없음%3C/text%3E%3C/svg%3E'">
                <div class="search-item-title">${item.title}</div>
                <div class="search-item-mall">🏪 ${item.mall}</div>
                <div class="search-item-price">${formatPrice(item.price)}</div>
                <a href="${item.link}" target="_blank" class="search-item-link">구매하러 가기 →</a>
            `;
            searchResultsList.appendChild(div);
        });
    }

    // 검색 결과 표시 및 대시보드 숨기기
    searchResults.style.display = 'block';
    dashboardDiv.style.display = 'none';
}

function closeSearch() {
    searchResults.style.display = 'none';
    dashboardDiv.style.display = 'block';
    searchInput.value = '';
}
