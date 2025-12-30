<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Video;
use App\Models\Series;
use App\Models\UserProgress;
use App\Services\WebpConversionService;
use App\Services\VideoTranscodingService;
use App\Services\BunnyNetService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class VideoController extends Controller
{
    protected $webpService;
    protected $transcodingService;
    protected $bunnyNetService;

    public function __construct(
        WebpConversionService $webpService,
        VideoTranscodingService $transcodingService,
        BunnyNetService $bunnyNetService
    ) {
        $this->webpService = $webpService;
        $this->transcodingService = $transcodingService;
        $this->bunnyNetService = $bunnyNetService;
    }
    /**
     * Display a listing of videos.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        // Ensure locale is set (should be set by SetLocale middleware, but ensure it's set)
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        $query = Video::with(['series', 'instructor'])->withCount('comments');

        // Check if this is an admin request (admin routes)
        $isAdminRequest = $request->is('api/admin/*');

        // Apply visibility filters based on user subscription (skip for admin)
        if (!$isAdminRequest) {
            if ($user) {
                // Default to freemium if subscription_type is null/empty
                $subscriptionType = $user->subscription_type ?: 'freemium';
                $query->visibleTo($subscriptionType);
            } else {
                $query->where('visibility', 'freemium');
            }
        }

        // Filter by category_id (videos belong to series, series belong to categories)
        if ($request->has('category_id')) {
            $query->whereHas('series', function ($q) use ($request) {
                $q->where('category_id', $request->get('category_id'));
            });
        }
        
        // Filter by series_id (videos belong to series)
        if ($request->has('series_id')) {
            $seriesId = $request->get('series_id');
            $query->where('series_id', $seriesId);
            \Log::info('VideoController: Filtering videos by series_id', [
                'series_id' => $seriesId,
                'total_videos_in_db' => Video::count(),
                'videos_with_series_id' => Video::where('series_id', $seriesId)->count(),
                'videos_with_series_id_and_published' => Video::where('series_id', $seriesId)->where('status', 'published')->count(),
            ]);
        }

        // Filter by status
        if ($request->has('status')) {
            $status = $request->get('status');
            $query->where('status', $status);
            \Log::info('VideoController: Applied status filter', [
                'status' => $status,
                'series_id' => $request->get('series_id'),
            ]);
        } else if (!$isAdminRequest) {
            // Default to published for public access (admin can see all)
            $query->published();
            \Log::info('VideoController: Applied default published filter for public request', [
                'series_id' => $request->get('series_id'),
            ]);
        }

        // Filter by visibility
        if ($request->has('visibility')) {
            $query->where('visibility', $request->get('visibility'));
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        // Filter by tags
        if ($request->has('tags')) {
            $tags = is_array($request->get('tags')) 
                ? $request->get('tags') 
                : explode(',', $request->get('tags'));
            
            $query->where(function ($q) use ($tags) {
                foreach ($tags as $tag) {
                    $tag = trim($tag);
                    if (!empty($tag)) {
                        // Search for tag in JSON array - use LIKE for better compatibility
                        $q->orWhere('tags', 'like', '%"' . addslashes($tag) . '"%')
                          ->orWhere('tags', 'like', '%' . addslashes($tag) . '%');
                    }
                }
            });
        }

        // Filter by single tag (for convenience)
        if ($request->has('tag')) {
            $tag = trim($request->get('tag'));
            if (!empty($tag)) {
                $query->where(function ($q) use ($tag) {
                    // Use LIKE for better MySQL compatibility
                    $q->where('tags', 'like', '%"' . addslashes($tag) . '"%')
                      ->orWhere('tags', 'like', '%' . addslashes($tag) . '%');
                });
            }
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'sort_order');
        $sortOrder = $request->get('sort_order', 'asc');
        
        switch ($sortBy) {
            case 'title':
                $query->orderBy('title', $sortOrder);
                break;
            case 'duration':
                $query->orderBy('duration', $sortOrder);
                break;
            case 'views':
                $query->orderBy('views', $sortOrder);
                break;
            case 'episode':
                $query->orderBy('episode_number', $sortOrder);
                break;
            case 'comments':
            case 'reviews':
                $query->orderBy('comments_count', $sortOrder);
                break;
            default:
                $query->orderBy('sort_order', $sortOrder)->orderBy('episode_number', $sortOrder);
        }

        // Get SQL query for debugging
        $sql = $query->toSql();
        $bindings = $query->getBindings();
        \Log::info('VideoController: Videos Query SQL', [
            'sql' => $sql,
            'bindings' => $bindings,
            'series_id' => $request->get('series_id'),
            'status' => $request->get('status'),
        ]);

        $videos = $query->paginate($request->get('per_page', 15));
        
        \Log::info('VideoController: Videos Query Results', [
            'total' => $videos->total(),
            'count' => $videos->count(),
            'current_page' => $videos->currentPage(),
            'per_page' => $videos->perPage(),
            'has_more' => $videos->hasMorePages(),
            'series_id' => $request->get('series_id'),
        ]);

        // Load all translations for each video (for admin editing)
        if ($isAdminRequest) {
            foreach ($videos->items() as $video) {
                try {
                    $video->translations = $video->getAllTranslations();
                } catch (\Exception $e) {
                    \Log::warning('Failed to get translations for video', [
                        'video_id' => $video->id,
                        'error' => $e->getMessage(),
                    ]);
                    // Set empty translations object if getAllTranslations fails
                    $video->translations = [
                        'title' => ['en' => $video->title ?? '', 'es' => '', 'pt' => ''],
                        'description' => ['en' => $video->description ?? '', 'es' => '', 'pt' => ''],
                        'short_description' => ['en' => $video->short_description ?? '', 'es' => '', 'pt' => ''],
                        'intro_description' => ['en' => $video->intro_description ?? '', 'es' => '', 'pt' => ''],
                    ];
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $videos,
        ]);
    }

    /**
     * Store a newly created video.
     */
    public function store(Request $request): JsonResponse
    {
        // Pre-process request data - decode JSON strings for array fields
        $requestData = $request->all();
        
        // Handle tags - decode if it's a JSON string
        if ($request->has('tags') && is_string($request->get('tags'))) {
            try {
                $decoded = json_decode($request->get('tags'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['tags'] = $decoded;
                } else {
                    // If it's not valid JSON or not an array, try to parse as comma-separated string
                    $tags = array_filter(array_map('trim', explode(',', $request->get('tags'))));
                    $requestData['tags'] = !empty($tags) ? array_values($tags) : null;
                }
            } catch (\Exception $e) {
                // If parsing fails, set to null
                $requestData['tags'] = null;
            }
        }
        
        // Handle downloadable_resources - decode if it's a JSON string
        if ($request->has('downloadable_resources') && is_string($request->get('downloadable_resources'))) {
            try {
                $decoded = json_decode($request->get('downloadable_resources'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['downloadable_resources'] = $decoded;
                } else {
                    $requestData['downloadable_resources'] = null;
                }
            } catch (\Exception $e) {
                $requestData['downloadable_resources'] = null;
            }
        }
        
        // Handle streaming_urls - decode if it's a JSON string
        if ($request->has('streaming_urls') && is_string($request->get('streaming_urls'))) {
            try {
                $decoded = json_decode($request->get('streaming_urls'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['streaming_urls'] = $decoded;
                } else {
                    $requestData['streaming_urls'] = null;
                }
            } catch (\Exception $e) {
                $requestData['streaming_urls'] = null;
            }
        }
        
        // Merge the processed data back into the request
        $request->merge($requestData);

        // var_dump($request->all());
        $validated = $request->validate([
            'title' => 'required|string|max:255|unique:videos,title',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'category_id' => 'required|exists:categories,id', // Videos belong to Category
            'series_id' => 'required|exists:series,id', // Videos belong to Series (Series belong to Category)
            // Legacy local video fields (kept for backward compatibility, not used for new content)
            'video_url' => 'nullable|url|max:255',
            'video_file_path' => 'nullable|string|max:255',
            // Bunny.net fields (primary source for new content)
            'bunny_video_id' => 'nullable|string|max:255',
            'bunny_video_url' => 'nullable|url|max:500',
            'bunny_embed_url' => 'required_without_all:video_url,video_file_path|url|max:500',
            'bunny_thumbnail_url' => 'nullable|url|max:500',
            'thumbnail' => 'nullable|string|max:255',
            'intro_image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'intro_image' => 'nullable|string|max:255',
            'intro_description' => 'nullable|string',
            // duration is auto-computed from uploaded file
            'duration' => 'nullable|integer|min:0',
            'file_size' => 'nullable|integer|min:0',
            'video_format' => 'nullable|string|max:50',
            'video_quality' => 'nullable|string|max:50',
            'hls_url' => 'nullable|url|max:255',
            'dash_url' => 'nullable|url|max:255',
            'streaming_urls' => 'nullable|array',
            'visibility' => 'required|in:freemium,basic,premium',
            'status' => 'nullable|in:draft,published,archived',
            'is_free' => 'nullable|boolean',
            'price' => 'nullable|numeric|min:0',
            'episode_number' => 'nullable|integer|min:1',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'downloadable_resources' => 'nullable|array',
            'allow_download' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'translations' => 'nullable|array',
        ]);
        
        // Validate that both category_id and series_id exist
        if (!isset($validated['category_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Category ID is required.',
            ], 422);
        }
        if (!isset($validated['series_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Series ID is required.',
            ], 422);
        }
        
        // Ensure series belongs to the specified category
        $series = Series::findOrFail($validated['series_id']);
        if ($series->category_id != $validated['category_id']) {
            return response()->json([
                'success' => false,
                'message' => 'Series does not belong to the specified category.',
            ], 422);
        }

        $validated['slug'] = Str::slug($validated['title']);
        $validated['instructor_id'] = Auth::id();

        // Handle intro image file upload
        if ($request->hasFile('intro_image_file')) {
            try {
                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('intro_image_file'),
                    'data_section/image'
                );
                $validated['intro_image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload intro image: ' . $e->getMessage(),
                ], 500);
            }
        }
        
        // Set status default
        if (!isset($validated['status'])) {
            $validated['status'] = 'draft';
        }

        // Set published_at if status is published
        if ($validated['status'] === 'published') {
            $validated['published_at'] = now();
        }

        // Auto-generate episode number if not provided
        if (!isset($validated['episode_number'])) {
            $lastEpisode = Video::where('series_id', $validated['series_id'])
                ->orderBy('episode_number', 'desc')
                ->first();
            $validated['episode_number'] = $lastEpisode ? $lastEpisode->episode_number + 1 : 1;
        }

        // Set sort order if not provided
        if (!isset($validated['sort_order'])) {
            $lastSortOrder = Video::where('series_id', $validated['series_id'])
                ->orderBy('sort_order', 'desc')
                ->first();
            $validated['sort_order'] = $lastSortOrder ? $lastSortOrder->sort_order + 1 : 1;
        }

        // Handle multilingual fields from translations object
        $translations = $request->input('translations');
        if (empty($translations) && isset($validated['translations'])) {
            $translations = $validated['translations'];
        }
        // Also handle JSON string from FormData
        if (is_string($translations)) {
            $decoded = json_decode($translations, true);
            $translations = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }

        // Extract multilingual fields from translations object
        if ($translations && is_array($translations)) {
            // Title fields
            if (isset($translations['title'])) {
                $validated['title_en'] = $translations['title']['en'] ?? $validated['title'] ?? '';
                $validated['title_es'] = $translations['title']['es'] ?? '';
                $validated['title_pt'] = $translations['title']['pt'] ?? '';
            }
            // Description fields
            if (isset($translations['description'])) {
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
            }
            // Short description fields
            if (isset($translations['short_description'])) {
                $validated['short_description_en'] = $translations['short_description']['en'] ?? $validated['short_description'] ?? '';
                $validated['short_description_es'] = $translations['short_description']['es'] ?? '';
                $validated['short_description_pt'] = $translations['short_description']['pt'] ?? '';
            }
            // Intro description fields
            if (isset($translations['intro_description'])) {
                $validated['intro_description_en'] = $translations['intro_description']['en'] ?? $validated['intro_description'] ?? '';
                $validated['intro_description_es'] = $translations['intro_description']['es'] ?? '';
                $validated['intro_description_pt'] = $translations['intro_description']['pt'] ?? '';
            }
        } else {
            // If no translations object, use main fields for English
            $validated['title_en'] = $validated['title'] ?? '';
            $validated['description_en'] = $validated['description'] ?? '';
            $validated['short_description_en'] = $validated['short_description'] ?? '';
            $validated['intro_description_en'] = $validated['intro_description'] ?? '';
        }
        
        // Generate slug from English title
        $validated['slug'] = Str::slug($validated['title_en'] ?? $validated['title'] ?? '');
        
        // Remove translations from validated as it's not a model field
        unset($validated['translations']);
        
        // Remove category_id if the column doesn't exist in videos table
        // Videos get category_id through series relationship
        if (!\Schema::hasColumn('videos', 'category_id')) {
            unset($validated['category_id']);
        }

        // Always extract duration from Bunny.net if bunny_embed_url or bunny_video_id is provided
        // This ensures duration is always up-to-date from the source
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
                            'duration_formatted' => gmdate('H:i:s', $validated['duration']),
                        ]);
                    } else {
                        \Log::warning('Bunny.net video metadata does not contain duration', [
                            'video_id' => $bunnyVideoId,
                            'metadata' => $bunnyMetadata,
                        ]);
                        // If duration not found and not explicitly provided, set to 0
                        if (!isset($validated['duration']) || $validated['duration'] == 0) {
                            $validated['duration'] = 0;
                        }
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to auto-extract duration from Bunny.net on create', [
                        'video_id' => $bunnyVideoId,
                        'error' => $e->getMessage(),
                    ]);
                    // If extraction fails and duration not provided, set to 0
                    if (!isset($validated['duration']) || $validated['duration'] == 0) {
                        $validated['duration'] = 0;
                    }
                }
            }
        }

        $video = Video::create($validated);

        // Load all translations for the response
        $video->translations = $video->getAllTranslations();

        return response()->json([
            'success' => true,
            'message' => 'Video created successfully.',
            'data' => $video->load(['series.category', 'instructor']),
        ], 201);
    }

    /**
     * Display the specified video.
     */
    public function show(Video $video): JsonResponse
    {
        $user = Auth::user();

        // Check access permissions
        if (!$video->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this video.',
            ], 403);
        }

        $video->load(['series.category', 'instructor']);

        // Load all translations for the response (for admin editing)
        if ($user && $user->isAdmin()) {
            $video->translations = $video->getAllTranslations();
        }

        // Get user progress if authenticated
        $userProgress = null;
        if ($user) {
            $userProgress = $video->userProgress()
                ->where('user_id', $user->id)
                ->first();
        }

        // Get next and previous videos
        $nextVideo = $video->getNextVideo();
        $previousVideo = $video->getPreviousVideo();

        // Increment view count
        $video->incrementViews();

        return response()->json([
            'success' => true,
            'data' => [
                'video' => $video,
                'user_progress' => $userProgress,
                'next_video' => $nextVideo,
                'previous_video' => $previousVideo,
            ],
        ]);
    }

    /**
     * Update the specified video.
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Find video by ID instead of slug
        $video = Video::findOrFail($id);
        
        // Check if user can edit this video
        if (!Auth::user()->isAdmin() && $video->instructor_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit this video.',
            ], 403);
        }

        // Pre-process request data - decode JSON strings for array fields
        $requestData = $request->all();
        
        // Handle tags - decode if it's a JSON string
        if ($request->has('tags') && is_string($request->get('tags'))) {
            try {
                $decoded = json_decode($request->get('tags'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['tags'] = $decoded;
                } else {
                    // If it's not valid JSON or not an array, try to parse as comma-separated string
                    $tags = array_filter(array_map('trim', explode(',', $request->get('tags'))));
                    $requestData['tags'] = !empty($tags) ? array_values($tags) : null;
                }
            } catch (\Exception $e) {
                // If parsing fails, set to null
                $requestData['tags'] = null;
            }
        }
        
        // Handle downloadable_resources - decode if it's a JSON string
        if ($request->has('downloadable_resources') && is_string($request->get('downloadable_resources'))) {
            try {
                $decoded = json_decode($request->get('downloadable_resources'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['downloadable_resources'] = $decoded;
                } else {
                    $requestData['downloadable_resources'] = null;
                }
            } catch (\Exception $e) {
                $requestData['downloadable_resources'] = null;
            }
        }
        
        // Handle streaming_urls - decode if it's a JSON string
        if ($request->has('streaming_urls') && is_string($request->get('streaming_urls'))) {
            try {
                $decoded = json_decode($request->get('streaming_urls'), true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $requestData['streaming_urls'] = $decoded;
                } else {
                    $requestData['streaming_urls'] = null;
                }
            } catch (\Exception $e) {
                $requestData['streaming_urls'] = null;
            }
        }
        
        // Merge the processed data back into the request
        $request->merge($requestData);
        
        $validated = $request->validate([
            'title' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('videos', 'title')->ignore($video->id),
            ],
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'category_id' => 'nullable|exists:categories,id', // Videos belong to Category
            'series_id' => 'nullable|exists:series,id', // Videos belong to Series
            // Legacy local video fields (kept for backward compatibility, not used for new content)
            'video_url' => 'nullable|url|max:255',
            'video_file_path' => 'nullable|string|max:255',
            // Bunny.net fields (primary source for new content)
            'bunny_video_id' => 'nullable|string|max:255',
            'bunny_video_url' => 'nullable|url|max:500',
            'bunny_embed_url' => 'required_without_all:video_url,video_file_path|url|max:500',
            'bunny_thumbnail_url' => 'nullable|url|max:500',
            'thumbnail' => 'nullable|string|max:255',
            'intro_image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'intro_image' => 'nullable|string|max:255',
            'intro_description' => 'nullable|string',
            // duration is auto-computed from uploaded file
            'duration' => 'nullable|integer|min:0',
            'file_size' => 'nullable|integer|min:0',
            'video_format' => 'nullable|string|max:50',
            'video_quality' => 'nullable|string|max:50',
            'hls_url' => 'nullable|url|max:255',
            'dash_url' => 'nullable|url|max:255',
            'streaming_urls' => 'nullable|array',
            'visibility' => 'nullable|in:freemium,basic,premium',
            'status' => 'nullable|in:draft,published,archived',
            'is_free' => 'nullable|boolean',
            'price' => 'nullable|numeric|min:0',
            'episode_number' => 'nullable|integer|min:1',
            'sort_order' => 'nullable|integer|min:0',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'downloadable_resources' => 'nullable|array',
            'allow_download' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'processing_status' => 'nullable|in:pending,processing,completed,failed',
            'processing_error' => 'nullable|string',
            'translations' => 'nullable|array',
        ]);
        
        // Support category_id and series_id
        if (!isset($validated['category_id']) && $request->has('category_id')) {
            $validated['category_id'] = $request->get('category_id');
        }
        if (!isset($validated['series_id']) && $request->has('series_id')) {
            $validated['series_id'] = $request->get('series_id');
        }

        // If series_id is provided, ensure category_id matches the series' category
        if (isset($validated['series_id']) && !isset($validated['category_id'])) {
            $series = Series::find($validated['series_id']);
            if ($series) {
                $validated['category_id'] = $series->category_id;
            }
        }

        // Legacy local video file handling (kept for backward compatibility, no longer used for new content)
        if ($request->has('video_file_path')) {
            // Handle video file path update (may include copying for duplicating videos)
            $newPath = $request->get('video_file_path');
            $originalPath = $video->video_file_path;
            
            // If the new path is the same as an existing video's path (copy scenario), copy the file
            if ($newPath && $newPath !== $originalPath) {
                // Check if another video uses this path (copy scenario)
                $existingVideo = Video::where('video_file_path', $newPath)
                    ->where('id', '!=', $video->id)
                    ->first();
                
                if ($existingVideo && $originalPath) {
                    // Copy from original video to new location
                    try {
                        \Log::info('Copying video file for duplicate', [
                            'video_id' => $video->id,
                            'from' => $originalPath,
                            'existing_path' => $newPath,
                        ]);
                        
                        $copyResult = $this->webpService->copyVideoFile($originalPath);
                        $validated['video_file_path'] = $copyResult['path'];
                        $validated['file_size'] = $copyResult['size'];
                        $validated['video_format'] = pathinfo($copyResult['path'], PATHINFO_EXTENSION);
                        
                        \Log::info('Video file copied successfully', [
                            'path' => $copyResult['path'],
                        ]);
                    } catch (\Exception $e) {
                        \Log::error('Failed to copy video file', [
                            'error' => $e->getMessage(),
                        ]);
                        // If copy fails, still try to use the provided path
                        $validated['video_file_path'] = $newPath;
                    }
                } else {
                    // Path is being changed to a new/different path
                    // Delete old video file if it exists and is different from new path
                    if ($originalPath && $originalPath !== $newPath) {
                        $this->webpService->deleteFile($originalPath);
                    }
                    $validated['video_file_path'] = $newPath;
                }
            } else {
                // Path is the same, no change needed
                // Don't override it in validated to keep original
            }
        } else {
            \Log::info('No new video file in update request', [
                'video_id' => $video->id,
            ]);
        }

        // Handle intro image file upload
        if ($request->hasFile('intro_image_file')) {
            try {
                // Delete old intro image if exists
                if ($video->intro_image) {
                    $this->webpService->deleteFile($video->intro_image);
                }

                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('intro_image_file'),
                    'data_section/image'
                );
                $validated['intro_image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload intro image: ' . $e->getMessage(),
                ], 500);
            }
        }

        // Handle multilingual fields from translations object
        $translations = $request->input('translations');
        if (empty($translations) && isset($validated['translations'])) {
            $translations = $validated['translations'];
        }
        // Also handle JSON string from FormData
        if (is_string($translations)) {
            $decoded = json_decode($translations, true);
            $translations = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }

        // Get current values from database (raw attributes)
        $currentTitleEn = $video->getAttributes()['title_en'] ?? $video->getOriginal('title_en') ?? '';
        $currentDescriptionEn = $video->getAttributes()['description_en'] ?? $video->getOriginal('description_en') ?? '';
        $currentShortDescriptionEn = $video->getAttributes()['short_description_en'] ?? $video->getOriginal('short_description_en') ?? '';
        $currentIntroDescriptionEn = $video->getAttributes()['intro_description_en'] ?? $video->getOriginal('intro_description_en') ?? '';

        // Extract multilingual fields from translations object
        if ($translations && is_array($translations)) {
            // Title fields
            if (isset($translations['title'])) {
                $validated['title_en'] = $translations['title']['en'] ?? $validated['title'] ?? $currentTitleEn;
                $validated['title_es'] = $translations['title']['es'] ?? '';
                $validated['title_pt'] = $translations['title']['pt'] ?? '';
            }
            // Description fields
            if (isset($translations['description'])) {
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? $currentDescriptionEn;
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
            }
            // Short description fields
            if (isset($translations['short_description'])) {
                $validated['short_description_en'] = $translations['short_description']['en'] ?? $validated['short_description'] ?? $currentShortDescriptionEn;
                $validated['short_description_es'] = $translations['short_description']['es'] ?? '';
                $validated['short_description_pt'] = $translations['short_description']['pt'] ?? '';
            }
            // Intro description fields
            if (isset($translations['intro_description'])) {
                $validated['intro_description_en'] = $translations['intro_description']['en'] ?? $validated['intro_description'] ?? $currentIntroDescriptionEn;
                $validated['intro_description_es'] = $translations['intro_description']['es'] ?? '';
                $validated['intro_description_pt'] = $translations['intro_description']['pt'] ?? '';
            }
        } else {
            // If no translations object, use main fields for English if provided
            if (isset($validated['title'])) {
                $validated['title_en'] = $validated['title'];
            }
            if (isset($validated['description'])) {
                $validated['description_en'] = $validated['description'];
            }
            if (isset($validated['short_description'])) {
                $validated['short_description_en'] = $validated['short_description'];
            }
            if (isset($validated['intro_description'])) {
                $validated['intro_description_en'] = $validated['intro_description'];
            }
        }
        
        // Update slug if title changed (use English title)
        if (isset($validated['title_en']) && $currentTitleEn !== $validated['title_en']) {
            $validated['slug'] = Str::slug($validated['title_en']);
        } elseif (isset($validated['title']) && $currentTitleEn !== $validated['title']) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Set published_at if status is being changed to published
        if ($request->has('status') && $request->get('status') === 'published' && $video->status !== 'published') {
            $validated['published_at'] = now();
        }

        // Set processed_at if processing is completed
        if ($request->has('processing_status') && $request->get('processing_status') === 'completed') {
            $validated['processed_at'] = now();
        }
        
        // Remove translations from validated as it's not a model field
        unset($validated['translations']);
        
        // Remove category_id if the column doesn't exist in videos table
        // Videos get category_id through series relationship
        if (!\Schema::hasColumn('videos', 'category_id')) {
            unset($validated['category_id']);
        }

        // Always extract duration from Bunny.net if bunny_embed_url or bunny_video_id is provided
        // This ensures duration is always up-to-date from the source
        if (isset($validated['bunny_embed_url']) || isset($validated['bunny_video_id']) || 
            $video->bunny_embed_url || $video->bunny_video_id) {
            $bunnyVideoId = $this->extractBunnyVideoId(
                $validated['bunny_embed_url'] ?? $video->bunny_embed_url ?? null,
                $validated['bunny_video_id'] ?? $video->bunny_video_id ?? null
            );
            
            if ($bunnyVideoId) {
                try {
                    // Always fetch duration from Bunny.net API (requires API key)
                    $bunnyMetadata = $this->bunnyNetService->getVideo($bunnyVideoId);
                    if ($bunnyMetadata['success'] && isset($bunnyMetadata['duration']) && $bunnyMetadata['duration'] > 0) {
                        $validated['duration'] = (int) $bunnyMetadata['duration'];
                        \Log::info('Auto-extracted duration from Bunny.net API on update', [
                            'video_id' => $bunnyVideoId,
                            'duration_seconds' => $validated['duration'],
                            'duration_formatted' => gmdate('H:i:s', $validated['duration']),
                        ]);
                    } else {
                        \Log::warning('Bunny.net API did not return duration on update. Keeping existing duration or setting to 0.', [
                            'video_id' => $bunnyVideoId,
                            'metadata' => $bunnyMetadata,
                        ]);
                        // Keep existing duration if not provided in request
                        if (!isset($validated['duration'])) {
                            $validated['duration'] = $video->duration ?? 0;
                        }
                    }
                } catch (\Exception $e) {
                    \Log::warning('Failed to auto-extract duration from Bunny.net API on update. Keeping existing duration.', [
                        'video_id' => $bunnyVideoId,
                        'error' => $e->getMessage(),
                    ]);
                    // Keep existing duration if extraction fails
                    if (!isset($validated['duration'])) {
                        $validated['duration'] = $video->duration ?? 0;
                    }
                }
            }
        }

        $video->update($validated);

        // Load all translations for the response
        $video->translations = $video->getAllTranslations();

        return response()->json([
            'success' => true,
            'message' => 'Video updated successfully.',
            'data' => $video->load(['category', 'instructor']),
        ]);
    }

    /**
     * Remove the specified video.
     */
    public function destroy($id): JsonResponse
    {
        // Find video by ID instead of slug
        $video = Video::findOrFail($id);
        
        // Check if user can delete this video
        if (!Auth::user()->isAdmin() && $video->instructor_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete this video.',
            ], 403);
        }

        // Delete associated media files from storage (images only)
        try {
            if (!empty($video->intro_image)) {
                $this->webpService->deleteFile($video->intro_image);
            }
            if (!empty($video->thumbnail)) {
                $this->webpService->deleteFile($video->thumbnail);
            }
        } catch (\Throwable $e) {
            \Log::warning('Failed to delete one or more media files for video', [
                'video_id' => $video->id,
                'error' => $e->getMessage(),
            ]);
        }

        $video->delete();

        return response()->json([
            'success' => true,
            'message' => 'Video deleted successfully.',
        ]);
    }

    /**
     * Get videos in a series.
     */
    public function seriesVideos(Request $request, Series $series): JsonResponse
    {
        $user = Auth::user();

        // Check series access
        if (!$series->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this series.',
            ], 403);
        }

        $query = $series->videos()->with(['instructor']);

        // Apply visibility filters
        if ($user) {
            // Default to freemium if subscription_type is null/empty
            $subscriptionType = $user->subscription_type ?: 'freemium';
            $query->visibleTo($subscriptionType);
        } else {
            $query->where('visibility', 'freemium');
        }

        // Only published videos for public access
        $query->published();

        // Sort by episode number and sort order
        $query->orderBy('sort_order')->orderBy('episode_number');

        $videos = $query->get();

        // Get user progress for all videos
        $userProgress = [];
        if ($user) {
            $progressData = $series->userProgress()
                ->where('user_id', $user->id)
                ->get()
                ->keyBy('video_id');
            
            $userProgress = $progressData->toArray();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'videos' => $videos,
                'user_progress' => $userProgress,
                'series' => $series,
            ],
        ]);
    }

    /**
     * Get video streaming URL.
     * For Bunny.net videos, redirect to Bunny.net URL or return embed URL.
     */
    public function stream(Request $request, Video $video)
    {
        $user = Auth::user();

        // Check access permissions
        if (!$video->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this video.',
            ], 403);
        }

        // Priority 1: Bunny.net video URL
        if ($video->bunny_video_url) {
            \Log::info('Video stream redirect to Bunny.net', [
                'video_id' => $video->id,
                'bunny_video_id' => $video->bunny_video_id,
                'url' => $video->bunny_video_url,
            ]);
            return redirect()->away($video->bunny_video_url);
        }

        // Priority 2: Direct video URL
        if ($video->video_url) {
            \Log::info('Video stream redirect to direct URL', [
                'video_id' => $video->id,
                'url' => $video->video_url,
            ]);
            return redirect()->away($video->video_url);
        }

        // Priority 3: Legacy local file streaming (for backward compatibility)
        if ($video->video_file_path && !str_starts_with($video->video_file_path, 'http')) {
            $path = storage_path('app/public/' . $video->video_file_path);

            if (file_exists($path)) {
                $fileSize = filesize($path);
                $mimeType = mime_content_type($path) ?: 'video/mp4';

                $headers = [
                    'Content-Type' => $mimeType,
                    'Content-Length' => $fileSize,
                    'Accept-Ranges' => 'bytes',
                    'Cache-Control' => 'public, max-age=31536000',
                ];

                if ($request->header('Range')) {
                    $range = $request->header('Range');
                    $range = str_replace('bytes=', '', $range);
                    $rangeParts = explode('-', $range);
                    $start = max(0, intval($rangeParts[0]));
                    $end = isset($rangeParts[1]) && $rangeParts[1] !== '' ? intval($rangeParts[1]) : $fileSize - 1;
                    $end = min($end, $fileSize - 1);

                    if ($start > $end) {
                        $start = 0;
                    }

                    $length = $end - $start + 1;
                    $headers['Content-Range'] = "bytes {$start}-{$end}/{$fileSize}";
                    $headers['Content-Length'] = $length;

                    return response()->stream(function () use ($path, $start, $length) {
                        $chunkSize = 8192;
                        $stream = fopen($path, 'rb');
                        fseek($stream, $start);
                        $bytesLeft = $length;
                        while ($bytesLeft > 0 && !feof($stream)) {
                            $read = ($bytesLeft > $chunkSize) ? $chunkSize : $bytesLeft;
                            echo fread($stream, $read);
                            $bytesLeft -= $read;
                            @ob_flush();
                            flush();
                        }
                        fclose($stream);
                    }, 206, $headers);
                }

                return response()->stream(function () use ($path) {
                    $chunkSize = 8192;
                    $stream = fopen($path, 'rb');
                    while (!feof($stream)) {
                        echo fread($stream, $chunkSize);
                        @ob_flush();
                        flush();
                    }
                    fclose($stream);
                }, 200, $headers);
            }
        }

        // Fallback: Return JSON with video information
        return response()->json([
            'success' => true,
            'data' => [
                'video_id' => $video->id,
                'title' => $video->title,
                'duration' => $video->duration,
                'bunny_embed_url' => $video->bunny_embed_url,
                'bunny_video_url' => $video->bunny_video_url,
                'video_url' => $video->video_url,
                'allow_download' => $video->allow_download,
                'downloadable_resources' => $video->downloadable_resources,
            ],
        ]);
    }

    /**
     * Get video download URL (for Bunny.net videos with MP4 fallback enabled)
     */
    public function getDownloadUrl(Request $request, Video $video): JsonResponse
    {
        $user = Auth::user();

        // Check access permissions
        if (!$video->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this video.',
            ], 403);
        }

        // Check if download is allowed
        if (!$video->allow_download) {
            return response()->json([
                'success' => false,
                'message' => 'Download is not allowed for this video.',
            ], 403);
        }

        // Get Bunny.net video ID
        if (!$video->bunny_video_id) {
            return response()->json([
                'success' => false,
                'message' => 'Video does not have a Bunny.net video ID.',
            ], 400);
        }

        // Get quality from request (default: 720)
        $quality = $request->input('quality', '720');

        // Get download URL from Bunny.net service
        $downloadUrl = $this->bunnyNetService->getDownloadUrl($video->bunny_video_id, $quality);

        if (!$downloadUrl) {
            \Log::error('Failed to generate download URL', [
                'video_id' => $video->id,
                'bunny_video_id' => $video->bunny_video_id,
                'quality' => $quality,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Could not generate download URL. Please ensure BUNNY_LIBRARY_ID and BUNNY_CDN_URL are configured in .env file (2024 format: pull zone URL without library_id in path), and MP4 Fallback is enabled in Bunny.net settings. Check Laravel logs for detailed API response.',
            ], 400);
        }

        \Log::info('Download URL generated successfully', [
            'video_id' => $video->id,
            'bunny_video_id' => $video->bunny_video_id,
            'quality' => $quality,
            'download_url' => $downloadUrl,
            'storage_zone_configured' => !empty(config('services.bunny.storage_zone_name')),
            'storage_access_key_configured' => !empty(config('services.bunny.storage_access_key')),
            'cdn_url_configured' => !empty(config('services.bunny.cdn_url')),
        ]);

        return response()->json([
            'success' => true,
            'download_url' => $downloadUrl,
            'quality' => $quality,
            'video_id' => $video->id,
            'title' => $video->title,
        ]);
    }

    /**
     * Proxy download - stream video through backend to bypass 403 errors
     * This method downloads the video from Bunny.net and streams it to the user
     */
    public function proxyDownload(Request $request, Video $video)
    {
        $user = Auth::user();

        // Check access permissions
        if (!$video->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this video.',
            ], 403);
        }

        // Check if download is allowed
        if (!$video->allow_download) {
            return response()->json([
                'success' => false,
                'message' => 'Download is not allowed for this video.',
            ], 403);
        }

        // Get Bunny.net video ID
        if (!$video->bunny_video_id) {
            return response()->json([
                'success' => false,
                'message' => 'Video does not have a Bunny.net video ID.',
            ], 400);
        }

        // Get quality from request (default: 720)
        $quality = $request->input('quality', '720');

        // Get download URL from Bunny.net service
        $downloadUrl = $this->bunnyNetService->getDownloadUrl($video->bunny_video_id, $quality);

        if (!$downloadUrl) {
            \Log::error('Failed to generate download URL for proxy download', [
                'video_id' => $video->id,
                'bunny_video_id' => $video->bunny_video_id,
                'quality' => $quality,
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Could not generate download URL.',
            ], 400);
        }

        try {
            \Log::info('Starting proxy download', [
                'video_id' => $video->id,
                'bunny_video_id' => $video->bunny_video_id,
                'download_url' => $downloadUrl,
            ]);

            // Get video filename
            $videoTitle = $video->title ?: 'video';
            $filename = preg_replace('/[^a-z0-9]/i', '_', $videoTitle) . '.mp4';

            // Use Guzzle HTTP client for streaming
            $client = new \GuzzleHttp\Client([
                'timeout' => 3600, // 1 hour timeout
                'stream' => true, // Enable streaming
            ]);

            try {
                $response = $client->get($downloadUrl, [
                    'headers' => [
                        'User-Agent' => 'Mozilla/5.0 (compatible; Laravel/10.0)',
                    ],
                ]);

                // Get content length from response
                $contentLength = $response->getHeader('Content-Length')[0] ?? null;
                $contentType = $response->getHeader('Content-Type')[0] ?? 'video/mp4';

                // Stream the video to the user
                return response()->streamDownload(function () use ($response) {
                    $body = $response->getBody();
                    while (!$body->eof()) {
                        echo $body->read(8192); // Read 8KB chunks
                        flush();
                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                    }
                }, $filename, [
                    'Content-Type' => $contentType,
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                ] + ($contentLength ? ['Content-Length' => $contentLength] : []));

            } catch (\GuzzleHttp\Exception\RequestException $e) {
                \Log::error('Failed to fetch video from Bunny.net', [
                    'status' => $e->getResponse() ? $e->getResponse()->getStatusCode() : 'N/A',
                    'error' => $e->getMessage(),
                    'url' => $downloadUrl,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to download video from Bunny.net. Please check Bunny.net security settings.',
                ], 500);
            }

        } catch (\Exception $e) {
            \Log::error('Proxy download error', [
                'video_id' => $video->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error downloading video: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available audio tracks for a video
     */
    public function getAudioTracks(Request $request, Video $video): JsonResponse
    {
        $user = Auth::user();

        // Check access permissions
        if (!$video->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this video.',
            ], 403);
        }

        if (!$video->bunny_video_id) {
            return response()->json([
                'success' => false,
                'message' => 'Video does not have a Bunny.net video ID.',
            ], 400);
        }

        $audioTracks = $this->bunnyNetService->getAudioTracks($video->bunny_video_id);

        return response()->json([
            'success' => true,
            'audio_tracks' => $audioTracks,
        ]);
    }

    /**
     * Get subtitles/transcriptions for a video
     */
    public function getSubtitles(Request $request, Video $video): JsonResponse
    {
        $user = Auth::user();

        // Check access permissions
        if (!$video->isAccessibleTo($user)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to this video.',
            ], 403);
        }

        $locale = $request->input('locale', 'en');
        
        // Get transcription based on locale
        $transcription = null;
        switch ($locale) {
            case 'es':
                $transcription = $video->transcription_es ?? $video->transcription;
                break;
            case 'pt':
                $transcription = $video->transcription_pt ?? $video->transcription;
                break;
            default:
                $transcription = $video->transcription_en ?? $video->transcription;
                break;
        }

        // Convert transcription to WebVTT format if available
        $webvtt = null;
        if ($transcription) {
            $webvtt = $this->convertTranscriptionToWebVTT($transcription, $video->duration);
        }

        return response()->json([
            'success' => true,
            'locale' => $locale,
            'transcription' => $transcription,
            'webvtt_url' => $webvtt ? route('api.videos.subtitles.vtt', ['video' => $video->id, 'locale' => $locale]) : null,
        ]);
    }

    /**
     * Serve WebVTT subtitle file
     */
    public function getSubtitleVtt(Request $request, Video $video, string $locale = 'en'): \Illuminate\Http\Response
    {
        $user = Auth::user();

        // Check access permissions
        if (!$video->isAccessibleTo($user)) {
            abort(403, 'You do not have access to this video.');
        }

        // Get transcription based on locale
        $transcription = null;
        switch ($locale) {
            case 'es':
                $transcription = $video->transcription_es ?? $video->transcription;
                break;
            case 'pt':
                $transcription = $video->transcription_pt ?? $video->transcription;
                break;
            default:
                $transcription = $video->transcription_en ?? $video->transcription;
                break;
        }

        if (!$transcription) {
            abort(404, 'Subtitle not found for this locale.');
        }

        $webvtt = $this->convertTranscriptionToWebVTT($transcription, $video->duration);

        return response($webvtt, 200, [
            'Content-Type' => 'text/vtt',
            'Content-Disposition' => "inline; filename=\"subtitle_{$locale}.vtt\"",
        ]);
    }

    /**
     * Convert plain text transcription to WebVTT format
     */
    private function convertTranscriptionToWebVTT(string $transcription, int $duration): string
    {
        // Simple conversion: split by sentences and create time-based cues
        // For a more sophisticated solution, you'd want to use speech-to-text timestamps
        
        $webvtt = "WEBVTT\n\n";
        
        // Split transcription into sentences
        $sentences = preg_split('/([.!?]+)/', $transcription, -1, PREG_SPLIT_DELIM_CAPTURE);
        $sentences = array_filter(array_map('trim', $sentences));
        
        $currentTime = 0;
        $sentenceDuration = $duration > 0 ? max(3, $duration / max(1, count($sentences))) : 5;
        
        foreach ($sentences as $index => $sentence) {
            if (empty($sentence)) continue;
            
            $startTime = $this->formatWebVTTTime($currentTime);
            $currentTime += $sentenceDuration;
            $endTime = $this->formatWebVTTTime(min($currentTime, $duration));
            
            $webvtt .= "{$startTime} --> {$endTime}\n";
            $webvtt .= "{$sentence}\n\n";
        }
        
        return $webvtt;
    }

    /**
     * Format time in WebVTT format (HH:MM:SS.mmm)
     */
    private function formatWebVTTTime(float $seconds): string
    {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        $milliseconds = floor(($secs - floor($secs)) * 1000);
        
        return sprintf('%02d:%02d:%02d.%03d', $hours, $minutes, floor($secs), $milliseconds);
    }

    /**
     * Check if video is accessible to user.
     */
    public function isAccessibleTo(Request $request, Video $video): JsonResponse
    {
        $user = Auth::user();
        $isAccessible = $video->isAccessibleTo($user);

        return response()->json([
            'success' => true,
            'data' => [
                'accessible' => $isAccessible,
                'video_id' => $video->id,
                'visibility' => $video->visibility,
                'user_subscription' => $user ? $user->subscription_type : 'freemium',
            ],
        ]);
    }

    /**
     * Re-encode video with web-compatible codecs (admin only)
     */
    public function reencode(Request $request, $id): JsonResponse
    {
        $video = Video::findOrFail($id);

        if (!$video->video_file_path) {
            return response()->json([
                'success' => false,
                'message' => 'Video has no file path to re-encode',
            ], 400);
        }

        $fullPath = storage_path('app/public/' . $video->video_file_path);
        
        if (!file_exists($fullPath)) {
            return response()->json([
                'success' => false,
                'message' => 'Video file not found: ' . $video->video_file_path,
            ], 404);
        }

        try {
            $options = [
                'audio_bitrate' => 128,
                'video_quality' => 23,
                'preset' => 'medium',
                'delete_original' => true,
            ];

            $result = $this->transcodingService->reencodeStorageVideo(
                $video->video_file_path,
                $options
            );

            if ($result['success']) {
                $video->video_file_path = $result['relative_path'];
                $video->file_size = $result['new_size'];
                $video->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Video re-encoded successfully',
                    'data' => [
                        'video' => $video,
                        'original_size' => $result['original_size'],
                        'new_size' => $result['new_size'],
                        'size_saved' => $result['original_size'] - $result['new_size'],
                    ],
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Re-encoding failed: ' . $result['message'],
                ], 500);
            }
        } catch (\Exception $e) {
            \Log::error('Video re-encoding failed', [
                'video_id' => $video->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Re-encoding failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get codec/media info for a video's current file (admin/debugging).
     */
    public function codecInfo($id): JsonResponse
    {
        $video = Video::findOrFail($id);

        if (!$video->video_file_path) {
            return response()->json([
                'success' => false,
                'message' => 'No local video_file_path set for this video.',
            ], 400);
        }

        $path = storage_path('app/public/' . $video->video_file_path);

        if (!file_exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'File does not exist at: ' . $video->video_file_path,
            ], 404);
        }

        try {
            $info = $this->transcodingService->getVideoInfo($path);

            return response()->json([
                'success' => true,
                'data' => [
                    'video_id' => $video->id,
                    'file' => $video->video_file_path,
                    'info' => $info,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to probe video: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Extract Bunny.net video ID from various URL formats
     * 
     * @param string|null $embedUrl Embed URL
     * @param string|null $videoId Direct video ID
     * @return string|null
     */
    private function extractBunnyVideoId(?string $embedUrl = null, ?string $videoId = null): ?string
    {
        // If video ID is directly provided, return it
        if ($videoId) {
            return $videoId;
        }

        // If embed URL is provided, extract video ID from it
        if ($embedUrl) {
            // Format 1: https://iframe.mediadelivery.net/embed/{library}/{video}
            if (preg_match('/\/embed\/[^\/]+\/([^\/\?]+)/', $embedUrl, $matches)) {
                return $matches[1];
            }
            
            // Format 2: https://iframe.mediadelivery.net/play/{library}/{video}
            if (preg_match('/\/play\/[^\/]+\/([^\/\?]+)/', $embedUrl, $matches)) {
                return $matches[1];
            }
            
            // Format 3: https://vz-xxxxx.b-cdn.net/{video}/play_720p.mp4
            if (preg_match('/\/([a-f0-9\-]{36})\//', $embedUrl, $matches)) {
                return $matches[1];
            }
            
            // Format 4: Direct video ID in URL (UUID format)
            if (preg_match('/([a-f0-9\-]{36})/', $embedUrl, $matches)) {
                return $matches[1];
            }
        }

        return null;
    }

    /**
     * Get Bunny.net video metadata (duration, file_size, etc.)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getBunnyVideoMetadata(Request $request): JsonResponse
    {
        $request->validate([
            'video_id' => 'nullable|string',
            'embed_url' => 'nullable|string',
        ]);

        $videoId = $request->input('video_id');
        $embedUrl = $request->input('embed_url');

        // Extract video ID from embed URL if provided
        $extractedVideoId = $this->extractBunnyVideoId($embedUrl, $videoId);

        if (!$extractedVideoId) {
            return response()->json([
                'success' => false,
                'message' => 'Could not extract video ID from embed URL or video_id. Please provide a valid Bunny.net embed URL or video ID.',
            ], 400);
        }

        try {
            $result = $this->bunnyNetService->getVideo($extractedVideoId);

            if (!$result['success']) {
                $errorMessage = $result['error'] ?? 'Failed to fetch video metadata from Bunny.net.';
                
                // Provide more specific error messages
                if (isset($result['error']) && strpos($result['error'], 'BUNNY_API_KEY') !== false) {
                    $errorMessage = 'Bunny.net API key is not configured. Please set BUNNY_API_KEY in your .env file.';
                } elseif (isset($result['error']) && strpos($result['error'], 'BUNNY_LIBRARY_ID') !== false) {
                    $errorMessage = 'Bunny.net Library ID is not configured. Please set BUNNY_LIBRARY_ID in your .env file.';
                } elseif (isset($result['status_code']) && $result['status_code'] == 401) {
                    $errorMessage = 'Bunny.net API authentication failed. Please check your BUNNY_API_KEY in .env file.';
                } elseif (isset($result['status_code']) && $result['status_code'] == 404) {
                    $errorMessage = 'Video not found in Bunny.net. Please check if the video ID is correct: ' . $extractedVideoId;
                } else {
                    $errorMessage = $result['error'] ?? 'Failed to fetch video metadata from Bunny.net. Please check your API credentials and video ID.';
                }
                
                \Log::error('Bunny.net metadata fetch failed', [
                    'video_id' => $extractedVideoId,
                    'error' => $errorMessage,
                    'result' => $result,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                    'video_id' => $extractedVideoId,
                ], isset($result['status_code']) ? $result['status_code'] : 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'video_id' => $extractedVideoId,
                    'duration' => $result['duration'], // Duration in seconds
                    'file_size' => $result['file_size'], // File size in bytes
                    'thumbnail_url' => $result['thumbnail_url'],
                    'captions' => $result['captions'] ?? [], // Available captions/transcriptions
                    'transcription' => $result['transcription'] ?? null, // Transcription data
                    'raw_data' => $result['data'], // Full response from Bunny.net
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('Bunny.net metadata fetch error', [
                'video_id' => $extractedVideoId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error fetching video metadata: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update duration for an existing video (used when fetching duration via Player.js)
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function updateDuration(Request $request, $id): JsonResponse
    {
        $request->validate([
            'duration' => 'required|integer|min:1',
        ]);

        $video = Video::findOrFail($id);
        
        // Check if user can edit this video
        if (!Auth::user()->isAdmin() && $video->instructor_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit this video.',
            ], 403);
        }

        $duration = (int) $request->input('duration');
        $video->duration = $duration;
        $video->save();

        \Log::info('Video duration updated', [
            'video_id' => $id,
            'duration_seconds' => $duration,
            'duration_formatted' => gmdate('H:i:s', $duration),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Video duration updated successfully.',
            'data' => [
                'id' => $video->id,
                'duration' => $duration,
                'duration_formatted' => gmdate('H:i:s', $duration),
            ],
        ]);
    }

    /**
     * Get trending videos (most views in last 7 days)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function trendingLast7Days(Request $request): JsonResponse
    {
        $user = Auth::user();
        $limit = $request->get('limit', 10);
        
        // Calculate date 7 days ago
        $sevenDaysAgo = now()->subDays(7);
        
        // Get videos with most views in last 7 days
        // Count views from user_progress where last_watched_at is within last 7 days
        $trendingVideos = Video::query()
            ->select('videos.*')
            ->selectRaw('COUNT(user_progress.id) as views_last_7_days')
            ->leftJoin('user_progress', function($join) use ($sevenDaysAgo) {
                $join->on('videos.id', '=', 'user_progress.video_id')
                     ->where('user_progress.last_watched_at', '>=', $sevenDaysAgo);
            })
            ->where('videos.status', 'published')
            ->groupBy('videos.id')
            ->having('views_last_7_days', '>', 0)
            ->orderBy('views_last_7_days', 'desc')
            ->orderBy('videos.views', 'desc')
            ->limit($limit)
            ->with(['series', 'instructor'])
            ->withCount('comments')
            ->get();
        
        // If we don't have enough videos with views in last 7 days, 
        // fall back to videos published in last 7 days sorted by total views
        if ($trendingVideos->count() < $limit) {
            $fallbackVideos = Video::query()
                ->where('status', 'published')
                ->where(function($query) use ($sevenDaysAgo) {
                    $query->where('published_at', '>=', $sevenDaysAgo)
                          ->orWhere('created_at', '>=', $sevenDaysAgo);
                })
                ->orderBy('views', 'desc')
                ->limit($limit - $trendingVideos->count())
                ->with(['series', 'instructor'])
                ->withCount('comments')
                ->get();
            
            // Merge and remove duplicates
            $existingIds = $trendingVideos->pluck('id')->toArray();
            $fallbackVideos = $fallbackVideos->reject(function($video) use ($existingIds) {
                return in_array($video->id, $existingIds);
            });
            
            $trendingVideos = $trendingVideos->merge($fallbackVideos)->take($limit);
        }
        
        // Apply visibility filters
        if ($user) {
            $subscriptionType = $user->subscription_type ?: 'freemium';
            $trendingVideos = $trendingVideos->filter(function($video) use ($subscriptionType) {
                return $video->isAccessibleTo($user);
            })->values();
        } else {
            $trendingVideos = $trendingVideos->filter(function($video) {
                return $video->visibility === 'freemium';
            })->values();
        }
        
        return response()->json([
            'success' => true,
            'data' => $trendingVideos,
        ]);
    }

    /**
     * Test Bunny.net API credentials
     * 
     * @return JsonResponse
     */
    public function testBunnyCredentials(): JsonResponse
    {
        // Check if user is admin
        if (!Auth::user() || !Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $results = [
            'credentials' => [],
            'api_test' => null,
            'all_valid' => false,
        ];

        // Check each credential
        $apiKey = config('services.bunny.api_key');
        $libraryId = config('services.bunny.library_id');
        $cdnUrl = config('services.bunny.cdn_url');
        $streamUrl = config('services.bunny.stream_url');

        $results['credentials'] = [
            'BUNNY_API_KEY' => [
                'set' => !empty($apiKey),
                'value_preview' => $apiKey ? substr($apiKey, 0, 8) . '...' . substr($apiKey, -4) : null,
            ],
            'BUNNY_LIBRARY_ID' => [
                'set' => !empty($libraryId),
                'value' => $libraryId,
            ],
            'BUNNY_CDN_URL' => [
                'set' => !empty($cdnUrl),
                'value' => $cdnUrl,
            ],
            'BUNNY_STREAM_URL' => [
                'set' => !empty($streamUrl),
                'value' => $streamUrl,
            ],
        ];

        // Check if all credentials are set
        $allSet = !empty($apiKey) && !empty($libraryId) && !empty($cdnUrl) && !empty($streamUrl);

        if (!$allSet) {
            return response()->json([
                'success' => false,
                'message' => 'Some credentials are missing. Please check your .env file.',
                'results' => $results,
            ], 400);
        }

        // Test API connection by trying to list videos
        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'AccessKey' => $apiKey,
            ])->timeout(10)->get("https://video.bunnycdn.com/library/{$libraryId}/videos?page=1&itemsPerPage=1");

            if ($response->successful()) {
                $results['api_test'] = [
                    'success' => true,
                    'status' => $response->status(),
                    'message' => 'API connection successful! Credentials are valid.',
                ];
                $results['all_valid'] = true;
            } else {
                $status = $response->status();
                $body = $response->body();
                
                $errorMessage = 'API connection failed';
                if ($status === 401) {
                    $errorMessage = 'Authentication failed. Please check your BUNNY_API_KEY.';
                } elseif ($status === 404) {
                    $errorMessage = 'Library not found. Please check your BUNNY_LIBRARY_ID.';
                }

                $results['api_test'] = [
                    'success' => false,
                    'status' => $status,
                    'message' => $errorMessage,
                    'response' => $body,
                ];
            }
        } catch (\Exception $e) {
            $results['api_test'] = [
                'success' => false,
                'message' => 'Error testing API: ' . $e->getMessage(),
                'exception' => get_class($e),
            ];
        }

        return response()->json([
            'success' => $results['all_valid'],
            'message' => $results['all_valid'] 
                ? 'All Bunny.net credentials are configured correctly!' 
                : 'Bunny.net credentials test failed. Please check the details below.',
            'results' => $results,
        ], $results['all_valid'] ? 200 : 400);
    }
}