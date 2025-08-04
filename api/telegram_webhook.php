<?php
// =================================================================
//      ОБРАБОТЧИК КОМАНД TELEGRAM-БОТА (telegram_webhook.php)
// =================================================================

// --- КОНФИГУРАЦИЯ ---
define('TELEGRAM_TOKEN', '8467685604:AAFY8rLzqIUfG7ZVokzfns-cd0FOp57nUBE');
define('TELEGRAM_CHAT_ID', '1087612925'); // Admin chat
define('SITE_URL', 'https://apocalypsis.crewcompany.top/');

// ID ГРУПП ДЛЯ ОТСЛЕЖИВАНИЯ АКТИВНОСТИ
define('FLOOD_GROUP_ID', '-1002576855330');
define('POSTS_GROUP_ID', '-4959260680');

$charactersJsonPath = '../assets/data/characters.json';
$usersBasePath = '../users/';
$activityDataPath = '../assets/data/activity_data.json';

// --- ОСНОВНАЯ КЛАВИАТУРА БОТА ---
$mainKeyboard = json_encode([
    'keyboard' => [
        [['text' => '📋 Активные заявки']],
        [['text' => '✏️ Управление соролами']],
        [['text' => '🗑️ Удалить анкету']],
    ],
    'resize_keyboard' => true
]);

// --- ОСНОВНАЯ ЛОГИКА ---
$update = json_decode(file_get_contents('php://input'), true);

