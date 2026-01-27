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
        // Update HLS URLs every 12 hours to prevent expiration
        $schedule->command('hls:update')
                 ->twiceDaily(1, 13) // Run at 1:00 AM and 1:00 PM
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Alternative: Run every 6 hours for more frequent updates
        // $schedule->command('hls:update')->everySixHours()->withoutOverlapping()->runInBackground();
        
        // Alternative: Run every 8 hours
        // $schedule->command('hls:update')->cron('0 */8 * * *')->withoutOverlapping()->runInBackground();
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