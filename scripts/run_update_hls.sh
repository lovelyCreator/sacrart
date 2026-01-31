#!/bin/bash
# Run HLS URL update - use with cron to run every 5 minutes
# This runs INDEPENDENTLY of the Laravel web server

# Change to project directory (adjust path as needed)
cd "$(dirname "$0")/.." || exit 1

# Use PHP from PATH, or specify full path if needed
PHP_BIN=$(which php 2>/dev/null || echo "php")

# Run the Artisan command
$PHP_BIN artisan hls:update >> storage/logs/hls-update.log 2>&1
