function initializeCustomAlerts() {
    const overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
        console.error("Элемент #custom-alert-overlay не найден. Кастомные уведомления не будут работать.");
        return null;
    }

    const box = overlay.querySelector('.custom-alert-box');
    const titleEl = overlay.querySelector('#custom-alert-title');
    const messageEl = overlay.querySelector('#custom-alert-message');
    const buttonsEl = overlay.querySelector('#custom-alert-buttons');

    let resolver = null;

    const show = (options) => {
        titleEl.textContent = options.title || 'Уведомление';
        messageEl.innerHTML = options.message || ''; // Используем innerHTML для поддержки тегов
        buttonsEl.innerHTML = '';

        options.buttons.forEach(btnInfo => {
            const button = document.createElement('button');
            button.className = btnInfo.class || 'btn';
            button.textContent = btnInfo.text;
            button.dataset.value = btnInfo.value;
            buttonsEl.appendChild(button);
        });
        
        overlay.classList.add('visible');
        return new Promise(resolve => {
            resolver = resolve;
        });
    };

    const hide = () => {
        overlay.classList.remove('visible');
    };

    buttonsEl.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        let value = target.dataset.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        
        hide();
        if (resolver) resolver(value);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hide();
            if (resolver) resolver(false);
        }
    });

    const alert = (message, title = 'Внимание') => {
        return show({
            title: title,
            message: message,
            buttons: [
                { text: 'ОК', class: 'btn', value: true }
            ]
        });
    };


    const confirm = (message, title = 'Подтверждение') => {
        return show({
            title: title,
            message: message,
            buttons: [
                { text: 'Да', class: 'btn', value: true },
                { text: 'Нет', class: 'btn btn-secondary', value: false }
            ]
        });
    };

    return { alert, confirm, show };
}