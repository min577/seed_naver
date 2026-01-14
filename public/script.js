const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');

// Enter 키로 검색
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        search();
    }
});

// 검색 버튼 클릭
searchBtn.addEventListener('click', search);

async function search() {
    const query = searchInput.value.trim();

    if (!query) {
        showError('검색어를 입력해주세요.');
        return;
    }

    // UI 초기화
    resultsDiv.innerHTML = '';
    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        loadingDiv.style.display = 'none';

        if (!response.ok) {
            throw new Error(data.error || '검색 중 오류가 발생했습니다.');
        }

        if (data.items.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
            return;
        }

        displayResults(data.items);

    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    }
}

function displayResults(items) {
    resultsDiv.innerHTML = '';

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'product-card';

        const formattedPrice = item.lprice.toLocaleString('ko-KR');
        const brandInfo = item.brand || item.maker || '';

        card.innerHTML = `
            ${index === 0 ? '<div class="best-price">최저가</div>' : ''}
            <img src="${item.image}" alt="${item.title}" class="product-image" onerror="this.src='https://via.placeholder.com/280x250?text=No+Image'">
            <div class="product-info">
                <div class="product-title">${item.title}</div>
                <div class="product-price">${formattedPrice}원</div>
                <div class="product-mall">🏪 ${item.mallName}</div>
                ${brandInfo ? `<div class="product-brand">브랜드: ${brandInfo}</div>` : ''}
                <a href="${item.link}" target="_blank" class="product-link">
                    구매하러 가기 →
                </a>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'A') {
                window.open(item.link, '_blank');
            }
        });

        resultsDiv.appendChild(card);
    });
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// 페이지 로드 시 포커스
window.addEventListener('load', () => {
    searchInput.focus();
});
