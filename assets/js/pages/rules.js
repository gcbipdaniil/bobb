function initializeRulesPage() {
    const ruleItems = document.querySelectorAll('.rule-item');

    if (!ruleItems.length) {
        return;
    }

    const observerOptions = {
        root: null, // relative to the viewport
        rootMargin: '0px',
        threshold: 0.1 // 10% of the item must be visible
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Stop observing once it's visible
            }
        });
    };

    const intersectionObserver = new IntersectionObserver(observerCallback, observerOptions);

    ruleItems.forEach(item => {
        intersectionObserver.observe(item);
    });

    // Also, add the glitch text to the title
    const rulesTitle = document.querySelector('.rules-title');
    if (rulesTitle) {
        rulesTitle.setAttribute('data-text', rulesTitle.textContent);
    }
}

// Since the page content is loaded dynamically, we need to be careful.
// The main `main.js` script will call this function when the rules page is loaded.
// However, if the user loads the rules.html page directly, we need to call it too.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRulesPage);
} else {
    // DOMContentLoaded has already fired
    // This handles the case where the script is loaded dynamically after the page is already loaded.
    initializeRulesPage();
}
