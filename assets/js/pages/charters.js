function initializeChartersPage() {
    if (typeof initializeCharterView !== 'function' || typeof initializeForm !== 'function') {
        console.error("Не все зависимые модули (CharterView, Form) были загружены.");
        return;
    }
    
    const charterViewer = initializeCharterView();
    const formModule = initializeForm(document.getElementById('form-modal'));

    const gridContainer = document.querySelector('.character-grid');
    const searchInput = document.getElementById('character-search');
    const customSortSelect = document.getElementById('custom-sort-select');
    
    if (!gridContainer || !searchInput || !customSortSelect || !formModule || !charterViewer) {
        console.error("Не найдены основные элементы для инициализации страницы.");
        return;
    }

    function initializeCustomSelect(wrapperId, options, placeholder) {
        const wrapper = document.getElementById(wrapperId); if (!wrapper) return;
        const select = wrapper.querySelector('.custom-select'); const triggerSpan = select.querySelector('.custom-select__trigger span');
        triggerSpan.innerHTML = `<span class="placeholder">${placeholder}</span>`; const optionsContainer = select.querySelector('.custom-options');
        optionsContainer.innerHTML = ''; options.forEach(optionText => { const option = document.createElement('div'); option.className = 'custom-option'; option.dataset.value = optionText; option.textContent = optionText; optionsContainer.appendChild(option); });
        select.querySelector('.custom-select__trigger').addEventListener('click', () => select.classList.toggle('open'));
        optionsContainer.addEventListener('click', (e) => {
            const option = e.target.closest('.custom-option');
            if (option) {
                const prevSelected = optionsContainer.querySelector('.selected');
                if (prevSelected) prevSelected.classList.remove('selected');
                option.classList.add('selected');
                triggerSpan.textContent = option.textContent;
                triggerSpan.classList.remove('placeholder');
                select.dataset.value = option.dataset.value;
                select.classList.remove('open');
            }
        });
    }

    if (formModule) {
        const ageOptions = Array.from({ length: 100 }, (_, i) => i + 1);
        initializeCustomSelect('age-select-wrapper', ageOptions, 'Выберите возраст...');
    }
    
    const sortTrigger = customSortSelect.querySelector('.custom-sort-trigger span');
    const sortOptions = customSortSelect.querySelectorAll('.custom-sort-option');

    let allCharacters = [];
    let categorizedData = [];
    let currentSort = 'category';

    customSortSelect.querySelector('.custom-sort-trigger').addEventListener('click', () => { customSortSelect.classList.toggle('open'); });
    sortOptions.forEach(option => { option.addEventListener('click', () => { if (!customSortSelect.classList.contains('open')) return; sortOptions.forEach(opt => opt.classList.remove('selected')); option.classList.add('selected'); currentSort = option.dataset.value; sortTrigger.textContent = option.textContent; customSortSelect.classList.remove('open'); render(); }); });
    document.addEventListener('click', (e) => { if (!customSortSelect.contains(e.target)) { customSortSelect.classList.remove('open'); } });

    function createCharacterCardHTML(character) {
        let statusBarHTML = '', actionsHTML = '', statusClass = character.status;
        let imagePath;

        if (character.image && character.image.startsWith('/')) {
            imagePath = character.image;
        } else if (character.image) {
            imagePath = `/assets/images/${character.image}`;
        } else {
            imagePath = `/assets/images/empty.webp`;
        }
        
        switch (character.status) {
            case 'free':
                statusBarHTML = `<div class="status-bar ${statusClass}"><span class="material-symbols-outlined">radio_button_unchecked</span> Свободен</div>`;
                actionsHTML = `<div class="actions"><div class="icon-button icon-button-full"><span class="material-symbols-outlined">add</span> Вступить</div></div>`;
                break;
            
            case 'taken':
                statusBarHTML = `<div class="status-bar ${statusClass}"><span class="material-symbols-outlined">lock</span> Занят</div>`;
                
                let playerButtonHTML;
                if (character.player) {
                    const cleanLogin = character.player.replace('@', '');
                    playerButtonHTML = `<a href="https://t.me/${cleanLogin}" target="_blank" class="icon-button icon-button-right" aria-label="Связаться с игроком">
                                            <span class="material-symbols-outlined">send</span>
                                        </a>`;
                } else {
                    playerButtonHTML = `<div class="icon-button icon-button-right disabled"><span class="material-symbols-outlined">send</span></div>`;
                }

                actionsHTML = `<div class="actions">
                                   <div class="icon-button icon-button-left" data-folder="${character.folder || ''}">
                                       <span class="material-symbols-outlined">visibility</span>
                                   </div>
                                   ${playerButtonHTML}
                               </div>`;
                break;

            case 'reserved':
                statusBarHTML = `<div class="status-bar ${statusClass}"><span class="material-symbols-outlined">schedule</span> Бронь</div>`;
                actionsHTML = `<div class="actions"><div class="icon-button icon-button-full disabled"><span class="material-symbols-outlined">schedule</span> На брони</div></div>`;
                break;
        }
        return `<div class="character-card" data-name="${character.name}"><img src="${imagePath}" alt="${character.name}" class="avatar" loading="lazy"><div class="card-content"><div class="name">${character.name}</div>${actionsHTML}${statusBarHTML}</div></div>`;
    }

    function createCategoryTitleHTML(title) {
        return `<h2 class="character-category-title">${title}</h2>`;
    }
    
    function render() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        let filteredCharacters = searchTerm ? allCharacters.filter(char => char.name.toLowerCase().includes(searchTerm)) : [...allCharacters];
        if (currentSort === 'alphabet') { filteredCharacters.sort((a, b) => a.name.localeCompare(b.name, 'ru')); } 
        else if (currentSort === 'status') { const statusOrder = { 'free': 3, 'reserved': 2, 'taken': 1 }; filteredCharacters.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]); }
        let finalHTML = '';
        if (currentSort === 'category' && !searchTerm) {
            categorizedData.forEach(category => {
                const categoryCharacters = category.characters.filter(char => filteredCharacters.find(fc => fc.name === char.name));
                if (categoryCharacters.length > 0) {
                    finalHTML += createCategoryTitleHTML(category.title);
                    categoryCharacters.forEach(character => finalHTML += createCharacterCardHTML(character));
                }
            });
        } else {
            finalHTML = filteredCharacters.length > 0 ? filteredCharacters.map(createCharacterCardHTML).join('') : `<h2 class="character-category-title">Персонажи не найдены</h2>`;
        }
        gridContainer.style.opacity = '0';
        setTimeout(() => {
            gridContainer.innerHTML = finalHTML;
            gridContainer.style.opacity = '1';
            const cards = gridContainer.querySelectorAll('.character-card');
            cards.forEach((card, index) => {
                card.style.transition = `opacity 0.5s ease ${index * 0.05}s, transform 0.5s ease ${index * 0.05}s`;
                setTimeout(() => card.classList.add('visible'), 50);
            });
        }, 300);
    }
    
    async function loadCharactersData() {
        try {
            const response = await fetch(`/assets/data/characters.json?v=${Date.now()}`);
            if (!response.ok) throw new Error('Не удалось загрузить базу персонажей.');
            const data = await response.json();
            categorizedData = data.categories;
            allCharacters = categorizedData.flatMap(category => category.characters);
            render();
            searchInput.addEventListener('input', render);
        } catch (error) {
            console.error(error);
            gridContainer.innerHTML = `<h2 class="character-category-title error-message">${error.message}</h2>`;
        }
    }
    
    gridContainer.addEventListener('click', async (e) => {
        const joinButton = e.target.closest('.icon-button-full:not(.disabled)');
        const viewButton = e.target.closest('.icon-button-left');

        if (joinButton) {
            const card = joinButton.closest('.character-card');
            const characterName = card.dataset.name;
            formModule.openFormModal(characterName);
        }

        if (viewButton) {
            const folder = viewButton.dataset.folder;
            if (!folder) return;
            try {
                const response = await fetch(`/users/${folder}/anketa.json?v=${Date.now()}`);
                if (!response.ok) throw new Error('Анкета не найдена');
                const anketaData = await response.json();
                anketaData.folder = folder;
                charterViewer.show(anketaData);
            } catch (error) {
                console.error("Ошибка загрузки анкеты:", error);
                alert("Не удалось загрузить данные анкеты.");
            }
        }
    });

    document.addEventListener('anketaSuccess', () => {
        loadCharactersData();
    });
    
    loadCharactersData();
}