<?php

/**
 * Server Startup Script with HLS URL Auto-Update
 * This script starts your Laravel server and sets up periodic HLS URL updates
 * 
 * Usage: php start_server_with_hls_update.php
 */

echo "=== Starting Laravel Server with HLS Auto-Update ===\n\n";

// Check if we're on Windows
$isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';

// Function to run command in background
function runInBackground($command, $isWindows = false) {
    if ($isWindows) {
        // Windows: Use start command to run in background
        $cmd = "start /B {$command}";
        pclose(popen($cmd, 'r'));
    } else {
        // Linux/Mac: Use nohup and &
        $cmd = "nohup {$command} > /dev/null 2>&1 &";
        exec($cmd);
    }
    return $cmd;
}

// 1. Start Laravel development server
echo "1. Starting Laravel development server...\n";
$serverCommand = "php artisan serve --host=0.0.0.0 --port=8000";
$serverCmd = runInBackground($serverCommand, $isWindows);
echo "   Command: {$serverCmd}\n";
echo "   Server will be available at: http://localhost:8000\n\n";

// Wait a moment for server to start
sleep(2);

// 2. Run initial HLS URL update
echo "2. Running initial HLS URL update...\n";
$initialUpdate = shell_exec("php artisan hls:update 2>&1");
echo "   Result: " . trim($initialUpdate) . "\n\n";

// 3. Start Laravel scheduler (for periodic updates)
echo "3. Starting Laravel scheduler for periodic updates...\n";
if ($isWindows) {
    // Windows: Create a batch file for the scheduler
    $batchContent = "@echo off\n";
    $batchContent .= "cd /d \"" . __DIR__ . "\"\n";
    $batchContent .= ":loop\n";
    $batchContent .= "php artisan schedule:run\n";
    $batchContent .= "timeout /t 60 /nobreak >nul\n";
    $batchContent .= "goto loop\n";
    
    file_put_contents('scheduler.bat', $batchContent);
    $schedulerCmd = runInBackground('scheduler.bat', true);
    echo "   Created scheduler.bat for Windows\n";
} else {
    // Linux/Mac: Run scheduler in background
    $schedulerCommand = "while true; do php artisan schedule:run; sleep 60; done";
    $schedulerCmd = runInBackground($schedulerCommand, false);
}
echo "   Scheduler started (runs every minute, updates HLS URLs every 12 hours)\n\n";

// 4. Display status and instructions
echo "=== Server Started Successfully ===\n";
echo "✅ Laravel server: http://localhost:8000\n";
echo "✅ HLS URL auto-update: Every 12 hours (1:00 AM and 1:00 PM)\n";
echo "✅ Laravel scheduler: Running every minute\n\n";

echo "--- Manual Commands ---\n";
echo "Check HLS status:     php artisan hls:update --dry-run\n";
echo "Force HLS update:     php artisan hls:update\n";
echo "Stop server:          Ctrl+C\n\n";

echo "--- API Endpoints ---\n";
echo "HLS Status:           GET  /api/admin/hls/status\n";
echo "Update HLS:           POST /api/admin/hls/update\n";
echo "Force Update HLS:     POST /api/admin/hls/force-update\n\n";

echo "--- Logs ---\n";
echo "Laravel logs:         storage/logs/laravel.log\n";
echo "HLS update logs:      Check Laravel logs for 'HLS' entries\n\n";

// Keep the script running to show logs
echo "=== Live Logs (Press Ctrl+C to stop) ===\n";

// Monitor Laravel logs for HLS updates
$logFile = __DIR__ . '/storage/logs/laravel.log';

if (file_exists($logFile)) {
    // Show last few lines
    $lastLines = shell_exec("tail -n 10 {$logFile}");
    echo $lastLines . "\n";
    
    // Follow the log file
    if ($isWindows) {
        // Windows: Use PowerShell to tail the file
        echo "Monitoring logs... (Press Ctrl+C to stop)\n";
        passthru("powershell -Command \"Get-Content '{$logFile}' -Wait -Tail 0\"");
    } else {
        // Linux/Mac: Use tail -f
        echo "Monitoring logs... (Press Ctrl+C to stop)\n";
        passthru("tail -f {$logFile}");
    }
} else {
    echo "Log file not found. Server is running in background.\n";
    echo "Press Ctrl+C to stop this script (server will continue running).\n";
    
    // Keep script alive
    while (true) {
        sleep(60);
        echo "Server running... " . date('Y-m-d H:i:s') . "\n";
    }
}

?>