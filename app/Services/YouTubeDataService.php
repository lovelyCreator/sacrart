<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class YouTubeDataService
{
    protected ?string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.youtube.api_key');
    }

    /**
     * Get video statistics including viewer count, like count, etc.
     * 
     * @param string $videoId YouTube video ID
     * @return array
     */
    public function getVideoStatistics(string $videoId): array
    {
        if (!$this->apiKey) {
            Log::warning('YouTube API key not configured');
            return [
                'success' => false,
                'error' => 'YouTube API key not configured',
            ];
        }

        try {
            $response = Http::timeout(10)->get('https://www.googleapis.com/youtube/v3/videos', [
                'part' => 'statistics,liveStreamingDetails,snippet',
                'id' => $videoId,
                'key' => $this->apiKey,
            ]);

            if (!$response->successful()) {
                Log::error('YouTube API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return [
                    'success' => false,
                    'error' => 'YouTube API request failed',
                ];
            }

            $data = $response->json();

            if (empty($data['items'])) {
                return [
                    'success' => false,
                    'error' => 'Video not found',
                ];
            }

            $video = $data['items'][0];
            $statistics = $video['statistics'] ?? [];
            $liveDetails = $video['liveStreamingDetails'] ?? [];
            $snippet = $video['snippet'] ?? [];

            return [
                'success' => true,
                'data' => [
                    'viewCount' => isset($statistics['viewCount']) ? (int)$statistics['viewCount'] : null,
                    'likeCount' => isset($statistics['likeCount']) ? (int)$statistics['likeCount'] : null,
                    'commentCount' => isset($statistics['commentCount']) ? (int)$statistics['commentCount'] : null,
                    'concurrentViewers' => isset($liveDetails['concurrentViewers']) ? (int)$liveDetails['concurrentViewers'] : null,
                    'actualStartTime' => $liveDetails['actualStartTime'] ?? null,
                    'actualEndTime' => $liveDetails['actualEndTime'] ?? null,
                    'scheduledStartTime' => $liveDetails['scheduledStartTime'] ?? null,
                    'isLive' => $snippet['liveBroadcastContent'] === 'live',
                    'title' => $snippet['title'] ?? null,
                    'description' => $snippet['description'] ?? null,
                ],
            ];
        } catch (Exception $e) {
            Log::error('YouTube Data API exception', [
                'video_id' => $videoId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check if live chat is available for a video
     * 
     * @param string $videoId YouTube video ID
     * @return bool
     */
    public function isLiveChatAvailable(string $videoId): bool
    {
        try {
            $stats = $this->getVideoStatistics($videoId);
            if (!$stats['success']) {
                return false;
            }

            // Live chat is typically available for live streams
            return $stats['data']['isLive'] ?? false;
        } catch (Exception $e) {
            Log::error('Error checking live chat availability', [
                'video_id' => $videoId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
