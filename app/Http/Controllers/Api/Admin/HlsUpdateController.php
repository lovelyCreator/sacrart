<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\HlsUpdateService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class HlsUpdateController extends Controller
{
    private $hlsUpdateService;
    
    public function __construct(HlsUpdateService $hlsUpdateService)
    {
        $this->hlsUpdateService = $hlsUpdateService;
    }
    
    /**
     * Get HLS update status
     */
    public function status(): JsonResponse
    {
        try {
            $status = $this->hlsUpdateService->getStatus();
            
            return response()->json([
                'success' => true,
                'data' => $status
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get status: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update HLS URLs if needed
     */
    public function update(): JsonResponse
    {
        try {
            $result = $this->hlsUpdateService->updateIfNeeded();
            
            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Update failed: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Force update HLS URLs
     */
    public function forceUpdate(): JsonResponse
    {
        try {
            $result = $this->hlsUpdateService->forceUpdate();
            
            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Force update failed: ' . $e->getMessage()
            ], 500);
        }
    }
}