// 1. ОБРАБОТКА НАЖАТИЯ НА ВСТРАИВАЕМЫЕ КНОПКИ (CALLBACK)
if (isset($update['callback_query'])) {
    $callbackQuery = $update['callback_query'];
    $data = $callbackQuery['data'];
    $messageId = $callbackQuery['message']['message_id'];
    $chatId = $callbackQuery['message']['chat']['id'];

    if ($chatId != TELEGRAM_CHAT_ID) exit();

    list($command, $payload) = explode('_', $data, 2);

    if ($command === 'cancel') {
        deleteMessage($chatId, $messageId);
        answerCallbackQuery($callbackQuery['id']);
        exit();
    }

    if ($command === 'selectsorolchar') {
        $characterName = $payload;
        $text = "Вы выбрали *" . escapeMarkdown($characterName) . "*. Что вы хотите сделать с его соролом?";
        $keyboard = json_encode(['inline_keyboard' => [[
            ['text' => '➕ Добавить/Изменить', 'callback_data' => 'addsorol_' . $characterName],
            ['text' => '➖ Удалить', 'callback_data' => 'removesorol_' . $characterName]
        ],[['text' => 'Отмена', 'callback_data' => 'cancel_']]]]);
        editMessageText($chatId, $messageId, $text, $keyboard);
        answerCallbackQuery($callbackQuery['id']);
        exit();
    }

    if ($command === 'addsorol') {
        $characterName = $payload;
        $availableCharacters = findCharactersByStatus($charactersJsonPath, 'taken');
        $keyboard = [];
        foreach ($availableCharacters as $char) {
            if ($char['name'] !== $characterName) {
                $keyboard[] = [['text' => $char['name'], 'callback_data' => 'setsorol_' . $characterName . '|' . $char['name']]];
            }
        }
        $keyboard[] = [['text' => 'Отмена', 'callback_data' => 'cancel_']];
        editMessageText($chatId, $messageId, "Выберите сорола для персонажа *" . escapeMarkdown($characterName) . "*:", json_encode(['inline_keyboard' => $keyboard]));
        answerCallbackQuery($callbackQuery['id']);
        exit();
    }

    if ($command === 'setsorol') {
        list($characterA, $characterB) = explode('|', $payload);
        updateSorol($usersBasePath, $charactersJsonPath, $characterA, $characterB);
        updateSorol($usersBasePath, $charactersJsonPath, $characterB, $characterA);
        $message = "✅ Сорол между *" . escapeMarkdown($characterA) . "* и *" . escapeMarkdown($characterB) . "* установлен.";
        editMessageText($chatId, $messageId, $message);
        answerCallbackQuery($callbackQuery['id'], 'Сорол установлен');
        exit();
    }

    if ($command === 'removesorol') {
        $characterName = $payload;
        $character = findCharacterByName($charactersJsonPath, $characterName);
        if ($character && isset($character['folder'])) {
            $anketaPath = $usersBasePath . $character['folder'] . '/anketa.json';
            if (file_exists($anketaPath)) {
                $anketaData = json_decode(file_get_contents($anketaPath), true);
                $sorolName = $anketaData['sorol'] ?? null;
                if ($sorolName) {
                    updateSorol($usersBasePath, $charactersJsonPath, $sorolName, '');
                }
            }
        }
        updateSorol($usersBasePath, $charactersJsonPath, $characterName, '');
        $message = "✅ Сорол для *" . escapeMarkdown($characterName) . "* был удален.";
        editMessageText($chatId, $messageId, $message);
        answerCallbackQuery($callbackQuery['id'], 'Сорол удален');
        exit();
    }

    list($folderName, $characterName) = explode('|', $payload, 2);
    $anketaPath = $usersBasePath . $folderName . '/anketa.json';
    if (!file_exists($anketaPath) || !($anketaData = json_decode(file_get_contents($anketaPath), true))) {
        updateCharacterStatus($charactersJsonPath, $characterName, 'free', null, null, null);
        editMessageText($chatId, $messageId, "⚠️ *Внимание!* Данные анкеты для персонажа *" . escapeMarkdown($characterName) . "* не найдены. Роль принудительно освобождена.");
        answerCallbackQuery($callbackQuery['id'], 'Ошибка: анкеты нет, роль свободна.');
        exit();
    }

    switch ($command) {
        case 'review':
            $playerLogin = $anketaData['telegram_login'] ?? 'Не найден';
            $text = "🔎 Рассмотрение заявки для персонажа *" . escapeMarkdown($characterName) . "*.\n\nИгрок: " . escapeMarkdown($playerLogin) . "\nПапка: `" . escapeMarkdown($folderName) . "`\n\nВыберите действие:";
            $reviewKeyboard = json_encode(['inline_keyboard' => [
                [['text' => '✅ Одобрить', 'callback_data' => 'approve_' . $payload], ['text' => '❌ Отклонить', 'callback_data' => 'reject_' . $payload]],
                [['text' => 'Отмена', 'callback_data' => 'cancel_']]
            ]]);
            editMessageText($chatId, $messageId, $text, $reviewKeyboard);
            answerCallbackQuery($callbackQuery['id']);
            break;
        case 'approve':
            $result = updateCharacterStatus($charactersJsonPath, $characterName, 'taken', $folderName, $anketaData['uploaded_arts'][0] ?? null, $anketaData['telegram_login']);
            $message = $result ? "✅ Анкета для *" . escapeMarkdown($characterName) . "* одобрена." : "❌ Ошибка: Персонаж *" . escapeMarkdown($characterName) . "* не найден!";
            editMessageText($chatId, $messageId, $message);
            answerCallbackQuery($callbackQuery['id'], 'Заявка одобрена!');
            break;
        case 'reject': case 'delete':
            $result = updateCharacterStatus($charactersJsonPath, $characterName, 'free', null, null, null);
            if ($result) {
                deleteUserFolder($usersBasePath . $folderName);
                $actionText = ($command === 'reject') ? 'отклонена' : 'удалена';
                editMessageText($chatId, $messageId, "🗑️ Анкета для *" . escapeMarkdown($characterName) . "* была {$actionText}. Роль свободна, данные удалены.");
                answerCallbackQuery($callbackQuery['id'], 'Анкета удалена!');
            } else { answerCallbackQuery($callbackQuery['id'], 'Ошибка: Персонаж не найден!'); }
            break;
    }
}
// 2. ОБРАБОТКА ВСЕХ ВХОДЯЩИХ СООБЩЕНИЙ
elseif (isset($update['message'])) {
    $message = $update['message'];
    $chatId = $message['chat']['id'];

    // 2.1. ОБРАБОТКА КОМАНД АДМИНА
    if (isset($message['text']) && $chatId == TELEGRAM_CHAT_ID) {
        $text = $message['text'];
        switch ($text) {
            case '/start':
                sendMessageToTelegram($chatId, "Добро пожаловать, администратор!", $mainKeyboard);
                break;
            case '📋 Активные заявки':
                $reserved = findCharactersByStatus($charactersJsonPath, 'reserved');
                if (empty($reserved)) {
                    sendMessageToTelegram($chatId, "На данный момент нет активных заявок на бронь.");
                } else {
                    $keyboard = [];
                    foreach($reserved as $char) {
                        if (isset($char['folder']) && isset($char['name'])) {
                            $payload = $char['folder'] . '|' . $char['name'];
                            $keyboard[] = [['text' => 'Рассмотреть: ' . $char['name'], 'callback_data' => 'review_' . $payload]];
                        }
                    }
                    $keyboard[] = [['text' => 'Отмена', 'callback_data' => 'cancel_']];
                    sendMessageToTelegram($chatId, "Выберите заявку для модерации:", json_encode(['inline_keyboard' => $keyboard]));
                }
                break;
            case '🗑️ Удалить анкету':
                $taken = findCharactersByStatus($charactersJsonPath, 'taken');
                if (empty($taken)) {
                    sendMessageToTelegram($chatId, "Нет занятых ролей для удаления.");
                } else {
                    $keyboard = [];
                    foreach($taken as $char) {
                        if (isset($char['folder']) && isset($char['name'])) {
                            $payload = $char['folder'] . '|' . $char['name'];
                            $keyboard[] = [['text' => 'Удалить: ' . $char['name'], 'callback_data' => 'delete_' . $payload]];
                        }
                    }
                    $keyboard[] = [['text' => 'Отмена', 'callback_data' => 'cancel_']];
                    sendMessageToTelegram($chatId, "Выберите анкету, которую хотите удалить:", json_encode(['inline_keyboard' => $keyboard]));
                }
                break;
            case '✏️ Управление соролами':
                $taken = findCharactersByStatus($charactersJsonPath, 'taken');
                if (empty($taken)) {
                    sendMessageToTelegram($chatId, "Нет занятых персонажей для управления соролами.");
                } else {
                    $keyboard = [];
                    foreach($taken as $char) {
                        $currentSorol = isset($char['folder']) ? getSorolNameFromAnketa($usersBasePath . $char['folder'] . '/anketa.json') : null;
                        $keyboard[] = [['text' => $char['name'] . ($currentSorol ? " ({$currentSorol})" : ''), 'callback_data' => 'selectsorolchar_' . $char['name']]];
                    }
                    $keyboard[] = [['text' => 'Отмена', 'callback_data' => 'cancel_']];
                    sendMessageToTelegram($chatId, "Выберите персонажа, чтобы управлять его соролом:", json_encode(['inline_keyboard' => $keyboard]));
                }
                break;
        }
    }
    // 2.2. ОБРАБОТКА СООБЩЕНИЙ ДЛЯ ПОДСЧЕТА АКТИВНОСТИ
    elseif (isset($message['from']['username']) && ($chatId == FLOOD_GROUP_ID || $chatId == POSTS_GROUP_ID)) {
        $username = $message['from']['username'];
        $groupType = ($chatId == FLOOD_GROUP_ID) ? 'flood_group' : 'posts_group';

        $fileHandle = fopen($activityDataPath, 'c+');
        if (flock($fileHandle, LOCK_EX)) {
            $data = json_decode(stream_get_contents($fileHandle), true);
            if (!$data) $data = [];

            $now = new DateTime('now', new DateTimeZone('UTC'));
            $currentWeek = $now->format('o-W');
            $currentMonth = $now->format('Y-m');

            if (!isset($data['last_reset_weekly']) || $data['last_reset_weekly'] !== $currentWeek) {
                $data['weekly'] = ['flood_group' => [], 'posts_group' => []];
                $data['last_reset_weekly'] = $currentWeek;
            }

            if (!isset($data['last_reset_monthly']) || $data['last_reset_monthly'] !== $currentMonth) {
                $data['monthly'] = ['flood_group' => [], 'posts_group' => []];
                $data['last_reset_monthly'] = $currentMonth;
            }

            if (!isset($data['weekly'][$groupType][$username])) $data['weekly'][$groupType][$username] = 0;
            if (!isset($data['monthly'][$groupType][$username])) $data['monthly'][$groupType][$username] = 0;

            $data['weekly'][$groupType][$username]++;
            $data['monthly'][$groupType][$username]++;

            ftruncate($fileHandle, 0);
            rewind($fileHandle);
            fwrite($fileHandle, json_encode($data, JSON_PRETTY_PRINT));
            flock($fileHandle, LOCK_UN);
        }
        fclose($fileHandle);
    }
}


