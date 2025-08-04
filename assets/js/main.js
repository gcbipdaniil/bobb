function initializePreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    const minimumDuration = 1000;
    const startTime = Date.now();

    window.addEventListener('load', () => {
        const timeElapsed = Date.now() - startTime;
        const delayNeeded = Math.max(0, minimumDuration - timeElapsed);

        setTimeout(() => {
            preloader.classList.add('preloader-hiding');
            setTimeout(() => {
                preloader.classList.add('preloader-hidden');
            }, 500);
        }, delayNeeded);
    });
}

function initializeSideNav() {
    const body = document.body;
    const menuToggle = document.getElementById('menu-toggle');
    const sideNav = document.getElementById('side-nav');
    const navOverlay = document.getElementById('nav-overlay');

    if (!menuToggle || !sideNav || !navOverlay) return;

    const toggleMenu = (forceClose = false) => {
        body.classList.toggle('nav-open', !forceClose && !body.classList.contains('nav-open'));
    };

    menuToggle.addEventListener('click', () => toggleMenu());
    navOverlay.addEventListener('click', () => toggleMenu(true));

    sideNav.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link:not(.disabled)');
        if (link) {
            e.preventDefault();
            toggleMenu(true);
            const url = new URL(link.href);
            page(url.pathname);
        }
    });
}

function initializeIframeResizer() {
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type) {
            const iframe = document.getElementById('rating-iframe');
            if (event.data.type === 'resize-iframe' && iframe) {
                iframe.style.height = event.data.height + 'px';
            }
            if (event.data.type === 'open-character-card' && typeof openCharacterCard === 'function') {
                openCharacterCard(event.data.id);
            }
        }
    });
}

function initializeHeaderAndParallax() {
    const body = document.body;
    const header = document.querySelector('header');
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const backgroundScrollY = -(scrollY * 0.3);
            body.style.setProperty('--bg-scroll-y', `${backgroundScrollY}px`);
        });
    }

    window.addEventListener('scroll', () => {
        if (header) {
            header.classList.toggle('scrolled', window.scrollY > 10);
        }
    });
}

let currentPageCleanup = null;

function openCharacterCard(characterId) {
    if (!characterId) return;
    const url = `/users/${characterId}/anketa.json`;
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load character data. Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (window.charterViewer?.show) {
                data.folder = characterId; // Make sure folder is part of the data
                window.charterViewer.show(data);
            } else {
                console.error('Charter-viewer is not available.');
                alert('Character viewer module is not loaded.');
            }
        })
        .catch(error => {
            console.error('Error fetching character details:', error);
            alert('Не удалось загрузить данные персонажа.');
        });
}

function initializeGlobalKeyListener() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        const visibleModal = document.querySelector('.modal-overlay.modal-visible');

        if (document.body.classList.contains('nav-open')) {
            document.body.classList.remove('nav-open');
        } else if (visibleModal) {
            visibleModal.classList.remove('modal-visible');
            document.body.classList.remove('modal-open');
        }
    });
}

const pageInitializers = {
    '/charters.html': { init: () => { if (typeof initializeChartersPage === 'function') initializeChartersPage(); } },
    '/groups.html': {
        init: () => { if (typeof initializeGroupsPage === 'function') initializeGroupsPage(); },
        cleanup: () => { if (typeof cleanupGroupsPage === 'function') cleanupGroupsPage(); }
    },
    '/rules.html': { init: () => { if (typeof initializeRulesPage === 'function') initializeRulesPage(); } },
    '/administration.html': { init: () => { if (typeof initializeAdministrationPage === 'function') initializeAdministrationPage(); } },
    '/index.html': { init: () => { if (typeof initializeIndexPage === 'function') initializeIndexPage(); } },
    '/': { init: () => { if (typeof initializeIndexPage === 'function') initializeIndexPage(); } }
};

