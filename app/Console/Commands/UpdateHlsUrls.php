<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UpdateHlsUrls extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'hls:update {--dry-run : Show what would be updated without making changes}';

    /**
     * The console command description.
     */
    protected $description = 'Update HLS URLs from Bunny.net to prevent expiration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        $this->info('=== Updating HLS URLs from Bunny.net ===');
        
        if ($dryRun) {
            $this->warn('DRY RUN MODE - No database changes will be made');
        }
        
        // Get Bunny.net configuration
        $bunnyLibraryId = config('services.bunny.library_id');
        
        if (empty($bunnyLibraryId)) {
            $this->error('Missing BUNNY_LIBRARY_ID configuration');
            return 1;
        }
        
        $this->info("Bunny Library ID: {$bunnyLibraryId}");
        
        // Get all video IDs from database
        $tables = ['videos', 'reels', 'live_archive_videos'];
        $allRecords = [];
        
        foreach ($tables as $table) {
            $records = DB::table($table)
                ->whereNotNull('bunny_video_id')
                ->where('bunny_video_id', '!=', '')
                ->select('id', 'title', 'bunny_video_id')
                ->get();
            
            foreach ($records as $record) {
                $allRecords[] = [
                    'table' => $table,
                    'record_id' => $record->id,
                    'title' => $record->title,
                    'bunny_video_id' => $record->bunny_video_id
                ];
            }
        }
        
        $this->info("Found " . count($allRecords) . " records with bunny_video_id");
        
        // Get unique video IDs
        $uniqueVideoIds = array_unique(array_column($allRecords, 'bunny_video_id'));
        $this->info("Unique video IDs: " . count($uniqueVideoIds));
        
        // Progress bar
        $progressBar = $this->output->createProgressBar(count($uniqueVideoIds));
        $progressBar->start();
        
        $newHlsUrls = [];
        
        foreach ($uniqueVideoIds as $videoId) {
            $hlsUrl = $this->getWorkingHlsUrl($videoId, $bunnyLibraryId);
            
            if ($hlsUrl) {
                $newHlsUrls[$videoId] = $hlsUrl;
            } else {
                Log::warning("Failed to get HLS URL for video: {$videoId}");
            }
            
            $progressBar->advance();
            sleep(1); // Be respectful to the API
        }
        
        $progressBar->finish();
        $this->newLine();
        
        $this->info("Generated " . count($newHlsUrls) . " new HLS URLs");
        
        if (empty($newHlsUrls)) {
            $this->error("No HLS URLs obtained. Exiting.");
            return 1;
        }
        
        // Update database
        $stats = [
            'videos' => ['updated' => 0, 'errors' => 0],
            'reels' => ['updated' => 0, 'errors' => 0],
            'live_archive_videos' => ['updated' => 0, 'errors' => 0],
        ];
        
        foreach ($allRecords as $record) {
            $table = $record['table'];
            $recordId = $record['record_id'];
            $title = $record['title'];
            $videoId = $record['bunny_video_id'];
            
            if (isset($newHlsUrls[$videoId])) {
                $newUrl = $newHlsUrls[$videoId];
                
                if (!$dryRun) {
                    try {
                        $updated = DB::table($table)
                            ->where('id', $recordId)
                            ->update([
                                'bunny_hls_url' => $newUrl,
                                'updated_at' => now(),
                            ]);
                        
                        if ($updated) {
                            $stats[$table]['updated']++;
                        } else {
                            $stats[$table]['errors']++;
                        }
                        
                    } catch (\Exception $e) {
                        $stats[$table]['errors']++;
                        Log::error("Error updating HLS URL for {$table} ID {$recordId}: " . $e->getMessage());
                    }
                } else {
                    $stats[$table]['updated']++;
                    $this->line("Would update {$table} ID {$recordId}: {$title}");
                }
            } else {
                $stats[$table]['errors']++;
            }
        }
        
        // Display results
        $this->newLine();
        $this->info('=== Results ===');
        
        $totalUpdated = 0;
        $totalErrors = 0;
        
        foreach ($stats as $table => $tableStats) {
            $this->line("{$table}: {$tableStats['updated']} updated, {$tableStats['errors']} errors");
            $totalUpdated += $tableStats['updated'];
            $totalErrors += $tableStats['errors'];
        }
        
        $this->info("Total: {$totalUpdated} updated, {$totalErrors} errors");
        
        if ($dryRun) {
            $this->warn("This was a DRY RUN - no database changes were made");
        } else {
            Log::info("HLS URLs updated: {$totalUpdated} success, {$totalErrors} errors");
            
            if ($totalUpdated > 0) {
                $this->info("✅ Successfully updated {$totalUpdated} HLS URLs!");
            }
        }
        
        return $totalErrors > 0 ? 1 : 0;
    }
    
    /**
     * Get working HLS URL from Bunny.net embed page
     */
    private function getWorkingHlsUrl($videoId, $libraryId)
    {
        $embedUrl = "https://iframe.mediadelivery.net/embed/{$libraryId}/{$videoId}";
        
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
}