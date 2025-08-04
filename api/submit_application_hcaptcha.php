<?php
// =================================================================
//      СЕРВЕРНЫЙ СКРИПТ ДЛЯ ОБРАБОТКИ АНКЕТ submit_application.php
// =================================================================

// === КОНФИГУРАЦИЯ ===
$baseDir = '../users/'; // Папка users в корне сайта
define('TELEGRAM_TOKEN', '8467685604:AAFY8rLzqIUfG7ZVokzfns-cd0FOp57nUBE');
define('TELEGRAM_CHAT_ID', '1087612925');
define('SITE_URL', 'https://apocalypsis.crewcompany.top/');
$secretKey = 'ES_d9169edcccb944e883c0c13f674f9d7b'; // hCaptcha Secret Key - IMPORTANT: This should be the real secret key.

// === ЗАЩИТА ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("HTTP/1.1 405 Method Not Allowed");
    echo json_encode(['status' => 'error', 'message' => 'Метод не разрешен.']);
    exit;
}
if (isset($_POST['h-captcha-response'])) {
    $token = $_POST['h-captcha-response'];
    $ip = $_SERVER['REMOTE_ADDR'];
    $data = ['secret' => $secretKey, 'response' => $token, 'remoteip' => $ip];
    $ch = curl_init();
    curl_setopt_array($ch, [CURLOPT_URL => 'https://hcaptcha.com/siteverify', CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($data), CURLOPT_RETURNTRANSFER => true]);
    $response = curl_exec($ch);
    curl_close($ch);
    $result = json_decode($response, true);
    if (!isset($result['success']) || $result['success'] !== true) {
        header("HTTP/1.1 403 Forbidden");
        $errorMessage = 'Проверка на робота не пройдена.';
        if (isset($result['error-codes'])) {
            $errorMessage .= ' Errors: ' . implode(', ', $result['error-codes']);
        }
        echo json_encode(['status' => 'error', 'message' => $errorMessage]);
        exit;
    }
} else {
    header("HTTP/1.1 400 Bad Request");
    echo json_encode(['status' => 'error', 'message' => 'Отсутствует токен безопасности.']);
    exit;
}

// === ПОДГОТОВКА ДАННЫХ И СОЗДАНИЕ ПАПКИ ===
$tgLogin = isset($_POST['tg_login']) ? trim($_POST['tg_login']) : 'unknown_user';
$safeTgLogin = preg_replace('/[^a-zA-Z0-9_]/', '', $tgLogin);
$timestamp = date('Ymd_His');
$newFolderName = $safeTgLogin . '_' . $timestamp;
$targetDir = $baseDir . $newFolderName . '/';

if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true)) {
    header("HTTP/1.1 500 Internal Server Error");
    echo json_encode(['status' => 'error', 'message' => 'Не удалось создать директорию на сервере.']);
    exit;
}

// === ОБРАБОТКА И СОХРАНЕНИЕ ФАЙЛОВ (АРТОВ) ===
$uploadedImagePaths = [];
if (isset($_FILES['char_art'])) {
    $files = $_FILES['char_art'];
    $fileCount = is_array($files['name']) ? count($files['name']) : 0;
    for ($i = 0; $i < $fileCount; $i++) {
        if ($files['error'][$i] === UPLOAD_ERR_OK) {
            $tmpName = $files['tmp_name'][$i];
            $originalName = basename($files['name'][$i]);
            $safeFileName = preg_replace('/[^a-zA-Z0-9-_\.]/', '', $originalName);
            $destination = $targetDir . $safeFileName;
            if (move_uploaded_file($tmpName, $destination)) {
                $uploadedImagePaths[] = $safeFileName;
            }
        }
    }
}

