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

            const photoSrc = admin.photo || 'assets/images/empty.webp';
            const username = admin.username || 'N/A';

            card.innerHTML = `
                <div class="admin-photo-wrapper">
                    <img src="${photoSrc}" alt="${admin.role}" class="admin-photo">
                </div>
                <h3 class="admin-role">${admin.role}</h3>
                <p class="admin-username">${username}</p>
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