async function loadPage(path) {
    if (currentPageCleanup) {
        currentPageCleanup();
        currentPageCleanup = null;
    }

    const mainContent = document.getElementById('main-content');
    const preloader = document.getElementById('preloader');

    if (!mainContent) {
        console.error('Main content area not found');
        return;
    }

    preloader.classList.remove('preloader-hidden', 'preloader-hiding');
    mainContent.style.opacity = 0;

    let fetchPath = path;
    if (!fetchPath.endsWith('.html') && fetchPath !== '/') {
        fetchPath += '.html';
    } else if (fetchPath === '/') {
        fetchPath = '/index.html';
    }

    try {
        const response = await fetch(fetchPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const newMain = doc.querySelector('#main-content');
        const newGroupsSlider = doc.querySelector('#groups-slider-container');

        if (newMain) {
            mainContent.innerHTML = newMain.innerHTML;
            document.body.id = doc.body.id;
        } else if (newGroupsSlider) {
            mainContent.innerHTML = '';
            mainContent.appendChild(newGroupsSlider);
            document.body.id = doc.body.id;
        } else {
            console.error('Could not find #main-content or #groups-slider-container in fetched page');
            mainContent.innerHTML = '<p>Error: Content could not be loaded.</p>';
        }

        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            let linkPath = new URL(link.href).pathname;
            if (linkPath.endsWith('/index.html')) {
                linkPath = '/';
            }
            link.classList.toggle('active', linkPath === path);
        });


        const initializerPath = path.endsWith('.html') ? path : (path === '/' ? '/index.html' : `${path}.html`);
        const pageInitializer = pageInitializers[initializerPath];

        if (pageInitializer) {
            document.body.className = doc.body.className || '';
            setTimeout(() => {
                if(pageInitializer.init) pageInitializer.init();
            }, 0);
            if(pageInitializer.cleanup) currentPageCleanup = pageInitializer.cleanup;
        }

        window.scrollTo(0, 0);

    } catch (error) {
        console.error('Failed to fetch page: ', error);
        mainContent.innerHTML = '<p>Error: Content could not be loaded.</p>';
    } finally {
        setTimeout(() => {
            preloader.classList.add('preloader-hiding');
            setTimeout(() => {
                preloader.classList.add('preloader-hidden');
            }, 500);
            mainContent.style.opacity = 1;
        }, 500);
    }
}

function showInstallPrompt() {
    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const lastShown = localStorage.getItem('installPromptLastShown');
    const now = new Date().getTime();
    const twelveHours = 12 * 60 * 60 * 1000;

    if (isIOS() && !window.navigator.standalone && (!lastShown || now - lastShown > twelveHours)) {
        const installPrompt = document.createElement('div');
        installPrompt.id = 'install-prompt';
        installPrompt.innerHTML = `
            <p>For a better experience, you can install this site as a web app. Just tap <span class="material-symbols-outlined">ios_share</span> and then 'Add to Home Screen'.</p>
            <button id="close-install-prompt" class="modal-close-btn">×</button>
        `;
        document.body.appendChild(installPrompt);

        document.getElementById('close-install-prompt').addEventListener('click', () => {
            installPrompt.style.display = 'none';
            localStorage.setItem('installPromptLastShown', now);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializePreloader();
    initializeSideNav();
    initializeHeaderAndParallax();
    initializeGlobalKeyListener();
    initializeIframeResizer();

    if (typeof initializeCharterView === 'function') {
        initializeCharterView();
    }
    if (typeof initializeRatingSystem === 'function') {
        initializeRatingSystem();
    }

    page('/', () => loadPage('/'));
    page('/index.html', () => loadPage('/'));
    page('/charters', () => loadPage('/charters.html'));
    page('/charters.html', () => loadPage('/charters.html'));
    page('/groups', () => loadPage('/groups.html'));
    page('/groups.html', () => loadPage('/groups.html'));
    page('/rules', () => loadPage('/rules.html'));
    page('/rules.html', () => loadPage('/rules.html'));
    page('/administration', () => loadPage('/administration.html'));
    page('/administration.html', () => loadPage('/administration.html'));
    page('*', () => loadPage('/404.html'));

    page();

    showInstallPrompt();
});