// === СБОР ДАННЫХ ДЛЯ JSON-АНКЕТЫ ===
$applicationData = [
    'character_name' => $_POST['char_name'] ?? 'N/A',
    'telegram_login' => '@' . $tgLogin,
    'submission_time' => date('d.m.Y H:i:s'),
    'age' => $_POST['char_age'] ?? 'N/A',
    'group' => $_POST['char_group'] ?? 'N/A',
    'sorol' => '',
    'spellcheck_status' => $_POST['spellcheck_status'] ?? 'unknown',
    'uploaded_arts' => $uploadedImagePaths,
    'fields' => [
        'character' => $_POST['char_character'] ?? '', 'before_apocalypse' => $_POST['char_before'] ?? '',
        'weaknesses_and_fears' => $_POST['char_weakness'] ?? '', 'after_apocalypse' => $_POST['char_after'] ?? '',
        'extra_info' => $_POST['char_extra'] ?? '', 'appearance' => $_POST['char_appearance'] ?? '',
    ],
];

// === СОХРАНЕНИЕ JSON-ФАЙЛА АНКЕТЫ ===
$jsonFilePath = $targetDir . 'anketa.json';
$jsonData = json_encode($applicationData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if (file_put_contents($jsonFilePath, $jsonData) === false) {
    header("HTTP/1.1 500 Internal Server Error");
    echo json_encode(['status' => 'error', 'message' => 'Не удалось сохранить JSON-файл анкеты.']);
    exit;
}

// === ОБНОВЛЕНИЕ СТАТУСА В JSON НА "БРОНЬ" ===
updateCharacterStatusOnReserve('../assets/data/characters.json', $applicationData['character_name'], $newFolderName, $applicationData['uploaded_arts'][0] ?? null, $applicationData['telegram_login']);

// === ОТПРАВКА УВЕДОМЛЕНИЯ В TELEGRAM ===
sendTelegramNotification($applicationData, $newFolderName);

// === УСПЕШНЫЙ ОТВЕТ КЛИЕНТУ ===
header('Content-Type: application/json');
echo json_encode(['status' => 'success', 'message' => 'Анкета успешно сохранена.']);


// =================================================================
//          СЛУЖЕБНЫЕ ФУНКЦИИ
// =================================================================

function sendTelegramNotification($data, $folderName) {
    $callbackPayload = $folderName . '|' . $data['character_name'];
    $keyboard = ['inline_keyboard' => [[['text' => '✅ Одобрить', 'callback_data' => 'approve_' . $callbackPayload], ['text' => '❌ Отклонить', 'callback_data' => 'reject_' . $callbackPayload]]]];
    $replyMarkup = json_encode($keyboard);

    // Экранируем логин перед вставкой в сообщение
    $escapedLogin = escapeMarkdown($data['telegram_login'] ?? 'Не указан');

    $summaryText = "🔔 *Новая анкета на рассмотрении!*\n\n";
    $summaryText .= "👤 *Персонаж:* " . escapeMarkdown($data['character_name'] ?? 'Не указано') . "\n";
    $summaryText .= "📞 *Игрок:* " . $escapedLogin . "\n";
    $summaryText .= "📁 *Папка:* `" . escapeMarkdown($folderName) . "`\n\n";
    $summaryText .= "Примите решение, используя кнопки ниже.";
    sendMessageToTelegram($summaryText, $replyMarkup);

    $fullText = "📝 *Полная анкета для " . escapeMarkdown($data['character_name'] ?? '') . "*\n";
    $fullText .= "--------------------------------------\n\n";
    $fullText .= "*Характер:*\n" . escapeMarkdown($data['fields']['character'] ?: 'Не заполнено') . "\n\n";
    $fullText .= "*До апокалипсиса:*\n" . escapeMarkdown($data['fields']['before_apocalypse'] ?: 'Не заполнено') . "\n\n";
    $fullText .= "*Слабости и страхи:*\n" . escapeMarkdown($data['fields']['weaknesses_and_fears'] ?: 'Не заполнено') . "\n\n";
    $fullText .= "*После апокалипсиса:*\n" . escapeMarkdown($data['fields']['after_apocalypse'] ?: 'Не заполнено') . "\n\n";
    $fullText .= "*Что-нибудь от себя:*\n" . escapeMarkdown($data['fields']['extra_info'] ?: 'Не заполнено') . "\n\n";
    $fullText .= "*Внешность:*\n" . escapeMarkdown($data['fields']['appearance'] ?: 'Не заполнено') . "\n\n";

    $limit = 4096;
    if (mb_strlen($fullText, 'UTF-8') > $limit) {
        $messages = str_split_telegram($fullText, $limit);
        foreach ($messages as $index => $msg) {
            sendMessageToTelegram("*(Часть " . ($index + 1) . "/" . count($messages) . ")*\n" . $msg);
            sleep(1);
        }
    } else {
        sendMessageToTelegram($fullText);
    }

    if (!empty($data['uploaded_arts'])) {
        $media = [];
        $artsToSend = array_slice($data['uploaded_arts'], 0, 10);
        foreach ($artsToSend as $imageName) {
            $imageUrl = SITE_URL . 'users/' . $folderName . '/' . $imageName;
            $media[] = ['type' => 'photo', 'media' => $imageUrl];
        }
        if (!empty($media)) {
            $media[0]['caption'] = "Арты для анкеты персонажа *" . escapeMarkdown($data['character_name'] ?? 'Не указано') . "*";
            $media[0]['parse_mode'] = 'Markdown';
            sendMediaGroupToTelegram($media);
        }
    }
}

function updateCharacterStatusOnReserve($filePath, $charName, $folderName, $mainArt, $tgLogin) {
    if (!file_exists($filePath)) return;
    $fileHandle = fopen($filePath, 'r+');
    if (!$fileHandle || !flock($fileHandle, LOCK_EX)) return;
    $contents = fread($fileHandle, filesize($filePath));
    $data = json_decode($contents, true);
    $characterFound = false;
    foreach ($data['categories'] as &$category) {
        foreach ($category['characters'] as &$character) {
            if ($character['name'] === $charName) {
                $character['status'] = 'reserved';
                $character['folder'] = $folderName;
                $character['player'] = $tgLogin;
                if ($mainArt) {
                    $character['image'] = '/users/' . $folderName . '/' . $mainArt;
                }
                $characterFound = true;
                break 2;
            }
        }
    }
    if ($characterFound) {
        ftruncate($fileHandle, 0);
        rewind($fileHandle);
        fwrite($fileHandle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    flock($fileHandle, LOCK_UN);
    fclose($fileHandle);
}

function escapeMarkdown($text) {
    $chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    foreach ($chars as $char) {
        $text = str_replace($char, '\\' . $char, $text);
    }
    return $text;
}

function sendMessageToTelegram($message, $replyMarkup = null) {
    $url = "https://api.telegram.org/bot" . TELEGRAM_TOKEN . "/sendMessage";
    $params = ['chat_id' => TELEGRAM_CHAT_ID, 'text' => $message, 'parse_mode' => 'Markdown'];
    if ($replyMarkup) $params['reply_markup'] = $replyMarkup;
    $ch = curl_init();
    curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $params, CURLOPT_RETURNTRANSFER => true]);
    curl_exec($ch);
    curl_close($ch);
}

function sendMediaGroupToTelegram($media) {
    $url = "https://api.telegram.org/bot" . TELEGRAM_TOKEN . "/sendMediaGroup";
    $params = ['chat_id' => TELEGRAM_CHAT_ID, 'media' => json_encode($media)];
    $ch = curl_init();
    curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $params, CURLOPT_RETURNTRANSFER => true]);
    curl_exec($ch);
    curl_close($ch);
}

function str_split_telegram($text, $limit) {
    $chunks = [];
    $currentChunk = '';
    $words = explode(' ', $text);
    foreach ($words as $word) {
        if (mb_strlen($currentChunk . ' ' . $word, 'UTF-8') > $limit) {
            $chunks[] = $currentChunk;
            $currentChunk = $word;
        } else {
            if (!empty($currentChunk)) { $currentChunk .= ' '; }
            $currentChunk .= $word;
        }
    }
    if (!empty($currentChunk)) { $chunks[] = $currentChunk; }
    return $chunks;
}
?>
