<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reel;
use App\Services\WebpConversionService;
use App\Services\BunnyNetService;
use App\Services\VideoTranscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class ReelController extends Controller
{
    protected $webpService;
    protected $bunnyNetService;
    protected $transcriptionService;

    public function __construct(
        WebpConversionService $webpService,
        BunnyNetService $bunnyNetService,
        VideoTranscriptionService $transcriptionService
    ) {
        $this->webpService = $webpService;
        $this->bunnyNetService = $bunnyNetService;
        $this->transcriptionService = $transcriptionService;
    }

    /**
     * Extract Bunny.net video ID from embed URL or video ID
     */
    private function extractBunnyVideoId(?string $embedUrl, ?string $videoId, ?string $hlsUrl = null): ?string
    {
        if ($videoId) {
            return $videoId;
        }
        
        // If HLS URL is provided, extract video ID from it (priority)
        if ($hlsUrl) {
            // Format 1: Extract from token_path parameter (URL encoded or not)
            // Example: token_path=%2Ff70e8def-51c2-4998-84e4-090a30bc3fc6%2F or token_path=/f70e8def-51c2-4998-84e4-090a30bc3fc6/
            if (preg_match('/token_path=(?:%2F|%252F)?([a-f0-9\-]{36})(?:%2F|%252F)?/', $hlsUrl, $matches)) {
                return $matches[1];
            }
            
            // Format 2: Extract from path before playlist.m3u8 (with or without query params)
            // Example: /f70e8def-51c2-4998-84e4-090a30bc3fc6/playlist.m3u8 or /f70e8def-51c2-4998-84e4-090a30bc3fc6/playlist.m3u8?token=...
            if (preg_match('/\/([a-f0-9\-]{36})\/playlist\.m3u8/', $hlsUrl, $matches)) {
                return $matches[1];
            }
            
            // Format 3: https://video.bunnycdn.com/{libraryId}/{videoId}/playlist.m3u8
            if (preg_match('/\/\d+\/([a-f0-9\-]{36})\/playlist\.m3u8/', $hlsUrl, $matches)) {
                return $matches[1];
            }
            
            // Format 4: Any UUID in the path (fallback)
            if (preg_match('/\/([a-f0-9\-]{36})\//', $hlsUrl, $matches)) {
                return $matches[1];
            }
        }
        
        if ($embedUrl) {
            // Extract video ID from Bunny.net embed URL
            // Format: https://iframe.mediadelivery.net/embed/{videoId}
            if (preg_match('/mediadelivery\.net\/embed\/([a-zA-Z0-9_-]+)/', $embedUrl, $matches)) {
                return $matches[1];
            }
            // Also check for other Bunny.net URL formats
            if (preg_match('/bunnycdn\.com\/[^\/]+\/([a-zA-Z0-9_-]+)/', $embedUrl, $matches)) {
                return $matches[1];
            }
        }
        
        return null;
    }

    /**
     * Display a listing of reels.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        $query = Reel::with(['instructor', 'category']);

        $isAdminRequest = $request->is('api/admin/*');

        if (!$isAdminRequest) {
            if ($user) {
                $subscriptionType = $user->subscription_type ?: 'freemium';
                $query->visibleTo($subscriptionType);
            } else {
                $query->where('visibility', 'freemium');
            }
        }

        // Filter by category_tag
        if ($request->has('category_tag')) {
            $query->where('category_tag', $request->get('category_tag'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        } else if (!$isAdminRequest) {
            $query->published();
        }

        // Filter by visibility
        if ($request->has('visibility')) {
            $query->where('visibility', $request->get('visibility'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'sort_order');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 15);
        $reels = $query->paginate($perPage);

        // Load translations for admin requests
        if ($isAdminRequest) {
            foreach ($reels->items() as $reel) {
                $reel->translations = $reel->getAllTranslations();
                // Also load category translations if category exists
                if ($reel->category) {
                    $reel->category->translations = $reel->category->getAllTranslations();
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $reels,
        ]);
    }

    /**
     * Store a newly created reel.
     */
    public function store(Request $request): JsonResponse
    {
        $requestData = $request->all();
        
        // Handle tags
        if ($request->has('tags') && is_string($request->get('tags'))) {
            try {
                $decoded = json_decode($request->get('tags'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['tags'] = $decoded;
                } else {
                    $tags = array_filter(array_map('trim', explode(',', $request->get('tags'))));
                    $requestData['tags'] = !empty($tags) ? array_values($tags) : null;
                }
            } catch (\Exception $e) {
                $requestData['tags'] = null;
            }
        }
        
        // Handle multilingual translations before validation
        $translations = $request->input('translations');
        if (is_string($translations)) {
            $decoded = json_decode($translations, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $requestData['translations'] = $decoded;
            } else {
                $requestData['translations'] = null;
            }
        } else if (is_array($translations)) {
            $requestData['translations'] = $translations;
        } else {
            $requestData['translations'] = null;
        }
        
        // Normalize empty strings to null for URL fields
        if ($request->has('bunny_hls_url') && $request->get('bunny_hls_url') === '') {
            $requestData['bunny_hls_url'] = null;
        }
        if ($request->has('bunny_embed_url') && $request->get('bunny_embed_url') === '') {
            $requestData['bunny_embed_url'] = null;
        }
        if ($request->has('bunny_video_url') && $request->get('bunny_video_url') === '') {
            $requestData['bunny_video_url'] = null;
        }
        
        $request->merge($requestData);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'bunny_video_id' => 'nullable|string|max:255',
            'bunny_video_url' => 'nullable|url|max:500',
            'bunny_embed_url' => 'nullable|url|max:500',
            'bunny_hls_url' => 'nullable|string|max:1000', // HLS URL for video playback
            'bunny_thumbnail_url' => 'nullable|url|max:500',
            'video_url' => 'nullable|url|max:255',
            'video_file_path' => 'nullable|string|max:255',
            'thumbnail' => 'nullable|string|max:255',
            'intro_image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'intro_image' => 'nullable|string|max:255',
            'file_size' => 'nullable|integer|min:0',
            'video_format' => 'nullable|string|max:50',
            'video_quality' => 'nullable|string|max:50',
            'visibility' => 'required|in:freemium,basic,premium',
            'status' => 'nullable|in:draft,published,archived',
            'is_free' => 'nullable|boolean',
            'price' => 'nullable|numeric|min:0',
            'category_id' => 'nullable|exists:reel_categories,id',
            'category_tag' => 'nullable|string|max:50',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'sort_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'translations' => 'nullable|array',
        ]);

        // Handle multilingual translations
        $translations = $validated['translations'] ?? null;

        if ($translations && is_array($translations)) {
            if (isset($translations['title'])) {
                $validated['title_en'] = $translations['title']['en'] ?? $validated['title'] ?? '';
                $validated['title_es'] = $translations['title']['es'] ?? '';
                $validated['title_pt'] = $translations['title']['pt'] ?? '';
            }
            if (isset($translations['description'])) {
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
            }
            if (isset($translations['short_description'])) {
                $validated['short_description_en'] = $translations['short_description']['en'] ?? $validated['short_description'] ?? '';
                $validated['short_description_es'] = $translations['short_description']['es'] ?? '';
                $validated['short_description_pt'] = $translations['short_description']['pt'] ?? '';
            }
        } else {
            // If no translations, use main fields for English
            $validated['title_en'] = $validated['title'] ?? '';
            $validated['description_en'] = $validated['description'] ?? '';
            $validated['short_description_en'] = $validated['short_description'] ?? '';
        }

        // Generate slug from English title
        $validated['slug'] = Str::slug($validated['title_en'] ?? $validated['title'] ?? '');
        $validated['instructor_id'] = Auth::id();

        // Handle intro image file upload
        if ($request->hasFile('intro_image_file')) {
            try {
                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('intro_image_file'),
                    'reels/image'
                );
                $validated['intro_image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload intro image: ' . $e->getMessage(),
                ], 500);
            }
        }

        if (!isset($validated['status'])) {
            $validated['status'] = 'draft';
        }

        if ($validated['status'] === 'published') {
            $validated['published_at'] = now();
        }

        if (!isset($validated['sort_order'])) {
            $lastSortOrder = Reel::orderBy('sort_order', 'desc')->first();
            $validated['sort_order'] = $lastSortOrder ? $lastSortOrder->sort_order + 1 : 1;
        }

        // Always extract duration from Bunny.net if bunny_embed_url or bunny_video_id is provided
        if (isset($validated['bunny_embed_url']) || isset($validated['bunny_video_id'])) {
            $bunnyVideoId = $this->extractBunnyVideoId(
                $validated['bunny_embed_url'] ?? null,
                $validated['bunny_video_id'] ?? null
            );
            
            if ($bunnyVideoId) {
                try {
                    $bunnyMetadata = $this->bunnyNetService->getVideo($bunnyVideoId);
                    if ($bunnyMetadata['success'] && isset($bunnyMetadata['duration']) && $bunnyMetadata['duration'] > 0) {
                        $validated['duration'] = (int) $bunnyMetadata['duration'];
                        \Log::info('Auto-extracted duration from Bunny.net API on create', [
                            'video_id' => $bunnyVideoId,
                            'duration' => $validated['duration'],
                        ]);
                    } else {
                        \Log::warning('Bunny.net video metadata does not contain duration', [
                            'video_id' => $bunnyVideoId,
                        ]);
                        $validated['duration'] = 0;
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to auto-extract duration from Bunny.net on create', [
                        'video_id' => $bunnyVideoId,
                        'error' => $e->getMessage(),
                    ]);
                    $validated['duration'] = 0;
                }
            }
        } else {
            $validated['duration'] = 0;
        }

        // Remove translations from validated as it's not a model field
        unset($validated['translations']);

        $reel = Reel::create($validated);
        
        // Load relationships
        $reel->load(['instructor', 'category']);
        
        // Load category translations if category exists
        if ($reel->category) {
            $reel->category->translations = $reel->category->getAllTranslations();
        }
        
        // Load all translations for the response
        $reel->translations = $reel->getAllTranslations();

        return response()->json([
            'success' => true,
            'message' => 'Reel created successfully.',
            'data' => $reel,
        ], 201);
    }

    /**
     * Display the specified reel.
     */
    /**
     * Get HLS URL for reel playback
     */
    public function getHlsUrl(Request $request, Reel $reel): JsonResponse
    {
        $user = Auth::user();

        if (!$reel->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this reel.',
            ], 403);
        }

        // Get language preference from request or default to 'en'
        $language = $request->input('language', 'en');
        $language = in_array($language, ['en', 'es', 'pt']) ? $language : 'en';

        // Get Bunny.net video ID
        $bunnyVideoId = $reel->bunny_video_id;
        
        if (!$bunnyVideoId) {
            // Try to extract from embed URL
            $bunnyVideoId = $this->extractBunnyVideoId($reel->bunny_embed_url, null);
        }

        if (!$bunnyVideoId) {
            return response()->json([
                'success' => false,
                'message' => 'Bunny.net video ID not found.',
            ], 404);
        }

        // Get HLS URL from BunnyNetService
        try {
            $hlsUrl = $this->bunnyNetService->getSignedTranscriptionUrl($bunnyVideoId, 60, $language);
            
            if (!$hlsUrl) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to generate HLS URL.',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'hls_url' => $hlsUrl,
                'reel_id' => $reel->id,
                'bunny_video_id' => $bunnyVideoId,
                'language' => $language,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error generating HLS URL for reel', [
                'reel_id' => $reel->id,
                'bunny_video_id' => $bunnyVideoId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate HLS URL: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(Reel $reel): JsonResponse
    {
        $user = Auth::user();

        if (!$reel->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this reel.',
            ], 403);
        }

        $reel->load(['instructor', 'category']);
        if ($user && $user->isAdmin()) {
            $reel->translations = $reel->getAllTranslations();
        }
        // Load category translations for public API
        if ($reel->category) {
            $reel->category->translations = $reel->category->getAllTranslations();
            
            // Load all reels from the same category (including current reel)
            $subscriptionType = $user ? ($user->subscription_type ?: 'freemium') : 'freemium';
            $categoryReels = Reel::where('category_id', $reel->category_id)
                ->visibleTo($subscriptionType)
                ->published()
                ->orderBy('sort_order', 'asc')
                ->get();
            
            // Load translations for category reels
            foreach ($categoryReels as $categoryReel) {
                $categoryReel->translations = $categoryReel->getAllTranslations();
            }
        }
        $reel->incrementViews();

        // Prepare response data with category_reels
        $responseData = $reel->toArray();
        if ($reel->category && isset($categoryReels)) {
            $responseData['category_reels'] = $categoryReels->toArray();
        }

        return response()->json([
            'success' => true,
            'data' => $responseData,
        ]);
    }

    /**
     * Update the specified reel.
     */
    public function update(Request $request, Reel $reel): JsonResponse
    {
        \Log::info('🔵 [Backend] Reel update request received', [
            'reel_id' => $reel->id,
            'request_data' => $request->all(),
            'content_type' => $request->header('Content-Type'),
            'method' => $request->method(),
        ]);

        $requestData = $request->all();
        
        // Handle tags
        if ($request->has('tags') && is_string($request->get('tags'))) {
            try {
                $decoded = json_decode($request->get('tags'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['tags'] = $decoded;
                } else {
                    $tags = array_filter(array_map('trim', explode(',', $request->get('tags'))));
                    $requestData['tags'] = !empty($tags) ? array_values($tags) : null;
                }
            } catch (\Exception $e) {
                $requestData['tags'] = null;
            }
        }
        
        // Handle multilingual translations before validation
        $translations = $request->input('translations');
        if (is_string($translations)) {
            $decoded = json_decode($translations, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $requestData['translations'] = $decoded;
            } else {
                $requestData['translations'] = null;
            }
        } else if (is_array($translations)) {
            $requestData['translations'] = $translations;
        } else {
            $requestData['translations'] = null;
        }
        
        // Normalize empty strings to null for URL fields
        if ($request->has('bunny_hls_url') && $request->get('bunny_hls_url') === '') {
            $requestData['bunny_hls_url'] = null;
        }
        if ($request->has('bunny_embed_url') && $request->get('bunny_embed_url') === '') {
            $requestData['bunny_embed_url'] = null;
        }
        if ($request->has('bunny_video_url') && $request->get('bunny_video_url') === '') {
            $requestData['bunny_video_url'] = null;
        }
        
        $request->merge($requestData);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'bunny_video_id' => 'nullable|string|max:255',
            'bunny_video_url' => 'nullable|url|max:500',
            'bunny_embed_url' => 'nullable|url|max:500',
            'bunny_hls_url' => 'nullable|string|max:1000', // HLS URL for video playback
            'bunny_thumbnail_url' => 'nullable|url|max:500',
            'video_url' => 'nullable|url|max:255',
            'video_file_path' => 'nullable|string|max:255',
            'thumbnail' => 'nullable|string|max:255',
            'intro_image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'intro_image' => 'nullable|string|max:255',
            'file_size' => 'nullable|integer|min:0',
            'video_format' => 'nullable|string|max:50',
            'video_quality' => 'nullable|string|max:50',
            'visibility' => 'nullable|in:freemium,basic,premium',
            'status' => 'nullable|in:draft,published,archived',
            'is_free' => 'nullable|boolean',
            'price' => 'nullable|numeric|min:0',
            'category_id' => 'nullable|exists:reel_categories,id',
            'category_tag' => 'nullable|string|max:50',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'sort_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'translations' => 'nullable|array',
        ]);

        // Handle multilingual translations
        $translations = $validated['translations'] ?? null;

        if ($translations && is_array($translations)) {
            if (isset($translations['title'])) {
                $validated['title_en'] = $translations['title']['en'] ?? $validated['title'] ?? $reel->title_en ?? '';
                $validated['title_es'] = $translations['title']['es'] ?? '';
                $validated['title_pt'] = $translations['title']['pt'] ?? '';
            }
            if (isset($translations['description'])) {
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? $reel->description_en ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
            }
            if (isset($translations['short_description'])) {
                $validated['short_description_en'] = $translations['short_description']['en'] ?? $validated['short_description'] ?? $reel->short_description_en ?? '';
                $validated['short_description_es'] = $translations['short_description']['es'] ?? '';
                $validated['short_description_pt'] = $translations['short_description']['pt'] ?? '';
            }
        }

        if (isset($validated['title']) || isset($validated['title_en'])) {
            $validated['slug'] = Str::slug($validated['title_en'] ?? $validated['title'] ?? $reel->title_en ?? $reel->title ?? '');
        }

        // Handle intro image file upload
        if ($request->hasFile('intro_image_file')) {
            try {
                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('intro_image_file'),
                    'reels/image'
                );
                $validated['intro_image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload intro image: ' . $e->getMessage(),
                ], 500);
            }
        }

        if (isset($validated['status']) && $validated['status'] === 'published' && !$reel->published_at) {
            $validated['published_at'] = now();
        }

        // Always extract duration from Bunny.net if bunny_embed_url or bunny_video_id is provided
        if (isset($validated['bunny_embed_url']) || isset($validated['bunny_video_id'])) {
            $bunnyVideoId = $this->extractBunnyVideoId(
                $validated['bunny_embed_url'] ?? null,
                $validated['bunny_video_id'] ?? null
            );
            
            if ($bunnyVideoId) {
                try {
                    $bunnyMetadata = $this->bunnyNetService->getVideo($bunnyVideoId);
                    if ($bunnyMetadata['success'] && isset($bunnyMetadata['duration']) && $bunnyMetadata['duration'] > 0) {
                        $validated['duration'] = (int) $bunnyMetadata['duration'];
                        \Log::info('Auto-extracted duration from Bunny.net API on update', [
                            'video_id' => $bunnyVideoId,
                            'duration' => $validated['duration'],
                        ]);
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to auto-extract duration from Bunny.net on update', [
                        'video_id' => $bunnyVideoId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        // Remove translations from validated as it's not a model field
        unset($validated['translations']);

        $reel->update($validated);
        
        // Refresh the model to ensure we have the latest data
        $reel->refresh();
        
        // Reload the reel with relationships (this will load the updated category)
        $reel->load(['instructor', 'category']);
        
        // Load category translations if category exists
        if ($reel->category) {
            $reel->category->translations = $reel->category->getAllTranslations();
        }
        
        // Load all translations for the response
        $reel->translations = $reel->getAllTranslations();

        \Log::info('🔵 [Backend] Reel updated successfully', [
            'reel_id' => $reel->id,
            'updated_reel' => $reel->toArray(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reel updated successfully.',
            'data' => $reel,
        ]);
    }

    /**
     * Remove the specified reel.
     */
    public function destroy(Reel $reel): JsonResponse
    {
        $reel->delete();

        return response()->json([
            'success' => true,
            'message' => 'Reel deleted successfully.',
        ]);
    }

    /**
     * Get public reels (for frontend)
     */
    public function getPublic(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        $query = Reel::with(['instructor', 'category']);

        if ($user) {
            $subscriptionType = $user->subscription_type ?: 'freemium';
            $query->visibleTo($subscriptionType);
        } else {
            $query->where('visibility', 'freemium');
        }

        $query->published();

        // Filter by category_tag
        if ($request->has('category_tag')) {
            $query->where('category_tag', $request->get('category_tag'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'sort_order');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 100);
        $reels = $query->paginate($perPage);

        // Load category translations for public API
        foreach ($reels->items() as $reel) {
            if ($reel->category) {
                $reel->category->translations = $reel->category->getAllTranslations();
            }
        }

        return response()->json([
            'success' => true,
            'data' => $reels,
        ]);
    }

    /**
     * Process reel transcription and upload captions for multiple languages
     * This endpoint triggers Deepgram transcription and uploads captions to Bunny.net
     * 
     * @param int $id Reel ID
     * @return JsonResponse
     */
    public function processTranscription(Request $request, $id): JsonResponse
    {
        // Only admins can trigger transcription processing
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $reel = Reel::findOrFail($id);

        $validated = $request->validate([
            'languages' => 'nullable|array',
            'languages.*' => 'string|in:en,es,pt,fr,de,it',
            'source_language' => 'nullable|string|in:en,es,pt,fr,de,it',
        ]);

        $languages = $validated['languages'] ?? ['en', 'es', 'pt'];
        $sourceLanguage = $validated['source_language'] ?? 'en';

        try {
            $result = $this->transcriptionService->processVideoTranscription(
                $reel,
                $languages,
                $sourceLanguage
            );

            return response()->json($result, $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            \Log::error('Reel transcription processing exception', [
                'reel_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process transcription: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get caption download URLs for a reel
     * 
     * @param Request $request
     * @param Reel $reel
     * @return JsonResponse
     */
    public function getCaptionDownloadUrls(Request $request, Reel $reel): JsonResponse
    {
        try {
            // Get Bunny.net video ID
            $bunnyVideoId = $reel->bunny_video_id;
            
            if (!$bunnyVideoId && $reel->bunny_embed_url) {
                // Extract video ID from embed URL
                $embedUrl = $reel->bunny_embed_url;
                if (preg_match('/\/embed\/[^\/]+\/([^\/\?]+)/', $embedUrl, $matches)) {
                    $bunnyVideoId = $matches[1];
                } elseif (preg_match('/([a-f0-9\-]{36})/', $embedUrl, $matches)) {
                    $bunnyVideoId = $matches[1];
                }
            }

            if (!$bunnyVideoId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No Bunny.net video ID found for this reel.',
                ], 404);
            }

            // Generate caption download URLs
            $captionUrls = $this->bunnyNetService->generateCaptionDownloadUrls($bunnyVideoId);

            return response()->json([
                'success' => true,
                'data' => [
                    'reel_id' => $reel->id,
                    'bunny_video_id' => $bunnyVideoId,
                    'caption_urls' => $captionUrls,
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('Error getting caption download URLs', [
                'reel_id' => $reel->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get caption download URLs: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get subtitles/transcriptions for a reel
     */
    public function getSubtitles(Request $request, Reel $reel): JsonResponse
    {
        $user = Auth::user();

        // Check access permissions
        if (!$reel->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this reel.',
            ], 403);
        }

        $locale = $request->input('locale', 'en');
        
        // Get transcription based on locale
        // First try new JSON format, then fall back to old fields
        $transcription = null;
        $transcriptions = $reel->transcriptions; // JSON field
        
        // Enhanced logging to debug transcription structure
        \Log::debug('Reel getSubtitles - Starting transcription extraction', [
            'reel_id' => $reel->id,
            'requested_locale' => $locale,
            'transcriptions_exists' => !is_null($transcriptions),
            'transcriptions_type' => gettype($transcriptions),
            'transcriptions_is_array' => is_array($transcriptions),
            'available_locales' => is_array($transcriptions) ? array_keys($transcriptions) : [],
            'transcriptions_structure' => is_array($transcriptions) ? array_map(function($item) {
                if (is_array($item)) {
                    return array_keys($item);
                }
                return gettype($item);
            }, $transcriptions) : null,
        ]);
        
        if ($transcriptions && is_array($transcriptions) && isset($transcriptions[$locale])) {
            $localeData = $transcriptions[$locale];
            
            // Check if transcription is stored as array with 'text' field (new format)
            if (is_array($localeData)) {
                if (isset($localeData['text'])) {
                    $textValue = $localeData['text'];
                    if (!empty($textValue) && is_string($textValue) && trim($textValue) !== '') {
                        $transcription = trim($textValue);
                        \Log::debug("Found transcription for locale '{$locale}' in 'text' field", [
                            'reel_id' => $reel->id,
                            'text_length' => strlen($transcription),
                            'text_preview' => substr($transcription, 0, 100),
                        ]);
                    } else {
                        \Log::warning("Transcription for locale '{$locale}' has empty or invalid 'text' field", [
                            'reel_id' => $reel->id,
                            'text_type' => gettype($textValue),
                            'text_is_empty' => empty($textValue),
                            'text_is_string' => is_string($textValue),
                            'text_trimmed_length' => is_string($textValue) ? strlen(trim($textValue)) : 0,
                        ]);
                        // Try to fallback to other languages
                    }
                } elseif (isset($localeData['error'])) {
                    \Log::warning("Transcription for locale '{$locale}' has error", [
                        'reel_id' => $reel->id,
                        'error' => $localeData['error'],
                    ]);
                    // Try to fallback to other languages
                } else {
                    \Log::warning("Transcription for locale '{$locale}' exists but 'text' field is missing", [
                        'reel_id' => $reel->id,
                        'available_keys' => array_keys($localeData),
                    ]);
                }
            } else {
                // Direct string value (old format)
                $transcription = $localeData;
                \Log::debug("Found transcription for locale '{$locale}' as direct string", [
                    'reel_id' => $reel->id,
                    'text_length' => strlen($transcription),
                ]);
            }
        }
        
        // If transcription is empty, try fallback languages in order: en, es, pt
        if (empty($transcription) && $transcriptions && is_array($transcriptions)) {
            $fallbackLocales = ['en', 'es', 'pt'];
            foreach ($fallbackLocales as $fallbackLocale) {
                if ($fallbackLocale === $locale) {
                    continue; // Skip the requested locale
                }
                
                if (isset($transcriptions[$fallbackLocale])) {
                    $fallbackData = $transcriptions[$fallbackLocale];
                    
                    if (is_array($fallbackData) && isset($fallbackData['text']) && !empty($fallbackData['text'])) {
                        $transcription = $fallbackData['text'];
                        \Log::info("Using fallback transcription from locale '{$fallbackLocale}'", [
                            'reel_id' => $reel->id,
                            'requested_locale' => $locale,
                            'fallback_locale' => $fallbackLocale,
                            'text_length' => strlen($transcription),
                        ]);
                        break;
                    } elseif (!is_array($fallbackData) && !empty($fallbackData)) {
                        $transcription = $fallbackData;
                        \Log::info("Using fallback transcription (string) from locale '{$fallbackLocale}'", [
                            'reel_id' => $reel->id,
                            'requested_locale' => $locale,
                            'fallback_locale' => $fallbackLocale,
                            'text_length' => strlen($transcription),
                        ]);
                        break;
                    }
                }
            }
        }

        // Debug logging
        \Log::debug('Reel getSubtitles API response', [
            'reel_id' => $reel->id,
            'locale' => $locale,
            'transcription_found' => !empty($transcription),
            'transcription_type' => gettype($transcription),
            'transcription_is_array' => is_array($transcription),
            'transcription_length' => is_string($transcription) ? strlen($transcription) : (is_array($transcription) ? count($transcription) : 0),
            'transcription_preview' => is_string($transcription) ? substr($transcription, 0, 100) : (is_array($transcription) ? json_encode(array_slice($transcription, 0, 5)) : ''),
        ]);

        // CRITICAL FIX: Ensure transcription is always a string, never an array!
        if (is_array($transcription)) {
            \Log::error('Reel transcription is an array in API response! Converting to string.', [
                'reel_id' => $reel->id,
                'locale' => $locale,
                'array_count' => count($transcription),
                'first_elements' => array_slice($transcription, 0, 5),
            ]);
            
            // If it's an array of words, join them into a sentence
            $transcription = implode(' ', array_map(function($item) {
                if (is_string($item)) {
                    return $item;
                } elseif (is_array($item) && isset($item['word'])) {
                    return $item['word'];
                } elseif (is_array($item) && isset($item['punctuated_word'])) {
                    return $item['punctuated_word'];
                } else {
                    return '';
                }
            }, $transcription));
        }

        // Ensure we have a string
        $transcription = is_string($transcription) ? $transcription : '';

        // Convert transcription to WebVTT format if available
        $webvtt = null;
        if ($transcription) {
            $webvtt = $this->convertTranscriptionToWebVTT($transcription, $reel->duration);
        }

        return response()->json([
            'success' => true,
            'locale' => $locale,
            'transcription' => $transcription, // Always a string
            'webvtt_url' => $webvtt ? route('api.reels.subtitles.vtt', ['reel' => $reel->id, 'locale' => $locale]) : null,
        ]);
    }

    /**
     * Convert transcription text to WebVTT format
     */
    private function convertTranscriptionToWebVTT(string $transcription, int $duration): ?string
    {
        if (empty($transcription)) {
            return null;
        }

        // If already in WebVTT format, return as is
        if (strpos($transcription, 'WEBVTT') !== false) {
            return $transcription;
        }

        // Simple conversion: split by sentences and assign timestamps
        $sentences = preg_split('/([.!?]+[\s\n]+)/', $transcription, -1, PREG_SPLIT_DELIM_CAPTURE);
        $webvtt = "WEBVTT\n\n";
        
        $currentTime = 0;
        $sentenceDuration = $duration > 0 ? ($duration / max(count($sentences), 1)) : 3; // 3 seconds per sentence if duration unknown
        
        foreach ($sentences as $index => $sentence) {
            if (trim($sentence)) {
                $startTime = $currentTime;
                $endTime = min($currentTime + $sentenceDuration, $duration);
                
                $startTimeFormatted = $this->formatTimeForWebVTT($startTime);
                $endTimeFormatted = $this->formatTimeForWebVTT($endTime);
                
                $webvtt .= "{$index}\n";
                $webvtt .= "{$startTimeFormatted} --> {$endTimeFormatted}\n";
                $webvtt .= trim($sentence) . "\n\n";
                
                $currentTime = $endTime;
            }
        }
        
        return $webvtt;
    }

    /**
     * Format seconds to WebVTT time format (HH:MM:SS.mmm)
     */
    private function formatTimeForWebVTT(int $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        
        return sprintf('%02d:%02d:%02d.000', $hours, $minutes, $secs);
    }

    /**
     * Serve WebVTT subtitle file for reel
     */
    public function getSubtitleVtt(Request $request, Reel $reel, string $locale = 'en'): \Illuminate\Http\Response
    {
        $user = Auth::user();

        // Check access permissions
        if (!$reel->isAccessibleTo($user)) {
            abort(403, 'You do not have access to this reel.');
        }

        // Get transcription
        $transcription = null;
        $transcriptions = $reel->transcriptions;
        
        if ($transcriptions && is_array($transcriptions) && isset($transcriptions[$locale])) {
            if (is_array($transcriptions[$locale]) && isset($transcriptions[$locale]['text'])) {
                $transcription = $transcriptions[$locale]['text'];
            } else {
                $transcription = $transcriptions[$locale];
            }
        } else if ($transcriptions && is_array($transcriptions) && isset($transcriptions['en'])) {
            if (is_array($transcriptions['en']) && isset($transcriptions['en']['text'])) {
                $transcription = $transcriptions['en']['text'];
            } else {
                $transcription = $transcriptions['en'];
            }
        }

        // Convert to WebVTT
        $webvtt = null;
        if ($transcription) {
            if (is_array($transcription)) {
                $transcription = implode(' ', array_map(function($item) {
                    if (is_string($item)) return $item;
                    if (is_array($item) && isset($item['word'])) return $item['word'];
                    if (is_array($item) && isset($item['punctuated_word'])) return $item['punctuated_word'];
                    return '';
                }, $transcription));
            }
            $webvtt = $this->convertTranscriptionToWebVTT($transcription, $reel->duration);
        }

        if (!$webvtt) {
            abort(404, 'Subtitle not found for this locale.');
        }

        return response($webvtt, 200, [
            'Content-Type' => 'text/vtt',
            'Content-Disposition' => 'inline; filename="reel-' . $reel->id . '-' . $locale . '.vtt"',
        ]);
    }
}
