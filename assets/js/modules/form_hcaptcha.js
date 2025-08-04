function initializeForm(formModal) {
    if (typeof initializeCustomAlerts !== 'function' || typeof checkSpelling !== 'function') {
        console.error("Не все зависимые модули (Alerts, Spellchecker) были загружены. Функционал формы будет ограничен.");
        return;
    }
    const customAlert = initializeCustomAlerts();

    const body = document.body;
    const mainContent = document.getElementById('main-content');
    const applicationView = formModal.querySelector('#form-view-application');
    const groupsView = formModal.querySelector('#form-view-groups');
    const groupSelectorTrigger = formModal.querySelector('#group-selector-trigger');
    const backToFormBtn = formModal.querySelector('.back-to-form');
    const closeModalBtn = applicationView.querySelector('.modal-close-btn');
    const applicationForm = formModal.querySelector('#character-application-form');
    const nameDisplayField = formModal.querySelector('#char-name-display');
    const nameHiddenInput = formModal.querySelector('#char-name-hidden');
    const fieldsToValidate = formModal.querySelectorAll('[data-validate]');
    const countableTextareas = formModal.querySelectorAll('.countable-textarea');
    const requiredFieldsForProgress = formModal.querySelectorAll('[data-validate="required"], [data-validate="select"], [data-validate="telegram"]');
    const progressBarFill = formModal.querySelector('.progress-bar__fill');
    const progressBarPercentage = formModal.querySelector('.progress-bar__percentage');
    const submitButton = formModal.querySelector('#submit-application');
    const submitWrapper = formModal.querySelector('#submit-wrapper');
    const summaryContainer = formModal.querySelector('#form-summary-errors');
    const fileInput = formModal.querySelector('#char-art-upload');
    const previewContainer = formModal.querySelector('#art-preview-container');
    const addBtn = formModal.querySelector('.art-add-btn');
    const groupHiddenInput = formModal.querySelector('#char-group-hidden-input');

    const tgConfirmModal = document.getElementById('tg-confirm-modal');
    const tgConfirmUsername = document.getElementById('tg-confirm-username');
    const tgConfirmYesBtn = document.getElementById('tg-confirm-yes');
    const tgConfirmNoBtn = document.getElementById('tg-confirm-no');

    const toastNotification = document.getElementById('toast-notification');

    const festiveSuccessModal = document.getElementById('festive-success-modal');
    const festiveParticlesContainer = document.getElementById('festive-particles-container');
    const festiveSuccessTitle = document.getElementById('festive-success-title');
    const festiveSuccessMessage = document.getElementById('festive-success-message');
    const festiveSuccessCloseBtn = document.getElementById('festive-success-close');


    const requiredCharCount = 1500;
    const MAX_FILES = 4;
    let uploadedFiles = [];
    let groupsSliderInstance = null;
    let groupsData = [];
    let breakReminderTimeout = null;

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function showToast(message) {
        toastNotification.textContent = message;
        toastNotification.classList.add('show');
        setTimeout(() => {
            toastNotification.classList.remove('show');
        }, 3000);
    }

    function showFestiveSuccess(title, message) {
        return new Promise(resolve => {
            festiveSuccessTitle.textContent = title;
            festiveSuccessMessage.textContent = message;

            festiveParticlesContainer.innerHTML = '';
            for (let i = 0; i < 25; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';

                const startX = `${Math.random() * 100 - 50}vw`;
                const startY = `${Math.random() * 100 - 50}vh`;
                const endX = `${Math.random() * 200 - 100}px`;
                const endY = `${Math.random() * 200 - 100}px`;
                const rotation = `${Math.random() * 720 - 360}deg`;

                particle.style.setProperty('--start-x', startX);
                particle.style.setProperty('--start-y', startY);
                particle.style.setProperty('--end-x', endX);
                particle.style.setProperty('--end-y', endY);
                particle.style.setProperty('--rot', rotation);

                particle.style.animationDelay = `${Math.random() * 0.5}s`;
                festiveParticlesContainer.appendChild(particle);
            }

            festiveSuccessModal.classList.add('modal-visible');

            festiveSuccessCloseBtn.onclick = () => {
                festiveSuccessModal.classList.remove('modal-visible');
                resolve();
            };
        });
    }

    function getStorageKey(characterName) {
        return `application_data_${characterName.replace(/\s/g, '_')}`;
    }

    const ageSelect = formModal.querySelector('#age-select-wrapper .custom-select');
    const charCharacter = formModal.querySelector('#char-character');
    const charBefore = formModal.querySelector('#char-before');
    const charWeakness = formModal.querySelector('#char-weakness');
    const charAfter = formModal.querySelector('#char-after');
    const charExtra = formModal.querySelector('#char-extra');
    const charAppearance = formModal.querySelector('#char-appearance');
    const charTgLogin = formModal.querySelector('#char-tg-login');

    function saveFormData() {
        const characterName = nameHiddenInput.value;
        if (!characterName) return;
        const data = {
            age: ageSelect.dataset.value || '',
            character: charCharacter.value,
            before: charBefore.value,
            group: groupHiddenInput.value,
            weakness: charWeakness.value,
            after: charAfter.value,
            extra: charExtra.value,
            appearance: charAppearance.value,
            tgLogin: charTgLogin.value,
        };
        localStorage.setItem(getStorageKey(characterName), JSON.stringify(data));
    }

    function loadFormData() {
        const characterName = nameHiddenInput.value;
        if (!characterName) return;
        const savedData = localStorage.getItem(getStorageKey(characterName));
        if (!savedData) return;
        try {
            const data = JSON.parse(savedData);
            formModal.querySelector('#char-character').value = data.character || '';
            formModal.querySelector('#char-before').value = data.before || '';
            groupHiddenInput.value = data.group || '';
            formModal.querySelector('#char-weakness').value = data.weakness || '';
            formModal.querySelector('#char-after').value = data.after || '';
            formModal.querySelector('#char-extra').value = data.extra || '';
            formModal.querySelector('#char-appearance').value = data.appearance || '';
            formModal.querySelector('#char-tg-login').value = data.tgLogin || '';

            const ageSelectWrapper = formModal.querySelector('#age-select-wrapper');
            if (data.age) {
                const ageSelect = ageSelectWrapper.querySelector('.custom-select');
                const triggerSpan = ageSelect.querySelector('.custom-select__trigger span');
                triggerSpan.textContent = data.age;
                triggerSpan.classList.remove('placeholder');
                ageSelect.dataset.value = data.age;
            }
            if (data.group) {
                groupSelectorTrigger.textContent = data.group;
                groupSelectorTrigger.classList.add('has-value');
            }
            fieldsToValidate.forEach(field => validateField(field));
        } catch (e) {
            console.error("Ошибка парсинга сохраненных данных:", e);
        }
    }

    const fullscreenOverlay = document.getElementById('textarea-fullscreen-overlay');
    const fullscreenTextarea = document.getElementById('fullscreen-textarea');
    const fullscreenCloseBtn = document.getElementById('fullscreen-textarea-close');
    let originalTextarea = null;
    if (fullscreenOverlay && fullscreenTextarea && fullscreenCloseBtn) {
        applicationForm.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.fullscreen-toggle-btn');
            if (toggleBtn) {
                e.preventDefault();
                originalTextarea = toggleBtn.closest('.form-group').querySelector('textarea');
                if (originalTextarea) {
                    fullscreenTextarea.value = originalTextarea.value;
                    fullscreenOverlay.classList.add('visible');
                    fullscreenTextarea.focus();
                }
            }
        });
        fullscreenTextarea.addEventListener('input', () => {
            if (originalTextarea) {
                originalTextarea.value = fullscreenTextarea.value;
                originalTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        fullscreenCloseBtn.addEventListener('click', () => {
            fullscreenOverlay.classList.remove('visible');
            originalTextarea = null;
        });
    }

    const openFormModal = (characterName) => {
        applicationForm.reset();
        uploadedFiles = [];
        renderPreviews();
        formModal.querySelectorAll('.validation-icon').forEach(icon => {
            icon.className = 'validation-icon';
            icon.textContent = '';
        });
        formModal.querySelectorAll('.has-value').forEach(el => el.classList.remove('has-value'));
        const ageSelect = formModal.querySelector('#age-select-wrapper .custom-select');
        if (ageSelect) {
            ageSelect.querySelector('.custom-select__trigger span').innerHTML = '<span class="placeholder">Выберите возраст...</span>';
            delete ageSelect.dataset.value;
        }
        groupSelectorTrigger.textContent = 'Выберите группировку...';

        nameDisplayField.textContent = characterName;
        nameHiddenInput.value = characterName;
        loadFormData();

        switchView('application', true);
        formModal.classList.add('modal-visible');
        body.classList.add('modal-open');
        updateFormProgress();

        if (breakReminderTimeout) clearTimeout(breakReminderTimeout);
        breakReminderTimeout = setTimeout(() => {
            if (formModal.classList.contains('modal-visible')) {
                customAlert.alert(
                    'Вы усердно работаете! Не забывайте, что весь ваш прогресс сохраняется автоматически. Можете сделать перерыв и вернуться позже.',
                    'Перерыв?'
                );
            }
        }, 10 * 60 * 1000);
    };

    const closeFormModal = () => {
        if (breakReminderTimeout) {
            clearTimeout(breakReminderTimeout);
            breakReminderTimeout = null;
        }
        formModal.classList.remove('modal-visible');
        body.classList.remove('modal-open');
    };

    mainContent.addEventListener('click', (e) => {
        const joinButton = e.target.closest('.icon-button-full');
        if (joinButton && joinButton.textContent.includes('Вступить')) {
            e.preventDefault();
            const card = joinButton.closest('.character-card');
            if (card) {
                const characterName = card.querySelector('.name').textContent;
                openFormModal(characterName);
            }
        }
    });

    closeModalBtn.addEventListener('click', closeFormModal);
    formModal.addEventListener('click', (e) => { if (e.target === formModal) closeFormModal(); });

    const debouncedUpdate = debounce(() => {
        updateFormProgress();
        saveFormData();
    }, 300);

    applicationForm.addEventListener('input', debouncedUpdate);
    applicationForm.addEventListener('change', debouncedUpdate);

    function switchView(to, isInstant = false) {
        if (to === 'groups') {
            applicationView.classList.remove('active');
            groupsView.classList.add('active');
        } else {
            groupsView.classList.remove('active');
            applicationView.classList.add('active');
        }
    }
    groupSelectorTrigger.addEventListener('click', () => { if (!groupsSliderInstance) initGroupsSlider(); switchView('groups'); });
    backToFormBtn.addEventListener('click', () => switchView('application'));

    function handleGroupSelection(groupName) {
        groupSelectorTrigger.textContent = groupName;
        groupSelectorTrigger.classList.add('has-value');
        groupHiddenInput.value = groupName;
        validateField(groupSelectorTrigger);
        updateFormProgress();
        switchView('application');
    }

    formModal.querySelector('#select-this-group').addEventListener('click', () => {
        if (groupsSliderInstance) {
            const activeGroup = groupsData[groupsSliderInstance.currentIndex];
            handleGroupSelection(activeGroup.name);
        }
    });
    formModal.querySelector('#select-no-group').addEventListener('click', () => handleGroupSelection("Нет"));

    function initGroupsSlider() {
        groupsData = [
			{ name: 'Барбатос', type: 'Группы выживания', imageId: 'barbatos', description: `Группа, состоящая лишь из верующих. Они поклоняются лишь им известному божеству и верят, что бог их спасёт из этого ужаса. Глава группы и его советники свободно управляют людьми, так как убедил их в том, что сам бог передаёт через великого главу самую что ни на есть истину Всевышнего. Под влиянием главы люди способны даже убивать других людей, но до подобного либо ещё не доходило, либо это остаëтся в секрете.` },
			{ name: 'Небесная лира', type: 'Группы выживания', imageId: 'heavenly-lyre', description: `Несколько десятков семей, располагающихся в соседствующих городах. Оказывают поддержку друг-другу, помощь, при отсутствии еды и медикаментов, по возможности. Связь поддерживают с помощью раций. Стараются избегать встречь с неизвестными и подозрительными людьми, прячутся от оги, так как не в силах дать им отпор.` },
			{ name: 'Спрингвейл', type: 'Группы выживания', imageId: 'springvale', description: `Группа состоит из людей от 20 до 30 лет. Чаще всего они вместе охотятся на дичь, пополняя запасы. Эти запасы они обменивают у других групп на необходимые предметы. Очень щедрые, всегда помогают нуждающимся. С оги справляются группой, хорошая командная работа. После смерти Оги полностью сжигают его тело. Так же в "Спрингвейле" есть пара хороших медиков.` },
			{ name: 'Древо мудрости', type: 'Группы выживания', imageId: 'tree-of-wisdom', description: `Люди из этой группы принимают тех, кто мог бы помочь им в изучении Оги. В их главном штабе проводят эксперименты над зомби. Отличительных черт нет, так как работают они в штабе, ловят зомби и не убивают их. Здесь сплотились учёные и обычные люди, готовые их защищать.` },
			{ name: 'Фатуи', type: 'Группы хаоса', imageId: 'fatui', description: `Имеют главу, которую зовут Царицей. Отряды этой группы разбросаны по всему миру, и неизвестно, где же их можно встретить. Никому не известны цели, желания и позиции группировки, однако о самом названии слышали почти все. Одно оно вызывает панический страх. После встречи с людьми из "Фатуи", почти никогда не остаются выжившие. Участники этой группировки имеют соответствующие тату на спине.` },
			{ name: 'Вечность', type: 'Группы хаоса', imageId: 'eternity', description: `Затворники. Они верят, что истинный мир неизменен, и всё, что этому перечит, не правильно. Человечество не правильно. По их мнению, если появились зомби, то теперь, по закону природы, люди—их еда. Живут в бункере. Его точное местоположение неизвестно. Наружу выходят лишь на поиски еды, а тех, кто пойдёт, выбирает глава. Глава словно гипнотизирует участников этой группы, и с помощью слов меняет их мировоззрение. Свои жизни такие люди уже не жалеют, и не видят в них особой ценности. Людей, не согласных с их позицией, они убивают, либо скармливают Оги. А таких много...` },
			{ name: 'Золото и честь', type: 'Группы хаоса', imageId: 'gold-and-honor', description: `Организация состоящая из бывших бизнесменов, богатых людей, которых нанимали военных для своей защиты. Они богаты, как денежными средствами, так и провизией. Не прочь побаловаться игрой, охотясь на выживших. Нанимают людей из других групп, чтобы те делали за них грязную работу. Если "охрана" умирает, превращается в зомби, то верхушка просто нанимает других.` },
			{ name: 'Эпиклез', type: 'Группы хаоса', imageId: 'epiclese', description: `Попасть в эту группу крайне сложно, но и желает не каждый. Богатенькие люди, которые ради забавы устраивают "охоты" на людей, вместе с "Золото и честь". С этой группировкой они находятся в очень тесных отношениях. Отличительный знак: отрубленная человеческая голова с собственными глазами во рту.` },
			{ name: 'Смерть оги', type: 'Охотники на зараженных', imageId: 'death-of-ogi', description: `Группировка, направленная на полное уничтожение этих существ. Точное количество людей, состоящих в ней, неизвестно. Многие приводят знакомых. Они хотят отомстить за своих погибших близких. Живут раздельно, но назначают встречи для выполнения их общей цели. Особенность: после убийства голову зомби сжигают, оставляя лишь тело.` },
			{ name: 'Воскресший адепт', type: 'Охотники на зараженных', imageId: 'resurrected-adept', description: `Группа людей, находящаяся в самом центре Города Ли Юэ. Им удалось расчистить небольшой район от Оги, и они ещё расширяют чистую территорию. Принимают всех желающих. У группы главы нет, все люди на равне. Есть небольшой исследовательский центр, направленный на поиск лекарства от вируса.` },
			{ name: 'Сквозь все миры', type: 'Охотники на зараженных', imageId: 'through-all-worlds', description: `Самая крупная из всех группировок. Царит полная иерархия. Самые низшие по мнению группы, люди, которые присоединились недавно. Глава меняется с помощью поединка: если действующая глава убил претендента, то он не меняется. Если же действующую главу убили, то победивший становится главным. Грабежи других групп, убийства, захваты групп им присущи.` },
			{ name: 'Созвездие волн', type: 'Охотники на зараженных', imageId: 'wave-constellation', description: `Группа (подгруппа) подчиняется "Сквозь все миры". Старший смотритель за группой, назначен главным в основной группе. Все приказы проходят через старшего, тот в свою очередь распределяет их меж группой. Отличительный знак { Рисунок созвездия волн}` }
		];
        const sliderContainer = formModal.querySelector('#form-groups-slider');
        groupsSliderInstance = createCustomSlider(sliderContainer, groupsData);
    }

    function createCustomSlider(container, data) {
        const track = container.querySelector('.slider-track');
        const pagination = container.querySelector('.slider-pagination');
        const prevBtn = container.querySelector('.prev');
        const nextBtn = container.querySelector('.next');
        let currentIndex = 0, isAnimating = false, slides = [], dots = [];
        function init() {
            track.innerHTML = '';
            pagination.innerHTML = '';
            data.forEach((group, index) => {
                const imagePath = `assets/images/groups/${group.imageId}.webp`;
                const slide = document.createElement('div');
                slide.className = 'slide';
                slide.innerHTML = `<div class="slide-card"><div class="slide-image-wrapper"><img src="${imagePath}" alt="${group.name}" class="slide-image" crossorigin="anonymous"></div><div class="slide-content"><span class="group-type">${group.type}</span><h2 class="slide-title">${group.name}</h2><div class="slide-description"><p>${group.description.replace(/\n/g, '<br>')}</p></div></div></div>`;
                track.appendChild(slide);
                const dot = document.createElement('div');
                dot.className = 'pagination-dot';
                dot.dataset.index = index;
                pagination.appendChild(dot);
            });
            slides = track.querySelectorAll('.slide');
            dots = pagination.querySelectorAll('.pagination-dot');
            addEventListeners();
            goToSlide(0, true);
        }
        function goToSlide(newIndex, isInstant = false) {
            if ((isAnimating && !isInstant) || (newIndex === currentIndex && !isInstant)) return;
            isAnimating = true;
            const currentSlide = slides[currentIndex];
            const newSlide = slides[newIndex];
            if (isInstant) {
                if(currentSlide) currentSlide.classList.remove('active');
                newSlide.classList.add('no-transition', 'active');
                requestAnimationFrame(() => newSlide.classList.remove('no-transition'));
            } else {
                if (currentSlide) currentSlide.classList.add('exiting');
                newSlide.classList.add('active');
            }
            if (dots.length > 0) {
                if (dots[currentIndex]) dots[currentIndex].classList.remove('active');
                if (dots[newIndex]) dots[newIndex].classList.add('active');
            }
            if (window.ColorThief) updateTheme(newSlide.querySelector('.slide-image'));
            currentIndex = newIndex;
            setTimeout(() => {
                if (currentSlide && !isInstant) currentSlide.classList.remove('active', 'exiting');
                isAnimating = false;
            }, 600);
        }
        function addEventListeners() {
            nextBtn.addEventListener('click', () => goToSlide((currentIndex + 1) % slides.length));
            prevBtn.addEventListener('click', () => goToSlide((currentIndex - 1 + slides.length) % slides.length));
            pagination.addEventListener('click', (e) => {
                const dot = e.target.closest('.pagination-dot');
                if (dot) goToSlide(parseInt(dot.dataset.index));
            });
            let touchStartX = 0;
            const swipeThreshold = 50;
            track.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
            track.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].screenX;
                if (touchEndX < touchStartX - swipeThreshold) nextBtn.click();
                if (touchEndX > touchStartX + swipeThreshold) prevBtn.click();
            }, { passive: true });
        }
        init();
        return { get currentIndex() { return currentIndex; } };
    }

    function updateTheme(imageElement) {
        if (!window.ColorThief) return;
        const colorThief = new ColorThief();
        if (!imageElement || (!imageElement.complete && imageElement.naturalWidth === 0)) {
            imageElement.addEventListener('load', () => updateTheme(imageElement), { once: true });
            return;
        }
        try {
            const dominantColor = colorThief.getColor(imageElement);
            const palette = colorThief.getPalette(imageElement, 5);
            const cardBgColor = `rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.25)`;
            const accentColorRgb = palette[1] || dominantColor;
            const accentColor = `rgb(${accentColorRgb[0]}, ${accentColorRgb[1]}, ${accentColorRgb[2]})`;
            const accentColorRgbString = `${accentColorRgb[0]}, ${accentColorRgb[1]}, ${accentColorRgb[2]}`;
            const root = formModal.querySelector('#form-view-groups');
            root.style.setProperty('--theme-card-bg', cardBgColor);
            root.style.setProperty('--theme-accent', accentColor);
            root.style.setProperty('--theme-accent-rgb', accentColorRgbString);
        } catch (e) {
            console.error('Ошибка при извлечении цвета:', e);
        }
    }

    document.addEventListener('click', (e) => { document.querySelectorAll('.custom-select.open').forEach(select => { if (!select.contains(e.target)) select.classList.remove('open'); }); });

    function isFieldValid(field) {
        const type = field.dataset.validate;
        if (!type) return true;

        let targetField = field;
        if (field.matches('.pseudo-input')) {
            targetField = groupHiddenInput;
        } else if (field.matches('.custom-select-wrapper')) {
            targetField = field.querySelector('.custom-select');
        }

        if (type === 'optional') {
            return true;
        }

        switch (type) {
            case 'select':
                return !!targetField.dataset.value;
            case 'required':
                return targetField.type === 'file' ? uploadedFiles.length > 0 : targetField.value.trim().length > 0;
            case 'telegram':
                return targetField.value.trim().length > 0;
            default:
                return true;
        }
    }

    function updateFormProgress() {
        let completedRequiredFields = 0;
        requiredFieldsForProgress.forEach(field => {
            if (isFieldValid(field)) {
                completedRequiredFields++;
            }
        });

        const totalProgress = requiredFieldsForProgress.length > 0 ? (completedRequiredFields / requiredFieldsForProgress.length) : 0;
        const totalProgressPercentage = Math.floor(totalProgress * 100);

        progressBarFill.style.width = `${totalProgressPercentage}%`;
        progressBarPercentage.textContent = `${totalProgressPercentage}%`;

        submitButton.disabled = totalProgressPercentage < 100;
    }

    function showErrorMessage(field, message) { const group = field.closest('.form-group'); const err = group.querySelector('.error-message'); if (err) { err.textContent = message; err.classList.add('visible'); } }
    function hideErrorMessage(field) { const group = field.closest('.form-group'); const err = group.querySelector('.error-message'); if (err) { err.classList.remove('visible'); } }

    function validateField(field) {
        const group = field.closest('.form-group'); if (!group) return;
        const icon = group.querySelector('.validation-icon');
        const type = field.dataset.validate;
        const helperText = group.querySelector('.helper-text');

        if (type === 'telegram' && helperText) {
            const hasAtSymbol = field.value.trim().startsWith('@');
            helperText.classList.toggle('visible', !hasAtSymbol);
        }

        let isFilled;
        if (field.matches('.custom-select-wrapper')) {
            isFilled = !!field.querySelector('.custom-select').dataset.value;
        } else if (field.matches('.pseudo-input')) {
            isFilled = groupHiddenInput.value.trim().length > 0;
        } else if (field.type === 'file') {
            isFilled = uploadedFiles.length > 0;
        } else {
            isFilled = field.value.trim().length > 0;
        }

        if (type === 'optional') {
            icon.className = isFilled ? 'validation-icon valid' : 'validation-icon';
            icon.textContent = isFilled ? '✓' : '';
            hideErrorMessage(field);
            return;
        }

        const isValid = isFieldValid(field);
        if (isValid) {
            icon.className = 'validation-icon valid';
            icon.textContent = '✓';
            hideErrorMessage(field);
        } else {
            icon.className = 'validation-icon invalid';
            icon.textContent = '✗';
            let msg = 'Это поле обязательно для заполнения.';
            if (type === 'select') {
                msg = 'Пожалуйста, выберите значение.';
            }
            showErrorMessage(field, msg);
        }
    }

    const debouncedValidateField = debounce(validateField, 300);
    fieldsToValidate.forEach(field => {
        const isCustomSelect = field.matches('.custom-select-wrapper');
        const isTextField = field.tagName === 'TEXTAREA' || field.type === 'text';

        if (isTextField) {
            field.addEventListener('input', () => debouncedValidateField(field));
        } else {
            field.addEventListener('change', () => validateField(field));
        }

        if (!isCustomSelect) {
            field.addEventListener('blur', () => validateField(field));
        }
    });

    async function renderPreviews() {
        previewContainer.innerHTML = ''; // Clear existing previews

        const filePromises = uploadedFiles.map((file, index) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const slot = document.createElement('div');
                    slot.className = 'art-preview-slot';
                    slot.innerHTML = `<img src="${e.target.result}" alt="Предпросмотр"><button type="button" class="art-delete-btn" data-index="${index}">×</button>`;
                    resolve(slot);
                };
                reader.readAsDataURL(file);
            });
        });

        const slots = await Promise.all(filePromises);
        slots.forEach(slot => {
            previewContainer.appendChild(slot);
            setTimeout(() => slot.classList.add('visible'), 10);
        });

        previewContainer.appendChild(addBtn);
        addBtn.classList.toggle('hidden', uploadedFiles.length >= MAX_FILES);
        validateField(fileInput);
    }

    async function handleNewFiles(files) {
        if (uploadedFiles.length + files.length > MAX_FILES) {
            await customAlert.alert(`Можно загрузить не более ${MAX_FILES} изображений.`);
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Обработка фото...';

        try {
            const processingPromises = files.map(file => processImage(file, {
                maxWidth: 1280,
                quality: 0.8
            }));
            const processedFiles = await Promise.all(processingPromises);
            uploadedFiles.push(...processedFiles);
            const dataTransfer = new DataTransfer();
            uploadedFiles.forEach(file => dataTransfer.items.add(file));
            fileInput.files = dataTransfer.files;
            await renderPreviews();
            saveFormData();
        } catch (error) {
            console.error("Ошибка при обработке изображений:", error);
            await customAlert.alert("Не удалось обработать одно или несколько изображений. Попробуйте другие файлы.");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Отправить анкету';
        }
    }

    fileInput.addEventListener('change', () => {
        handleNewFiles(Array.from(fileInput.files));
    });

    applicationForm.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                imageFiles.push(file);
            }
        }
        if (imageFiles.length > 0) {
            e.preventDefault();
            handleNewFiles(imageFiles);
            showToast('Изображение вставлено из буфера обмена!');
        }
    });

    previewContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('art-delete-btn')) {
            const indexToRemove = parseInt(e.target.dataset.index, 10);
            if (!isNaN(indexToRemove)) {
                uploadedFiles.splice(indexToRemove, 1);
                const dataTransfer = new DataTransfer();
                uploadedFiles.forEach(file => dataTransfer.items.add(file));
                fileInput.files = dataTransfer.files;
                renderPreviews();
                saveFormData();
            }
        }
    });

    let hCaptchaToken = null;
    let hCaptchaWidgetId = null;

    window.onCaptchaSuccess = (token) => {
        hCaptchaToken = token;
        const captchaOverlay = document.getElementById('captcha-modal-overlay');
        const statusText = document.getElementById('captcha-status-text');
        if (statusText) statusText.textContent = "Проверка пройдена!";

        setTimeout(() => {
            captchaOverlay.classList.remove('visible');
            executeSubmission();
        }, 800);
    };

    window.onCaptchaError = () => {
        const captchaOverlay = document.getElementById('captcha-modal-overlay');
        const statusText = document.getElementById('captcha-status-text');
        if (statusText) statusText.textContent = "Ошибка проверки. Пожалуйста, попробуйте еще раз.";
        setTimeout(() => captchaOverlay.classList.remove('visible'), 1500);
    };

    function requestHCaptcha() {
        const captchaOverlay = document.getElementById('captcha-modal-overlay');
        if (!captchaOverlay) return;
        const widgetContainer = document.getElementById('captcha-widget-container');
        if (hCaptchaWidgetId !== null && window.hcaptcha) {
            window.hcaptcha.reset(hCaptchaWidgetId);
        } else if (window.hcaptcha) {
            hCaptchaWidgetId = window.hcaptcha.render(widgetContainer);
        }
        captchaOverlay.classList.add('visible');
    }

    function confirmTelegramUI(username) {
        return new Promise(resolve => {
            tgConfirmUsername.textContent = username;
            tgConfirmModal.classList.add('modal-visible');

            const yesHandler = () => {
                tgConfirmModal.classList.remove('modal-visible');
                cleanup();
                resolve(true);
            };

            const noHandler = () => {
                tgConfirmModal.classList.remove('modal-visible');
                const tgLoginInput = formModal.querySelector('#char-tg-login');
                tgLoginInput.focus();
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                tgConfirmYesBtn.removeEventListener('click', yesHandler);
                tgConfirmNoBtn.removeEventListener('click', noHandler);
            };

            tgConfirmYesBtn.addEventListener('click', yesHandler, { once: true });
            tgConfirmNoBtn.addEventListener('click', noHandler, { once: true });
        });
    }

    function startInfusionAnimation() {
        const elementColors = {
            anemo: '#74C3A4',
            geo: '#F8B538',
            electro: '#A45DE8',
            dendro: '#80C233',
            hydro: '#4CC2F1',
            pyro: '#F16632',
            cryo: '#74D3E5'
        };
        const elements = Object.keys(elementColors);
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        const color = elementColors[randomElement];

        const orb = document.createElement('div');
        orb.className = 'infusion-orb';
        orb.style.setProperty('--element-color', color);

        submitWrapper.appendChild(orb);
        submitWrapper.classList.add('is-loading');
    }

    function stopInfusionAnimation() {
        submitWrapper.classList.remove('is-loading');
        const orb = submitWrapper.querySelector('.infusion-orb');
        if (orb) {
            orb.remove();
        }
    }

    function scrollToFirstError() {
        const firstError = applicationForm.querySelector('.error-message.visible, .helper-text.visible');
        if (firstError) {
            firstError.closest('.form-group').scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    async function executeSubmission() {
        const tokenToSubmit = hCaptchaToken;
        hCaptchaToken = null;

        try {
            const tgLoginInput = formModal.querySelector('#char-tg-login');
            const isTgConfirmed = await confirmTelegramUI(tgLoginInput.value);

            if (!isTgConfirmed) {
                return;
            }

            startInfusionAnimation();
            let spellcheckStatus = 'checked';

            const textToCheck = Array.from(countableTextareas).map(t => t.value).join('\n');
            const spellcheckResult = await checkSpelling(textToCheck);
            const qualityResult = analyzeTextQuality(spellcheckResult, textToCheck);

            if (qualityResult.status === 'error') {
                summaryContainer.innerHTML = `<ul><li>• ${qualityResult.message}</li></ul>`;
                summaryContainer.classList.add('visible', 'is-error');
                scrollToFirstError();
                throw new Error("Проверка орфографии не пройдена.");
            }
            if (qualityResult.status === 'warning') {
                const confirmed = await customAlert.confirm(qualityResult.message, "Проверка орфографии");
                if (!confirmed) {
                    throw new Error("Отправка отменена пользователем.");
                }
            }
            if (qualityResult.status === 'server_error') {
                spellcheckStatus = 'skipped_due_to_server_error';
                console.log("Проверка орфографии пропущена из-за ошибки сервера. Отправка продолжается.");
            }

            const formData = new FormData();
            formData.append('char_name', nameHiddenInput.value);
            formData.append('char_age', formModal.querySelector('#age-select-wrapper .custom-select').dataset.value);
            formData.append('char_character', formModal.querySelector('#char-character').value);
            formData.append('char_before', formModal.querySelector('#char-before').value);
            formData.append('char_group', groupHiddenInput.value || 'Нет');
            formData.append('char_weakness', formModal.querySelector('#char-weakness').value);
            formData.append('char_after', formModal.querySelector('#char-after').value);
            formData.append('char_extra', formModal.querySelector('#char-extra').value);
            formData.append('char_appearance', formModal.querySelector('#char-appearance').value);
            formData.append('tg_login', tgLoginInput.value.trim());
            formData.append('spellcheck_status', spellcheckStatus);
            formData.append('h-captcha-response', tokenToSubmit);
            uploadedFiles.forEach((file) => { formData.append(`char_art[]`, file, file.name); });

            const response = await fetch('api/submit_application_hcaptcha.php', { method: 'POST', body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Ошибка сервера: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                stopInfusionAnimation();
                document.dispatchEvent(new CustomEvent('anketaSuccess', { detail: { characterName: nameHiddenInput.value, formData: formData } }));

                await showFestiveSuccess(
                    "Заявка успешно отправлена!",
                    'Если ваша заявка будет одобрена, администратор свяжется с вами, и статус вашего профиля изменится на "Занят". В случае отклонения, ваша заявка будет удалена с сайта.'
                );

                const characterName = nameHiddenInput.value;
                if (characterName) localStorage.removeItem(getStorageKey(characterName));
                closeFormModal();
            } else {
                throw new Error(result.message || 'Неизвестная ошибка на сервере.');
            }
        } catch (error) {
            if (error.message !== "Проверка орфографии не пройдена." && error.message !== "Отправка отменена пользователем.") {
                 await customAlert.alert(`Ошибка отправки: ${error.message}`, "Ошибка!");
            }
        } finally {
            stopInfusionAnimation();
            submitButton.disabled = false;
            submitButton.textContent = 'Отправить анкету';
        }
    }

    submitButton.addEventListener('click', async (e) => {
        e.preventDefault();

        if (hCaptchaToken) {
            await executeSubmission();
        } else {
            summaryContainer.classList.remove('visible', 'is-error', 'is-warning');
            let formIsValid = true;
            let localErrors = [];

            fieldsToValidate.forEach(field => {
                if (!isFieldValid(field)) {
                    formIsValid = false;
                    validateField(field);
                    const label = field.closest('.form-group').querySelector('.label-text');
                    if (label && label.textContent) {
                        const errorText = `• Поле "${label.textContent.replace('*', '').trim()}" заполнено некорректно.`;
                        if (!localErrors.includes(errorText)) localErrors.push(errorText);
                    }
                }
            });
            let totalChars = 0;
            countableTextareas.forEach(textarea => { totalChars += textarea.value.length; });
            if (totalChars < requiredCharCount) {
                formIsValid = false;
                const remaining = requiredCharCount - totalChars;
                localErrors.push(`• Необходимо набрать еще ${remaining} символов в текстовых полях.`);
            }
            if (!formIsValid) {
                summaryContainer.innerHTML = `<ul>${localErrors.map(err => `<li>${err}</li>`).join('')}</ul>`;
                summaryContainer.classList.add('visible', 'is-error');
                scrollToFirstError();
                return;
            }

            submitButton.disabled = true;
            requestHCaptcha();
            setTimeout(() => {
                if (!hCaptchaToken) submitButton.disabled = false;
            }, 10000);
        }
    });

    return { openFormModal };
}
