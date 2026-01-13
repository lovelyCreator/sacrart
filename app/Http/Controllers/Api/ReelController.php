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
    private function extractBunnyVideoId(?string $embedUrl, ?string $videoId): ?string
    {
        if ($videoId) {
            return $videoId;
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
        
        $request->merge($requestData);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'bunny_video_id' => 'nullable|string|max:255',
            'bunny_video_url' => 'nullable|url|max:500',
            'bunny_embed_url' => 'required_without_all:video_url,video_file_path|url|max:500',
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
        
        $request->merge($requestData);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255|unique:reels,title,' . $reel->id,
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'bunny_video_id' => 'nullable|string|max:255',
            'bunny_video_url' => 'nullable|url|max:500',
            'bunny_embed_url' => 'nullable|url|max:500',
            'bunny_thumbnail_url' => 'nullable|url|max:500',
            'video_url' => 'nullable|url|max:255',
            'video_file_path' => 'nullable|string|max:255',
            'thumbnail' => 'nullable|string|max:255',
            'intro_image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'intro_image' => 'nullable|string|max:255',
            'file_size' => 'nullable|integer|min:0',
            'video_format' => 'nullable|string|max:50',
            'video_quality' => 'nullable|string|max:50',
            'visibility' => 'sometimes|required|in:freemium,basic,premium',
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
}
