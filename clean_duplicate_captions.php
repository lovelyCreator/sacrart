<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Video;
use App\Models\Reel;
use App\Services\BunnyNetService;
use Illuminate\Support\Facades\Log;

echo "=== Cleaning Duplicate Captions from Bunny.net ===\n\n";

$bunnyService = app(BunnyNetService::class);

// Get all videos with Bunny IDs
// Note: Rewinds are collections of videos, not individual videos, so they don't have bunny_video_id
$models = [
    'Video' => Video::whereNotNull('bunny_video_id')->get(),
    'Reel' => Reel::whereNotNull('bunny_video_id')->get(),
];

$totalProcessed = 0;
$totalCleaned = 0;

foreach ($models as $modelType => $collection) {
    echo "Processing {$modelType} models: " . count($collection) . " found\n";
    
    foreach ($collection as $model) {
        $bunnyVideoId = $model->bunny_video_id;
        
        if (!$bunnyVideoId) {
            continue;
        }
        
        echo "\n{$modelType} #{$model->id} (Bunny ID: {$bunnyVideoId})\n";
        echo "  Title: {$model->title}\n";
        
        // Delete ALL existing captions
        echo "  Deleting all existing captions...\n";
        $result = $bunnyService->deleteAllCaptions($bunnyVideoId);
        
        if ($result['success']) {
            echo "  ✅ Deleted {$result['deleted_count']} caption tracks\n";
            $totalCleaned += $result['deleted_count'];
        } else {
            echo "  ⚠️  " . $result['message'] . "\n";
        }
        
        // If model has transcriptions, re-upload with clean labels
        if ($model->transcriptions && is_array($model->transcriptions)) {
            $hasTranscriptions = false;
            foreach (['en', 'es', 'pt'] as $lang) {
                if (isset($model->transcriptions[$lang]['vtt']) && !empty($model->transcriptions[$lang]['vtt'])) {
                    $hasTranscriptions = true;
                    break;
                }
            }
            
            if ($hasTranscriptions) {
                echo "  Re-uploading captions with clean labels (EN, ES, PT)...\n";
                
                foreach (['en', 'es', 'pt'] as $lang) {
                    if (!isset($model->transcriptions[$lang]['vtt']) || empty($model->transcriptions[$lang]['vtt'])) {
                        echo "    ⚠️  No VTT for {$lang}\n";
                        continue;
                    }
                    
                    $vtt = $model->transcriptions[$lang]['vtt'];
                    $label = strtoupper($lang); // EN, ES, PT
                    
                    echo "    Uploading {$label}...\n";
                    $uploadResult = $bunnyService->uploadCaptions(
                        $bunnyVideoId,
                        $vtt,
                        $lang,
                        $label,
                        false // Don't delete again, we already deleted all
                    );
                    
                    if ($uploadResult['success']) {
                        echo "    ✅ {$label} uploaded\n";
                    } else {
                        echo "    ❌ {$label} failed: " . $uploadResult['message'] . "\n";
                    }
                }
            } else {
                echo "  ⚠️  No transcriptions available for re-upload\n";
                echo "  Tip: Process captions for this video in admin panel\n";
            }
        } else {
            echo "  ℹ️  No transcriptions in database\n";
        }
        
        $totalProcessed++;
    }
}

echo "\n=== Summary ===\n";
echo "Total models processed: {$totalProcessed}\n";
echo "Total caption tracks deleted: {$totalCleaned}\n";

echo "\n=== Next Steps ===\n";
echo "1. Check Bunny.net dashboard to verify captions\n";
echo "2. Test video player - CC menu should show only: Disabled, EN, ES, PT\n";
echo "3. If some videos don't have captions, reprocess them in admin panel\n";

echo "\n✅ Done!\n";

