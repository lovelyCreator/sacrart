@echo off
REM Run HLS URL update - use with Windows Task Scheduler to run every 5 minutes
REM This runs INDEPENDENTLY of the Laravel web server

cd /d "%~dp0.."

php artisan hls:update >> storage\logs\hls-update.log 2>&1
