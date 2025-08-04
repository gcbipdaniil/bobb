function initializeIndexPage() {
    const plotModal = document.getElementById('plot-modal');
    const openModalBtn = document.getElementById('open-plot-modal');

    const joinNowBtn = document.getElementById('join-now-btn');

    if (!plotModal || !openModalBtn || !joinNowBtn) {
        return;
    }

    if (typeof initializeCustomAlerts === 'function') {
        const customAlert = initializeCustomAlerts();
        joinNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            customAlert.show({
                title: 'Подтверждение',
                message: 'Перед тем как подать анкету, советуем вам ознакомиться с правилами. Это поможет вам лучше понять мир и требования к персонажу.',
                buttons: [
                    { text: 'К правилам', class: 'btn', value: 'rules' },
                    { text: 'Пропустить', class: 'btn btn-secondary', value: 'charters' }
                ]
            }).then(result => {
                if (result === 'rules') {
                    page('/rules');
                } else if (result === 'charters') {
                    page('/charters');
                }
            });
        });
    } else {
        console.error("Custom Alerts module not found, join button will have default behavior.");
        joinNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            page('/charters');
        });
    }

    const closeModalBtn = plotModal.querySelector('.modal-close-btn');
    const body = document.body;

    const openModal = () => {
        plotModal.classList.add('modal-visible');
        body.classList.add('modal-open');
    };

    const closeModal = () => {
        plotModal.classList.remove('modal-visible');
        body.classList.remove('modal-open');
    };

    openModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });

    closeModalBtn.addEventListener('click', closeModal);

    plotModal.addEventListener('click', (e) => {
        if (e.target === plotModal) {
            closeModal();
        }
    });

    // --- Map Iframe Modal Logic ---
    const mapTriggerCard = document.getElementById('map-card-trigger');
    const iframeModal = document.getElementById('map-iframe-modal');
    if (mapTriggerCard && iframeModal) {
        const closeIframeBtn = document.getElementById('map-iframe-close');
        const iframeElement = document.getElementById('map-iframe');

        const openMapModal = () => {
            iframeModal.classList.add('modal-visible');
            document.body.classList.add('modal-open');
            if (iframeElement.src !== '/map.html') {
                iframeElement.src = '/map.html';
            }
        };

        const closeMapModal = () => {
            iframeModal.classList.remove('modal-visible');
            document.body.classList.remove('modal-open');
            iframeElement.src = 'about:blank';
        };

        mapTriggerCard.addEventListener('click', (e) => {
            e.preventDefault();
            openMapModal();
        });

        closeIframeBtn.addEventListener('click', closeMapModal);
    }
}