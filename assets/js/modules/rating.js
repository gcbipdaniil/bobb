function initializeRatingSystem() {
    const API_URL = '/api/get_activity_rating.php';

    // --- DOM Elements ---
    const ratingWidget = document.getElementById('rating-widget-container');
    if (!ratingWidget) return; // Exit if the main container isn't on the page

    const top3Container = document.getElementById('rating-top3-list');
    const fullListContainer = document.getElementById('rating-full-list');
    const showAllBtn = document.getElementById('rating-show-all-btn');
    const leaderboardModal = document.getElementById('rating-leaderboard-modal');
    const closeModalBtn = leaderboardModal?.querySelector('.modal-close-btn');
    const timePeriodSelector = leaderboardModal?.querySelector('.time-period-selector');
    const ratingTabs = leaderboardModal?.querySelector('.rating-tabs');

    // --- State ---
    let fullData = {};
    let currentPeriod = 'weekly';
    let currentRating = 'overall';

    // --- Data Fetching ---
    async function fetchData() {
        renderLoading();
        try {
            const response = await fetch(`${API_URL}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            fullData = await response.json();
            render();
        } catch (error) {
            console.error("CRITICAL ERROR during data fetching:", error);
            renderError('Не удалось загрузить рейтинг.');
        }
    }

    // --- Rendering ---
    function render() {
        if (!fullData || !fullData[currentPeriod] || !Array.isArray(fullData[currentPeriod])) {
            renderError('Нет данных для отображения рейтинга.');
            return;
        }

        const sortedData = [...fullData[currentPeriod]].sort((a, b) => b[currentRating] - a[currentRating]);

        renderTop3(sortedData);
        renderFullList(sortedData); // Render the full list so it's ready for the modal
    }

    function renderTop3(data) {
        if (!top3Container) return;
        const top3 = data.slice(0, 3);
        if (top3.length === 0) {
            top3Container.innerHTML = '<p style="text-align:center; padding: 20px 0;">Нет активных игроков на этой неделе.</p>';
            showAllBtn.style.display = 'none';
            return;
        }
        top3Container.innerHTML = top3.map((char, i) => createCharacterHtml(char, i, true)).join('');
        if (data.length > 3) showAllBtn.style.display = 'block';
    }

    function renderFullList(data) {
        if (!fullListContainer) return;
        if (data.length === 0) {
            fullListContainer.innerHTML = '<p>Нет данных.</p>';
            return;
        }
        fullListContainer.innerHTML = data.map((char, i) => createCharacterHtml(char, i, false)).join('');
    }

    function createCharacterHtml(character, index, isTop3) {
        const rankHtml = isTop3 ? `<span class="rating-rank-top3">#${index + 1}</span>` : `<span class="leaderboard-rank">#${index + 1}</span>`;
        const score = (currentRating === 'overall') ? character.overall.toFixed(1) : character[currentRating];
        const scoreLabel = (currentRating === 'overall') ? 'Индекс' : (currentRating === 'posts' ? 'Посты' : 'Флуд');

        return `
            <div class="character-entry" data-folder="${character.folder}">
                ${rankHtml}
                <img src="${character.image}" alt="${character.name}" class="image">
                <div class="info">
                    <div class="name">${character.name}</div>
                    <div class="score">${scoreLabel}: ${score}</div>
                </div>
            </div>
        `;
    }

    function renderError(message) {
        if (ratingWidget) {
            ratingWidget.innerHTML = `<p style="text-align: center; color: #ff8a8a;">${message}</p>`;
        }
    }

    function renderLoading() {
        if (top3Container) top3Container.innerHTML = '<p style="text-align: center;">Загрузка рейтинга...</p>';
    }

    // --- Event Handling ---
    async function handleCharacterClick(e) {
        const target = e.target.closest('[data-folder]');
        if (!target || !target.dataset.folder || !window.charterViewer) return;

        try {
            const res = await fetch(`/users/${target.dataset.folder}/anketa.json`);
            if (!res.ok) throw new Error('Anketa not found');
            const anketaData = await res.json();
            window.charterViewer.show({ ...anketaData, folder: target.dataset.folder });
        } catch (error) {
            console.error("Failed to load character anketa:", error);
            alert('Не удалось загрузить полную анкету персонажа.');
        }
    }

    function setupEventListeners() {
        if (showAllBtn) showAllBtn.onclick = () => leaderboardModal.classList.add('modal-visible');
        if (closeModalBtn) closeModalBtn.onclick = () => leaderboardModal.classList.remove('modal-visible');

        timePeriodSelector?.addEventListener('click', (e) => {
            const target = e.target.closest('.time-btn');
            if (!target || target.classList.contains('active')) return;
            timePeriodSelector.querySelector('.active').classList.remove('active');
            target.classList.add('active');
            currentPeriod = target.dataset.period;
            render();
        });

        ratingTabs?.addEventListener('click', (e) => {
            const target = e.target.closest('.tab-btn');
            if (!target || target.classList.contains('active')) return;
            ratingTabs.querySelector('.active').classList.remove('active');
            target.classList.add('active');
            currentRating = target.dataset.rating;
            render();
        });

        ratingWidget.addEventListener('click', handleCharacterClick);
    }

    // --- Initialization ---
    fetchData();
    setupEventListeners();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRatingSystem);
} else {
    initializeRatingSystem();
}
