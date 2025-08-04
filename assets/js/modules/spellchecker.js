async function checkSpelling(text) {
    const apiUrl = 'https://api.languagetool.org/v2/check';

    const formData = new URLSearchParams();
    formData.append('text', text);
    formData.append('language', 'ru-RU');

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            signal: AbortSignal.timeout(8000) // Add an 8-second timeout
        });

        if (response.status === 400) {
            // This is a critical error from the API, meaning too many mistakes. This should block submission.
            return {
                isApiError: true,
                isCritical: true,
                message: 'Our check found numerous spelling and grammar errors. Please review and correct your text before submitting.'
            };
        }

        if (!response.ok) {
            // Other server-side errors (5xx, etc.)
            throw new Error(`Network error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.matches || []; // Success case
    } catch (error) {
        console.error('Could not perform spell check:', error);
        // This can be a timeout or any other network failure. This should NOT block submission.
        return {
            isApiError: true,
            isServerError: true,
            message: "Spell check service is temporarily unavailable."
        };
    }
}


function analyzeTextQuality(spellcheckResult, text) {
    const WARNING_DENSITY_THRESHOLD = 20;
    const ERROR_DENSITY_THRESHOLD = 25;

    // Case 1: API returned a server error (e.g., timeout). Submission should proceed.
    if (spellcheckResult.isServerError) {
        return { status: 'server_error', message: spellcheckResult.message };
    }

    // Case 2: API returned a critical error (e.g., too many mistakes). Submission should be blocked.
    if (spellcheckResult.isCritical) {
        return { status: 'error', message: spellcheckResult.message };
    }

    // Case 3: We have a successful response with a list of errors.
    const errors = Array.isArray(spellcheckResult) ? spellcheckResult : [];
    if (errors.length === 0) {
        return { status: 'success', message: '' };
    }

    const errorCount = errors.length;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    if (wordCount === 0) {
        return { status: 'success', message: '' };
    }

    const errorDensity = (errorCount / wordCount) * 100;

    // This check is now somewhat redundant because the API's 400 error is the primary "too many mistakes" check.
    // However, we can keep it as a fallback.
    if (errorDensity > ERROR_DENSITY_THRESHOLD) {
        return {
            status: 'error',
            message: `Our check found numerous spelling and grammar errors. Please review and correct your text before submitting.`
        };
    }

    if (errorDensity > WARNING_DENSITY_THRESHOLD) {
        return {
            status: 'warning',
            message: `В тексте найдено несколько грамматических или орфографических ошибок (${errorCount} шт.). Вы уверены, что хотите отправить анкету в таком виде?`
        };
    }

    return { status: 'success', message: '' };
}