// --- СЛУЖЕБНЫЕ ФУНКЦИИ ---
function escapeMarkdown($text) { $chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']; foreach ($chars as $char) { $text = str_replace($char, '\\' . $char, $text); } return $text; }
function updateCharacterStatus($filePath, $charName, $newStatus, $folderName, $mainArt, $playerLogin) { if (!file_exists($filePath)) return false; $fileHandle = fopen($filePath, 'r+'); if (!$fileHandle || !flock($fileHandle, LOCK_EX)) return false; $contents = fread($fileHandle, filesize($filePath)); $data = json_decode($contents, true); $characterFound = false; foreach ($data['categories'] as &$category) { foreach ($category['characters'] as &$character) { if ($character['name'] === $charName) { $character['status'] = $newStatus; if ($newStatus === 'taken') { $character['folder'] = $folderName; $character['player'] = $playerLogin; if ($mainArt) { $character['image'] = '/users/' . $folderName . '/' . $mainArt; } } else { unset($character['folder']); unset($character['player']); $character['image'] = 'empty.webp'; } $characterFound = true; break 2; } } } if ($characterFound) { ftruncate($fileHandle, 0); rewind($fileHandle); fwrite($fileHandle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)); } flock($fileHandle, LOCK_UN); fclose($fileHandle); return $characterFound; }
function findCharactersByStatus($filePath, $status) { if (!file_exists($filePath)) return []; $data = json_decode(file_get_contents($filePath), true); $found = []; foreach ($data['categories'] as $category) { foreach ($category['characters'] as $character) { if (isset($character['status']) && $character['status'] === $status) { $found[] = $character; } } } return $found; }
function findCharacterByName($filePath, $charName) { if (!file_exists($filePath)) return null; $data = json_decode(file_get_contents($filePath), true); foreach ($data['categories'] as $category) { foreach ($category['characters'] as $character) { if ($character['name'] === $charName) { return $character; } } } return null; }
function deleteUserFolder($dirPath) { if (!is_dir($dirPath)) return; $files = glob($dirPath . '/*', GLOB_MARK); foreach ($files as $file) { is_dir($file) ? deleteUserFolder($file) : unlink($file); } rmdir($dirPath); }
function updateSorol($usersBasePath, $charactersJsonPath, $charName, $newSorolName) { $character = findCharacterByName($charactersJsonPath, $charName); if (!$character || !isset($character['folder'])) { return false; } $anketaPath = $usersBasePath . $character['folder'] . '/anketa.json'; if (!file_exists($anketaPath)) return false; $anketaData = json_decode(file_get_contents($anketaPath), true); $anketaData['sorol'] = $newSorolName; return file_put_contents($anketaPath, json_encode($anketaData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)); }
function getSorolNameFromAnketa($anketaPath) { if (!file_exists($anketaPath)) return null; $anketaData = json_decode(file_get_contents($anketaPath), true); return $anketaData['sorol'] ?? null; }
function sendMessageToTelegram($chatId, $message, $replyMarkup = null) { $url = "https://api.telegram.org/bot" . TELEGRAM_TOKEN . "/sendMessage"; $params = ['chat_id' => $chatId, 'text' => $message, 'parse_mode' => 'Markdown']; if ($replyMarkup) $params['reply_markup'] = $replyMarkup; $ch = curl_init(); curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $params, CURLOPT_RETURNTRANSFER => true]); curl_exec($ch); curl_close($ch); }
function answerCallbackQuery($callbackQueryId, $text = '') { $url = "https://api.telegram.org/bot" . TELEGRAM_TOKEN . "/answerCallbackQuery"; $params = ['callback_query_id' => $callbackQueryId, 'text' => $text, 'show_alert' => false]; $ch = curl_init(); curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $params, CURLOPT_RETURNTRANSFER => true]); curl_exec($ch); curl_close($ch); }
function editMessageText($chatId, $messageId, $text, $replyMarkup = '') { $url = "https://api.telegram.org/bot" . TELEGRAM_TOKEN . "/editMessageText"; $params = [ 'chat_id' => $chatId, 'message_id' => $messageId, 'text' => $text, 'parse_mode' => 'Markdown', 'reply_markup' => $replyMarkup ]; $ch = curl_init(); curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $params, CURLOPT_RETURNTRANSFER => true]); curl_exec($ch); curl_close($ch); }
function deleteMessage($chatId, $messageId) { $url = "https://api.telegram.org/bot" . TELEGRAM_TOKEN . "/deleteMessage"; $params = ['chat_id' => $chatId, 'message_id' => $messageId]; $ch = curl_init(); curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $params, CURLOPT_RETURNTRANSFER => true]); curl_exec($ch); curl_close($ch); }
?>
