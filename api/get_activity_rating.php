<?php
// =================================================================
//      API ЭНДПОИНТ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ РЕЙТИНГА АКТИВНОСТИ
//      (ФИНАЛЬНАЯ ВЕРСИЯ С СЕРВЕРНОЙ ОБРАБОТКОЙ)
// =================================================================

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

function getActivityData() {
    $activityDataPath = '../assets/data/activity_data.json';
    if (!file_exists($activityDataPath)) return [];
    $fileContents = file_get_contents($activityDataPath);
    return json_decode($fileContents, true) ?: [];
}

function getCharactersData() {
    $charactersPath = '../assets/data/characters.json';
    if (!file_exists($charactersPath)) return [];
    $fileContents = file_get_contents($charactersPath);
    return json_decode($fileContents, true) ?: [];
}

try {
    $activityData = getActivityData();
    $charactersData = getCharactersData();

    if (empty($charactersData) || !isset($charactersData['categories'])) {
        throw new Exception('Invalid or empty characters data.');
    }

    $leaderboard = [];
    $periods = ['weekly', 'monthly'];

    foreach ($periods as $period) {
        $periodActivity = $activityData[$period] ?? ['flood_group' => [], 'posts_group' => []];
        $floodGroup = $periodActivity['flood_group'] ?? [];
        $postsGroup = $periodActivity['posts_group'] ?? [];

        $maxScores = [
            'flood' => !empty($floodGroup) ? max($floodGroup) : 1,
            'posts' => !empty($postsGroup) ? max($postsGroup) : 1,
        ];

        $periodLeaderboard = [];

        foreach ($charactersData['categories'] as $category) {
            foreach ($category['characters'] as $character) {
                // КРИТИЧЕСКИЙ ФИЛЬТР: Показываем только занятых персонажей
                if (!isset($character['status']) || $character['status'] !== 'taken') {
                    continue;
                }

                $username = '';
                if (isset($character['player'])) {
                    $username = strtolower(str_replace('@', '', $character['player']));
                }

                $floodScore = $floodGroup[$username] ?? 0;
                $postsScore = $postsGroup[$username] ?? 0;

                $floodWeight = 3;
                $postWeight = 7;
                $normalizedFlood = ($maxScores['flood'] > 0) ? ($floodScore / $maxScores['flood']) : 0;
                $normalizedPosts = ($maxScores['posts'] > 0) ? ($postsScore / $maxScores['posts']) : 0;
                $totalScore = ($normalizedFlood * $floodWeight) + ($normalizedPosts * $postWeight);
                $maxPossibleScore = $floodWeight + $postWeight;
                $overallScore = ($maxPossibleScore > 0) ? ($totalScore / $maxPossibleScore) * 10 : 0;

                $periodLeaderboard[] = [
                    'name' => $character['name'],
                    'image' => $character['image'],
                    'player' => $character['player'] ?? '',
                    'folder' => $character['folder'] ?? '',
                    'flood' => $floodScore,
                    'posts' => $postsScore,
                    'overall' => $overallScore
                ];
            }
        }

        // Сортировка лидерборда для текущего периода
        usort($periodLeaderboard, function ($a, $b) {
            return $b['overall'] <=> $a['overall'];
        });

        $leaderboard[$period] = $periodLeaderboard;
    }

    echo json_encode($leaderboard, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

?>
