@echo off
cd /d "D:\work\project\workana\ana-rey-video"
:loop
php artisan schedule:run
timeout /t 60 /nobreak >nul
goto loop
