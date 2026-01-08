<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KidsSetting;
use App\Models\KidsVideo;
use App\Models\KidsResource;
use App\Models\KidsProduct;
use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\App;

class KidsContentController extends Controller
{
    /**
     * Get all kids content (videos, resources, products, settings)
     */
    public function index(Request $request)
    {
        try {
            // Set locale from request header or default to 'en'
            $locale = $request->header('X-Locale', $request->header('Accept-Language', 'en'));
            // Extract language code (e.g., 'en-US' -> 'en')
            $locale = strtolower(substr($locale, 0, 2));
            $locale = in_array($locale, ['en', 'es', 'pt']) ? $locale : 'en';
            App::setLocale($locale);

            // Get hero settings
            $heroVideoId = KidsSetting::get('hero_video_id');
            $heroVideo = null;
            
            if ($heroVideoId) {
                $heroVideo = Video::with(['category', 'series'])->find($heroVideoId);
            }

            // Get kids videos with their video details
            $kidsVideos = KidsVideo::with(['video' => function ($query) {
                $query->where('status', 'published');
            }])
                ->active()
                ->ordered()
                ->get()
                ->filter(function ($kidsVideo) {
                    return $kidsVideo->video !== null;
                })
                ->map(function ($kidsVideo) {
                    return $kidsVideo->video;
                });

            // Get resources (they use HasTranslations trait, so they'll automatically use the locale)
            $resources = KidsResource::active()
                ->ordered()
                ->get();

            // Get products (they use HasTranslations trait, so they'll automatically use the locale)
            $products = KidsProduct::active()
                ->ordered()
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'hero_video' => $heroVideo,
                    'videos' => $kidsVideos,
                    'resources' => $resources,
                    'products' => $products,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids content: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch kids content',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get kids videos only
     */
    public function getVideos()
    {
        try {
            $kidsVideos = KidsVideo::with(['video' => function ($query) {
                $query->where('status', 'published');
            }])
                ->active()
                ->ordered()
                ->get()
                ->filter(function ($kidsVideo) {
                    return $kidsVideo->video !== null;
                })
                ->map(function ($kidsVideo) {
                    return $kidsVideo->video;
                });

            return response()->json([
                'success' => true,
                'data' => $kidsVideos
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids videos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch kids videos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get kids resources only
     */
    public function getResources(Request $request)
    {
        try {
            $query = KidsResource::active()->ordered();

            // Filter by type if provided
            if ($request->has('type')) {
                $query->ofType($request->type);
            }

            $resources = $query->get();

            return response()->json([
                'success' => true,
                'data' => $resources
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids resources: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch kids resources',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download a resource
     */
    public function downloadResource($id)
    {
        try {
            $resource = KidsResource::findOrFail($id);
            
            // Increment download count
            $resource->incrementDownloads();

            // Return download URL or file
            if ($resource->file_url) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'url' => $resource->file_url,
                        'filename' => basename($resource->file_path),
                    ]
                ]);
            }

            // If file is stored locally, return file download
            $filePath = storage_path('app/public/' . $resource->file_path);
            
            if (file_exists($filePath)) {
                return response()->download($filePath);
            }

            return response()->json([
                'success' => false,
                'message' => 'File not found'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Error downloading resource: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to download resource',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get kids products only
     */
    public function getProducts(Request $request)
    {
        try {
            $query = KidsProduct::active()->ordered();

            // Filter by featured if requested
            if ($request->has('featured') && $request->featured) {
                $query->featured();
            }

            // Filter by in stock
            if ($request->has('in_stock') && $request->in_stock) {
                $query->inStock();
            }

            $products = $query->get();

            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids products: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch kids products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single product
     */
    public function getProduct($id)
    {
        try {
            $product = KidsProduct::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $product
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching product: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Get hero video
     */
    public function getHeroVideo()
    {
        try {
            $heroVideoId = KidsSetting::get('hero_video_id');
            
            if (!$heroVideoId) {
                return response()->json([
                    'success' => true,
                    'data' => null,
                    'message' => 'No hero video set'
                ]);
            }

            $heroVideo = Video::with(['category', 'series'])->find($heroVideoId);

            return response()->json([
                'success' => true,
                'data' => $heroVideo
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching hero video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch hero video',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
