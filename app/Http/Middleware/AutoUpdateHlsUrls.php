<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\HlsUpdateService;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AutoUpdateHlsUrls
{
    private $hlsUpdateService;
    
    public function __construct(HlsUpdateService $hlsUpdateService)
    {
        $this->hlsUpdateService = $hlsUpdateService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only run on video-related requests to avoid unnecessary overhead
        $videoRoutes = [
            'api/videos',
            'api/reels',
            'api/live-archive-videos'
        ];
        
        $shouldCheck = false;
        foreach ($videoRoutes as $route) {
            if (str_contains($request->path(), $route)) {
                $shouldCheck = true;
                break;
            }
        }
        
        if ($shouldCheck) {
            try {
                // Check if update is needed (this won't update if done recently)
                $this->hlsUpdateService->updateIfNeeded();
            } catch (\Exception $e) {
                // Log error but don't block the request
                Log::warning('Auto HLS update failed: ' . $e->getMessage());
            }
        }

        return $next($request);
    }
}