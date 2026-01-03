<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rewind;
use App\Models\Video;
use App\Services\WebpConversionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RewindController extends Controller
{
    protected $webpService;

    public function __construct(WebpConversionService $webpService)
    {
        $this->webpService = $webpService;
    }

    /**
     * Display a listing of rewinds.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        $query = Rewind::with(['instructor']);

        $isAdminRequest = $request->is('api/admin/*');

        if (!$isAdminRequest) {
            if ($user) {
                $subscriptionType = $user->subscription_type ?: 'freemium';
                $query->visibleTo($subscriptionType);
            } else {
                $query->where('visibility', 'freemium');
            }
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
        $sortBy = $request->get('sort_by', 'published_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 15);
        $rewinds = $query->paginate($perPage);

        // Load video count for each rewind
        foreach ($rewinds->items() as $rewind) {
            $rewind->loadCount(['videos' => function ($q) use ($isAdminRequest) {
                if (!$isAdminRequest) {
                    $q->where('status', 'published');
                }
            }]);
            
            // Load translations for admin requests
            if ($isAdminRequest) {
                $rewind->translations = $rewind->getAllTranslations();
            }
        }

        return response()->json([
            'success' => true,
            'data' => $rewinds,
        ]);
    }

    /**
     * Store a newly created rewind.
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
        
        // Handle video_ids before validation
        $videoIds = $request->input('video_ids');
        if (is_string($videoIds)) {
            $decoded = json_decode($videoIds, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $requestData['video_ids'] = $decoded;
            } else {
                $requestData['video_ids'] = null;
            }
        } else if (is_array($videoIds)) {
            $requestData['video_ids'] = $videoIds;
        } else {
            $requestData['video_ids'] = null;
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
            'year' => 'nullable|integer|min:1900|max:' . (date('Y') + 1),
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'thumbnail' => 'nullable|string|max:255',
            'cover_image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'cover_image' => 'nullable|string|max:255',
            'trailer_url' => 'nullable|url|max:500',
            'visibility' => 'required|in:freemium,basic,premium',
            'status' => 'nullable|in:draft,published,archived',
            'is_free' => 'nullable|boolean',
            'price' => 'nullable|numeric|min:0',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'sort_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'video_ids' => 'nullable|array',
            'video_ids.*' => 'exists:videos,id',
            'translations' => 'nullable|array',
        ]);

        // Handle multilingual translations
        $translations = $validated['translations'] ?? null;

        if ($translations && is_array($translations)) {
            if (isset($translations['title'])) {
                $validated['title_en'] = $translations['title']['en'] ?? $validated['title'] ?? '';
                $validated['title_es'] = $translations['title']['es'] ?? '';
                $validated['title_pt'] = $translations['title']['pt'] ?? '';
                // Also update the main name field if not provided
                if (!isset($validated['title'])) {
                    $validated['title'] = $validated['title_en'];
                }
            }
            if (isset($translations['description'])) {
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
                // Also update the main description field if not provided
                if (!isset($validated['description'])) {
                    $validated['description'] = $validated['description_en'];
                }
            }
            if (isset($translations['short_description'])) {
                $validated['short_description_en'] = $translations['short_description']['en'] ?? $validated['short_description'] ?? '';
                $validated['short_description_es'] = $translations['short_description']['es'] ?? '';
                $validated['short_description_pt'] = $translations['short_description']['pt'] ?? '';
                // Also update the main short_description field if not provided
                if (!isset($validated['short_description'])) {
                    $validated['short_description'] = $validated['short_description_en'];
                }
            }
        } else {
            // If translations are not provided but title/description are, update the English versions
            if (isset($validated['title'])) {
                $validated['title_en'] = $validated['title'];
            }
            if (isset($validated['description'])) {
                $validated['description_en'] = $validated['description'];
            }
            if (isset($validated['short_description'])) {
                $validated['short_description_en'] = $validated['short_description'];
            }
        }

        $validated['slug'] = Str::slug($validated['title_en'] ?? $validated['title']);
        $validated['instructor_id'] = Auth::id();
        unset($validated['translations']);

        // Handle cover image file upload
        if ($request->hasFile('cover_image_file')) {
            try {
                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('cover_image_file'),
                    'rewinds/image'
                );
                $validated['cover_image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload cover image: ' . $e->getMessage(),
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
            $lastSortOrder = Rewind::orderBy('sort_order', 'desc')->first();
            $validated['sort_order'] = $lastSortOrder ? $lastSortOrder->sort_order + 1 : 1;
        }

        // Extract video_ids before creating rewind
        $videoIds = $validated['video_ids'] ?? [];
        unset($validated['video_ids']);

        $rewind = Rewind::create($validated);

        // Attach videos if provided
        if (!empty($videoIds)) {
            $syncData = [];
            foreach ($videoIds as $index => $videoId) {
                $syncData[$videoId] = [
                    'episode_number' => $index + 1,
                    'sort_order' => $index + 1,
                ];
            }
            $rewind->videos()->sync($syncData);
            $rewind->updateStatistics();
        }

        // Load relationships and translations
        $rewind->load(['instructor', 'videos']);
        $rewind->translations = $rewind->getAllTranslations();

        return response()->json([
            'success' => true,
            'message' => 'Rewind created successfully.',
            'data' => $rewind,
        ], 201);
    }

    /**
     * Display the specified rewind.
     */
    public function show(Rewind $rewind): JsonResponse
    {
        $user = Auth::user();

        if (!$rewind->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this rewind.',
            ], 403);
        }

        $rewind->load(['instructor', 'videos' => function ($q) {
            $q->orderByPivot('sort_order');
        }]);

        // Load translations for admin requests
        $user = Auth::user();
        if ($user && $user->isAdmin()) {
            $rewind->translations = $rewind->getAllTranslations();
        }

        return response()->json([
            'success' => true,
            'data' => $rewind,
        ]);
    }

    /**
     * Update the specified rewind.
     */
    public function update(Request $request, Rewind $rewind): JsonResponse
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
        
        // Handle video_ids before validation
        $videoIds = $request->input('video_ids');
        if (is_string($videoIds)) {
            $decoded = json_decode($videoIds, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $requestData['video_ids'] = $decoded;
            } else {
                $requestData['video_ids'] = null;
            }
        } else if (is_array($videoIds)) {
            $requestData['video_ids'] = $videoIds;
        } else {
            $requestData['video_ids'] = null;
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
            'title' => 'sometimes|required|string|max:255|unique:rewinds,title,' . $rewind->id,
            'year' => 'nullable|integer|min:1900|max:' . (date('Y') + 1),
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'thumbnail' => 'nullable|string|max:255',
            'cover_image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'cover_image' => 'nullable|string|max:255',
            'trailer_url' => 'nullable|url|max:500',
            'visibility' => 'sometimes|required|in:freemium,basic,premium',
            'status' => 'nullable|in:draft,published,archived',
            'is_free' => 'nullable|boolean',
            'price' => 'nullable|numeric|min:0',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'sort_order' => 'nullable|integer',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'video_ids' => 'nullable|array',
            'video_ids.*' => 'exists:videos,id',
            'translations' => 'nullable|array',
        ]);

        // Handle multilingual translations
        $translations = $validated['translations'] ?? null;

        if ($translations && is_array($translations)) {
            if (isset($translations['title'])) {
                // Prioritize translations over direct title field
                $validated['title_en'] = $translations['title']['en'] ?? $validated['title'] ?? $rewind->title_en ?? '';
                $validated['title_es'] = $translations['title']['es'] ?? '';
                $validated['title_pt'] = $translations['title']['pt'] ?? '';
                // Always update the main title field to match English translation
                $validated['title'] = $validated['title_en'];
            }
            if (isset($translations['description'])) {
                // Prioritize translations over direct description field
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? $rewind->description_en ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
                // Always update the main description field to match English translation
                $validated['description'] = $validated['description_en'];
            }
            if (isset($translations['short_description'])) {
                // Prioritize translations over direct short_description field
                $validated['short_description_en'] = $translations['short_description']['en'] ?? $validated['short_description'] ?? $rewind->short_description_en ?? '';
                $validated['short_description_es'] = $translations['short_description']['es'] ?? '';
                $validated['short_description_pt'] = $translations['short_description']['pt'] ?? '';
                // Always update the main short_description field to match English translation
                $validated['short_description'] = $validated['short_description_en'];
            }
        } else {
            // If translations are not provided but title/description are, update the English versions
            if (isset($validated['title'])) {
                $validated['title_en'] = $validated['title'];
            }
            if (isset($validated['description'])) {
                $validated['description_en'] = $validated['description'];
            }
            if (isset($validated['short_description'])) {
                $validated['short_description_en'] = $validated['short_description'];
            }
        }

        if (isset($validated['title']) || isset($validated['title_en'])) {
            $validated['slug'] = Str::slug($validated['title_en'] ?? $validated['title'] ?? $rewind->title_en ?? $rewind->title ?? '');
        }
        
        unset($validated['translations']);

        // Handle cover image file upload
        if ($request->hasFile('cover_image_file')) {
            try {
                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('cover_image_file'),
                    'rewinds/image'
                );
                $validated['cover_image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload cover image: ' . $e->getMessage(),
                ], 500);
            }
        }

        if (isset($validated['status']) && $validated['status'] === 'published' && !$rewind->published_at) {
            $validated['published_at'] = now();
        }

        // Extract video_ids before updating rewind
        $videoIds = $validated['video_ids'] ?? null;
        unset($validated['video_ids']);

        $rewind->update($validated);

        // Update videos if provided
        if ($videoIds !== null) {
            $syncData = [];
            foreach ($videoIds as $index => $videoId) {
                $syncData[$videoId] = [
                    'episode_number' => $index + 1,
                    'sort_order' => $index + 1,
                ];
            }
            $rewind->videos()->sync($syncData);
            $rewind->updateStatistics();
        }

        // Load relationships and translations
        $rewind->load(['instructor', 'videos']);
        $rewind->refresh();
        $rewind->translations = $rewind->getAllTranslations();

        return response()->json([
            'success' => true,
            'message' => 'Rewind updated successfully.',
            'data' => $rewind,
        ]);
    }

    /**
     * Remove the specified rewind.
     */
    public function destroy(Rewind $rewind): JsonResponse
    {
        $rewind->videos()->detach();
        $rewind->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rewind deleted successfully.',
        ]);
    }

    /**
     * Get public rewinds (for frontend)
     */
    public function getPublic(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        $query = Rewind::with(['instructor']);

        if ($user) {
            $subscriptionType = $user->subscription_type ?: 'freemium';
            $query->visibleTo($subscriptionType);
        } else {
            $query->where('visibility', 'freemium');
        }

        $query->published();

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        // Sort by published_at descending (newest first)
        $query->orderBy('published_at', 'desc');

        $perPage = $request->get('per_page', 100);
        $rewinds = $query->paginate($perPage);

        // Load video count for each rewind
        foreach ($rewinds->items() as $rewind) {
            $rewind->loadCount(['videos' => function ($q) {
                $q->where('status', 'published');
            }]);
        }

        return response()->json([
            'success' => true,
            'data' => $rewinds,
        ]);
    }
}
