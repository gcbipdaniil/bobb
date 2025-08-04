function initializeCharterView() {
    const modal = document.getElementById('char-view-modal');
    if (!modal) return null;

    const backdropImage = modal.querySelector('#char-view-backdrop-image');
    const closeBtn = modal.querySelector('.modal-close-btn');
    const nameEl = modal.querySelector('#char-view-name');
    const ageEl = modal.querySelector('#char-view-age');
    const groupEl = modal.querySelector('#char-view-group');

    const sorolEl = modal.querySelector('#char-view-sorol');

    const fields = {
        character: modal.querySelector('#char-view-character'),
        before: modal.querySelector('#char-view-before'),
        after: modal.querySelector('#char-view-after'),
        weakness: modal.querySelector('#char-view-weakness'),
        extra: modal.querySelector('#char-view-extra'),
        appearance: modal.querySelector('#char-view-appearance')
    };

    const tabNav = modal.querySelector('.tab-nav');
    const slider = modal.querySelector('#char-view-slider');
    const pagination = modal.querySelector('#char-view-pagination');
    const prevBtn = modal.querySelector('.char-view-nav-btn.prev');
    const nextBtn = modal.querySelector('.char-view-nav-btn.next');

    let slides = [];
    let dots = [];
    let currentIndex = 0;

    function goToSlide(index) {
        if (!slides.length) return;
        slides[currentIndex]?.classList.remove('active');
        dots[currentIndex]?.classList.remove('active');
        currentIndex = (index + slides.length) % slides.length;
        slides[currentIndex]?.classList.add('active');
        dots[currentIndex]?.classList.add('active');
        const activeImage = slides[currentIndex]?.querySelector('img');
        if (activeImage) {
            backdropImage.style.backgroundImage = `url(${activeImage.src})`;
        }
    }

    prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

    tabNav.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.tab-btn');
        if (!targetBtn || targetBtn.classList.contains('active')) return;
        const targetPaneId = targetBtn.dataset.tab;
        tabNav.querySelector('.active')?.classList.remove('active');
        targetBtn.classList.add('active');
        modal.querySelector('.tab-pane.active')?.classList.remove('active');
        modal.querySelector(`#${targetPaneId}`)?.classList.add('active');
    });

    function adjustNameFontSize(element, text) {
        element.textContent = text;
        element.style.fontSize = '';
        const baseFontSize = 5;
        const parentWidth = element.parentElement.offsetWidth;
        if (element.offsetWidth > parentWidth) {
            const scaleFactor = parentWidth / element.offsetWidth;
            const newSize = Math.max(2, baseFontSize * scaleFactor);
            element.style.fontSize = `${newSize}rem`;
        }
    }

    const show = (data) => {
        const characterName = data.character_name || "Имя не указано";
        adjustNameFontSize(nameEl, characterName);
        ageEl.textContent = data.age || "—";
        groupEl.textContent = data.group || "Нет";

        if (sorolEl) {
            if (data.sorol) {
                if (typeof data.sorol === 'string') {
                    sorolEl.textContent = data.sorol;
                } else if (data.sorol.character_name) {
                    const sorolName = data.sorol.character_name;
                    const sorolLogin = data.sorol.telegram_login ? data.sorol.telegram_login.replace('@', '') : '';
                    if (sorolLogin) {
                        sorolEl.innerHTML = `<a href="https://t.me/${sorolLogin}" target="_blank">${sorolName} (@${sorolLogin})</a>`;
                    } else {
                        sorolEl.textContent = sorolName;
                    }
                }
            } else {
                sorolEl.textContent = "Отсутствует";
            }
        }

        const fieldMapping = {
            character: 'character',
            before: 'before_apocalypse',
            after: 'after_apocalypse',
            weakness: 'weaknesses_and_fears',
            extra: 'extra_info',
            appearance: 'appearance'
        };

        Object.keys(fields).forEach(key => {
            if (!fields[key]) return;
            const dataKey = fieldMapping[key];
            const value = data.fields[dataKey] ? data.fields[dataKey].trim() : '';
            if (value) {
                fields[key].textContent = value;
                fields[key].parentElement.style.display = '';
            } else {
                fields[key].textContent = 'Нет информации.';
            }
        });

        slider.innerHTML = '';
        pagination.innerHTML = '';
        slides = [];
        dots = [];

        const imageSources = (data.uploaded_arts || []).map(artFile => `/users/${data.folder}/${artFile}`);
        imageSources.forEach((imgSrc, index) => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            slide.innerHTML = `<img src="${imgSrc}" alt="${characterName} art ${index + 1}" loading="lazy">`;
            slider.appendChild(slide);
            slides.push(slide);
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.addEventListener('click', () => goToSlide(index));
            pagination.appendChild(dot);
            dots.push(dot);
        });

        currentIndex = 0;
        goToSlide(0);

        tabNav.querySelector('.active')?.classList.remove('active');
        tabNav.querySelector('[data-tab="tab-character"]')?.classList.add('active');
        modal.querySelector('.tab-pane.active')?.classList.remove('active');
        modal.querySelector('#tab-character')?.classList.add('active');

        modal.classList.add('modal-visible');
        document.body.classList.add('modal-open');
    };

    const hide = () => {
        modal.classList.remove('modal-visible');
        document.body.classList.remove('modal-open');
    };

    closeBtn.addEventListener('click', hide);
    modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });

    const instance = { show };
    window.charterViewer = instance;
    return instance;
}
