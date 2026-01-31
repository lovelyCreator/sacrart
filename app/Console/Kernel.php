<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Update HLS URLs every 5 minutes to prevent token expiration
        // Runs independently when triggered by: * * * * * php artisan schedule:run
        $schedule->command('hls:update')
                 ->everyFiveMinutes()
                 ->withoutOverlapping(10) // Prevent overlap if previous run takes > 10 min
                 ->runInBackground()
                 ->appendOutputTo(storage_path('logs/hls-update.log'));
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}