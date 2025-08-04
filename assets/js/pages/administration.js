function initializeAdministrationPage() {
    const adminGrid = document.querySelector('.admin-grid');
    if (!adminGrid) return;

    fetch('/assets/data/administrators.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(admins => {
            renderAdminCards(admins);
        })
        .catch(error => {
            console.error('Could not fetch administrators data:', error);
            adminGrid.innerHTML = '<p style="text-align: center; color: var(--text-color);">Не удалось загрузить список администрации.</p>';
        });

    function renderAdminCards(admins) {
        adminGrid.innerHTML = ''; // Clear existing content
        admins.forEach(admin => {
            const card = document.createElement('div');
            card.className = 'admin-card';

            const photoSrc = admin.photo || 'assets/images/tg_avatar_placeholder.png';
            const username = admin.username || '';
            const tgLink = username ? `https://t.me/${username.replace('@', '')}` : '#';

            card.innerHTML = `
                <div class="admin-card-bg" style="background-image: url('${photoSrc}')"></div>
                <div class="admin-card-content">
                    <div class="admin-photo-wrapper">
                        <img src="${photoSrc}" alt="Фото ${admin.role}" class="admin-photo">
                    </div>
                    <div class="admin-info">
                        <h3 class="admin-role" data-text="${admin.role}">${admin.role}</h3>
                        <p class="admin-username" data-text="${username}">${username}</p>
                    </div>
                    ${username ? `<a href="${tgLink}" class="btn admin-contact-btn" target="_blank" rel="noopener noreferrer">Связаться</a>` : ''}
                </div>
            `;
            adminGrid.appendChild(card);
        });
    }
}

// Ensure the script runs after the DOM is fully loaded, especially since it's deferred.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdministrationPage);
} else {
    initializeAdministrationPage();
}
