<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class HlsUpdateService
{
    private $bunnyLibraryId;
    
    public function __construct()
    {
        $this->bunnyLibraryId = config('services.bunny.library_id');
    }
    
    /**
     * Check if HLS URLs need updating and update them
     */
    public function updateIfNeeded(): array
    {
        // Check if we've updated recently (prevent too frequent updates)
        $lastUpdate = Cache::get('hls_last_update');
        $minInterval = 6 * 60 * 60; // 6 hours minimum between updates
        
        if ($lastUpdate && (time() - $lastUpdate) < $minInterval) {
            return [
                'success' => true,
                'message' => 'HLS URLs were updated recently, skipping',
                'last_update' => date('Y-m-d H:i:s', $lastUpdate),
                'next_update' => date('Y-m-d H:i:s', $lastUpdate + $minInterval)
            ];
        }
        
        Log::info('Starting HLS URL update process');
        
        try {
            $result = $this->updateHlsUrls();
            
            if ($result['success']) {
                Cache::put('hls_last_update', time(), 24 * 60 * 60); // Cache for 24 hours
                Log::info("HLS URLs updated successfully: {$result['updated']} updated, {$result['errors']} errors");
            }
            
            return $result;
            
        } catch (\Exception $e) {
            Log::error('HLS URL update failed: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Update failed: ' . $e->getMessage(),
                'updated' => 0,
                'errors' => 1
            ];
        }
    }
    
    /**
     * Force update HLS URLs regardless of last update time
     */
    public function forceUpdate(): array
    {
        Cache::forget('hls_last_update');
        return $this->updateHlsUrls();
    }
    
    /**
     * Update HLS URLs from Bunny.net
     */
    private function updateHlsUrls(): array
    {
        if (empty($this->bunnyLibraryId)) {
            throw new \Exception('Missing BUNNY_LIBRARY_ID configuration');
        }
        
        // Get all video IDs from database
        $tables = ['videos', 'reels', 'live_archive_videos'];
        $allRecords = [];
        
        foreach ($tables as $table) {
            $records = DB::table($table)
                ->whereNotNull('bunny_video_id')
                ->where('bunny_video_id', '!=', '')
                ->select('id', 'bunny_video_id')
                ->get();
            
            foreach ($records as $record) {
                $allRecords[] = [
                    'table' => $table,
                    'record_id' => $record->id,
                    'bunny_video_id' => $record->bunny_video_id
                ];
            }
        }
        
        if (empty($allRecords)) {
            return [
                'success' => true,
                'message' => 'No records found with bunny_video_id',
                'updated' => 0,
                'errors' => 0
            ];
        }
        
        // Get unique video IDs and fetch fresh URLs
        $uniqueVideoIds = array_unique(array_column($allRecords, 'bunny_video_id'));
        $newHlsUrls = [];
        
        foreach ($uniqueVideoIds as $videoId) {
            $hlsUrl = $this->getWorkingHlsUrl($videoId);
            if ($hlsUrl) {
                $newHlsUrls[$videoId] = $hlsUrl;
            }
            usleep(500000); // 0.5 second delay between requests
        }
        
        // Update database
        $totalUpdated = 0;
        $totalErrors = 0;
        
        foreach ($allRecords as $record) {
            $table = $record['table'];
            $recordId = $record['record_id'];
            $videoId = $record['bunny_video_id'];
            
            if (isset($newHlsUrls[$videoId])) {
                try {
                    $updated = DB::table($table)
                        ->where('id', $recordId)
                        ->update([
                            'bunny_hls_url' => $newHlsUrls[$videoId],
                            'updated_at' => now(),
                        ]);
                    
                    if ($updated) {
                        $totalUpdated++;
                    }
                    
                } catch (\Exception $e) {
                    $totalErrors++;
                    Log::error("Error updating HLS URL for {$table} ID {$recordId}: " . $e->getMessage());
                }
            } else {
                $totalErrors++;
            }
        }
        
        return [
            'success' => $totalErrors === 0 || $totalUpdated > 0,
            'message' => "Updated {$totalUpdated} HLS URLs, {$totalErrors} errors",
            'updated' => $totalUpdated,
            'errors' => $totalErrors,
            'total_records' => count($allRecords),
            'unique_videos' => count($uniqueVideoIds)
        ];
    }
    
    /**
     * Get working HLS URL from Bunny.net embed page
     */
    private function getWorkingHlsUrl($videoId)
    {
        $embedUrl = "https://iframe.mediadelivery.net/embed/{$this->bunnyLibraryId}/{$videoId}";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $embedUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            return null;
        }
        
        // Extract HLS URL with bcdn_token
        $pattern = '/https:\/\/[^"\']+bcdn_token=[^"\'&]+[^"\']*playlist\.m3u8[^"\']*(?:[^"\']*)/';
        
        if (preg_match($pattern, $response, $matches)) {
            $url = preg_replace('/["\'\s].*$/', '', $matches[0]);
            
            // Test if URL works
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            
            curl_exec($ch);
            $testHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($testHttpCode === 200) {
                return $url;
            }
        }
        
        return null;
    }
    
    /**
     * Get status of HLS URL updates
     */
    public function getStatus(): array
    {
        $lastUpdate = Cache::get('hls_last_update');
        $minInterval = 6 * 60 * 60; // 6 hours
        
        return [
            'last_update' => $lastUpdate ? date('Y-m-d H:i:s', $lastUpdate) : 'Never',
            'next_update' => $lastUpdate ? date('Y-m-d H:i:s', $lastUpdate + $minInterval) : 'Now',
            'needs_update' => !$lastUpdate || (time() - $lastUpdate) >= $minInterval,
            'time_until_next' => $lastUpdate ? max(0, ($lastUpdate + $minInterval) - time()) : 0
        ];
    }
}