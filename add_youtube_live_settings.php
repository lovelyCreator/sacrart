<?php

/**
 * Script to add YouTube Live settings to site_settings table
 * Run this with: php add_youtube_live_settings.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\SiteSetting;

try {
    echo "Adding YouTube Live settings...\n";

    // YouTube Live Video URL (current live stream URL)
    SiteSetting::updateOrCreate(
        ['key' => 'youtube_live_video_url'],
        [
            'value' => '',
            'type' => 'text',
            'group' => 'live',
            'label' => 'YouTube Live Video URL',
            'description' => 'Enter the YouTube video URL or ID for the current live stream. Leave empty when not streaming.',
            'is_active' => true,
            'sort_order' => 1,
        ]
    );
    echo "✓ youtube_live_video_url setting added\n";

    // YouTube Channel ID
    SiteSetting::updateOrCreate(
        ['key' => 'youtube_channel_id'],
        [
            'value' => '',
            'type' => 'text',
            'group' => 'live',
            'label' => 'YouTube Channel ID',
            'description' => 'Your YouTube channel ID (e.g., UCxxxxx) or handle (@yourhandle)',
            'is_active' => true,
            'sort_order' => 2,
        ]
    );
    echo "✓ youtube_channel_id setting added\n";

    // YouTube Channel URL
    SiteSetting::updateOrCreate(
        ['key' => 'youtube_channel_url'],
        [
            'value' => '',
            'type' => 'text',
            'group' => 'live',
            'label' => 'YouTube Channel URL',
            'description' => 'Your full YouTube channel URL (e.g., https://youtube.com/@yourhandle)',
            'is_active' => true,
            'sort_order' => 3,
        ]
    );
    echo "✓ youtube_channel_url setting added\n";

    // YouTube Live Enabled
    SiteSetting::updateOrCreate(
        ['key' => 'youtube_live_enabled'],
        [
            'value' => '0',
            'type' => 'boolean',
            'group' => 'live',
            'label' => 'YouTube Live Enabled',
            'description' => 'Enable/disable the live stream. Turn this ON when you are streaming live.',
            'is_active' => true,
            'sort_order' => 4,
        ]
    );
    echo "✓ youtube_live_enabled setting added\n";

    echo "\n✅ YouTube Live settings successfully added!\n\n";
    echo "You can now configure these settings in the Admin Panel > Settings > Live tab.\n\n";
    echo "To start a live stream:\n";
    echo "1. Start your YouTube live stream\n";
    echo "2. Go to Admin Panel > Settings > Live\n";
    echo "3. Enter the YouTube video URL/ID\n";
    echo "4. Enable 'YouTube Live Enabled' switch\n";
    echo "5. Save changes\n\n";
    echo "Users will now see the live stream at /live\n";

} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
