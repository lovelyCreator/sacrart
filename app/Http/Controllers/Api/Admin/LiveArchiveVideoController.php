<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LiveArchiveVideo;
use App\Services\BunnyNetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class LiveArchiveVideoController extends Controller
{
    protected $bunnyNetService;

    public function __construct(BunnyNetService $bunnyNetService)
    {
        $this->bunnyNetService = $bunnyNetService;
    }

    /**
     * Display a listing of the resource (public endpoint)
     */
    public function getPublic(Request $request)
    {
        try {
            $query = LiveArchiveVideo::where('status', 'published');

            // Search filter
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Year filter - filter by published_at year
            if ($request->has('year') && $request->year && $request->year !== 'all') {
                $year = (int) $request->year;
                $query->where(function($q) use ($year) {
                    $q->whereYear('published_at', $year)
                      ->orWhere(function($subQ) use ($year) {
                          // Fallback to created_at if published_at is null
                          $subQ->whereNull('published_at')
                               ->whereYear('created_at', $year);
                      });
                });
            }

            // Theme filter - filter by tags
            if ($request->has('theme') && $request->theme && $request->theme !== 'all') {
                $theme = $request->theme;
                $query->where(function($q) use ($theme) {
                    // Search for theme in tags JSON array
                    $q->whereJsonContains('tags', $theme)
                      ->orWhere('tags', 'like', '%"' . addslashes($theme) . '"%')
                      ->orWhere('tags', 'like', '%' . addslashes($theme) . '%');
                });
            }

            // Era filter - filter by section or tags
            if ($request->has('era') && $request->era && $request->era !== 'all') {
                $era = $request->era;
                if ($era === 'vintage') {
                    // Vintage era = twitch_classics section
                    $query->where('section', 'twitch_classics');
                } elseif ($era === 'current') {
                    // Current era = current_season section
                    $query->where('section', 'current_season');
                } else {
                    // Search in tags as fallback
                    $query->where(function($q) use ($era) {
                        $q->whereJsonContains('tags', $era)
                          ->orWhere('tags', 'like', '%"' . addslashes($era) . '"%')
                          ->orWhere('tags', 'like', '%' . addslashes($era) . '%');
                    });
                }
            }

            // Visibility filter (for public, only show freemium or based on user subscription)
            $user = Auth::user();
            $hasActiveSubscription = $user && method_exists($user, 'hasActiveSubscription') && $user->hasActiveSubscription();
            if (!$hasActiveSubscription) {
                $query->where('visibility', 'freemium');
            }

            // Pagination
            $perPage = $request->get('per_page', 50);
            $videos = $query->orderBy('published_at', 'desc')
                           ->orderBy('created_at', 'desc')
                           ->paginate($perPage);

            // Load translations for each video based on locale
            $locale = $request->header('Accept-Language', 'en');
            $locale = substr($locale, 0, 2);
            if (!in_array($locale, ['en', 'es', 'pt'])) {
                $locale = 'en';
            }

            $videos->getCollection()->transform(function ($video) use ($locale) {
                $translations = $video->getAllTranslations();
                if (isset($translations['title'][$locale]) && !empty($translations['title'][$locale])) {
                    $video->title = $translations['title'][$locale];
                }
                if (isset($translations['description'][$locale]) && !empty($translations['description'][$locale])) {
                    $video->description = $translations['description'][$locale];
                }
                
                // Ensure tags are properly cast as array
                if ($video->tags && !is_array($video->tags)) {
                    try {
                        $video->tags = json_decode($video->tags, true) ?? [];
                    } catch (\Exception $e) {
                        $video->tags = [];
                    }
                } elseif (!$video->tags) {
                    $video->tags = [];
                }
                
                // Ensure section field is included in response
                // Explicitly set section to ensure it's in the JSON response
                $video->makeVisible(['section']);
                if (!isset($video->section)) {
                    $video->section = null;
                }
                
                // Log section for debugging
                Log::debug('Live Archive Video section', [
                    'video_id' => $video->id,
                    'title' => $video->title,
                    'section' => $video->section,
                    'section_type' => gettype($video->section)
                ]);
                
                return $video;
            });

            return response()->json([
                'success' => true,
                'data' => $videos
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching public live archive videos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch live archive videos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single live archive video by ID (public endpoint)
     */
    public function getPublicById($id)
    {
        try {
            $video = LiveArchiveVideo::where('status', 'published')
                ->where('id', $id)
                ->first();

            if (!$video) {
                return response()->json([
                    'success' => false,
                    'message' => 'Video not found'
                ], 404);
            }

            // Check visibility
            $user = Auth::user();
            $hasActiveSubscription = $user && method_exists($user, 'hasActiveSubscription') && $user->hasActiveSubscription();
            if (!$hasActiveSubscription && $video->visibility !== 'freemium') {
                return response()->json([
                    'success' => false,
                    'message' => 'Video not available'
                ], 403);
            }

            // Load translations based on locale
            $locale = request()->header('Accept-Language', 'en');
            $locale = substr($locale, 0, 2);
            if (!in_array($locale, ['en', 'es', 'pt'])) {
                $locale = 'en';
            }

            $translations = $video->getAllTranslations();
            if (isset($translations['title'][$locale]) && !empty($translations['title'][$locale])) {
                $video->title = $translations['title'][$locale];
            }
            if (isset($translations['description'][$locale]) && !empty($translations['description'][$locale])) {
                $video->description = $translations['description'][$locale];
            }
            
            // Ensure tags are properly cast as array
            if ($video->tags && !is_array($video->tags)) {
                try {
                    $video->tags = json_decode($video->tags, true) ?? [];
                } catch (\Exception $e) {
                    $video->tags = [];
                }
            } elseif (!$video->tags) {
                $video->tags = [];
            }
            
            // Ensure section field is included
            $video->makeVisible(['section']);
            if (!isset($video->section)) {
                $video->section = null;
            }

            return response()->json([
                'success' => true,
                'data' => $video
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching public live archive video by ID', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch live archive video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of the resource (admin endpoint)
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $query = LiveArchiveVideo::query();

            // Search filter
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Status filter
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Visibility filter
            if ($request->has('visibility')) {
                $query->where('visibility', $request->visibility);
            }

            // Pagination
            $perPage = $request->get('per_page', 50);
            $videos = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // Load translations for each video
            $videos->getCollection()->transform(function ($video) {
                $video->translations = $video->getAllTranslations();
                return $video;
            });

            return response()->json([
                'success' => true,
                'data' => $videos
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching live archive videos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch live archive videos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Pre-process request data - handle tags if sent as JSON string
            $requestData = $request->all();
            
            // Handle tags - decode if it's a JSON string (from FormData)
            if ($request->has('tags')) {
                $tagsInput = $request->get('tags');
                if (is_string($tagsInput)) {
                    try {
                        $decoded = json_decode($tagsInput, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            $requestData['tags'] = $decoded;
                        } else {
                            // If it's not valid JSON, try to parse as comma-separated string
                            $tags = array_filter(array_map('trim', explode(',', $tagsInput)));
                            $requestData['tags'] = !empty($tags) ? array_values($tags) : [];
                        }
                    } catch (\Exception $e) {
                        $requestData['tags'] = [];
                    }
                } elseif (is_array($tagsInput)) {
                    $requestData['tags'] = $tagsInput;
                } else {
                    $requestData['tags'] = [];
                }
                $request->merge($requestData);
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'bunny_video_id' => 'nullable|string|max:255',
                'bunny_video_url' => 'nullable|url|max:500',
                'bunny_embed_url' => 'required|url|max:500',
                'bunny_thumbnail_url' => 'nullable|url|max:500',
                'thumbnail_url' => 'nullable|url|max:500',
                'duration' => 'nullable|integer|min:0',
                'status' => 'nullable|in:draft,published,archived',
                'visibility' => 'nullable|in:freemium,premium,exclusive',
                'is_free' => 'nullable|boolean',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'section' => 'nullable|in:current_season,twitch_classics,talks_questions',
                'meta_title' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string|max:500',
                'meta_keywords' => 'nullable|string|max:255',
                'translations' => 'nullable|array',
            ]);

            // Extract Bunny.net video ID from embed URL if not provided
            if (!isset($validated['bunny_video_id']) && isset($validated['bunny_embed_url'])) {
                $bunnyVideoId = $this->extractBunnyVideoId($validated['bunny_embed_url']);
                if ($bunnyVideoId) {
                    $validated['bunny_video_id'] = $bunnyVideoId;
                }
            }

            // Auto-extract duration from Bunny.net if available
            if (isset($validated['bunny_video_id']) && (!isset($validated['duration']) || $validated['duration'] == 0)) {
                try {
                    $bunnyMetadata = $this->bunnyNetService->getVideo($validated['bunny_video_id']);
                    if ($bunnyMetadata['success'] && isset($bunnyMetadata['duration']) && $bunnyMetadata['duration'] > 0) {
                        $validated['duration'] = (int) $bunnyMetadata['duration'];
                        Log::info('Auto-extracted duration from Bunny.net API', [
                            'video_id' => $validated['bunny_video_id'],
                            'duration' => $validated['duration'],
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to extract duration from Bunny.net: ' . $e->getMessage());
                }
            }

            // Set defaults
            $validated['status'] = $validated['status'] ?? 'published';
            $validated['visibility'] = $validated['visibility'] ?? 'freemium';
            $validated['is_free'] = $validated['is_free'] ?? true;
            $validated['duration'] = $validated['duration'] ?? 0;

            // Set published_at if status is published
            if ($validated['status'] === 'published') {
                $validated['published_at'] = now();
            }

            // Handle translations
            $translations = $validated['translations'] ?? null;
            unset($validated['translations']);

            // Log tags before saving
            Log::info('Creating live archive video with tags', [
                'tags' => $validated['tags'] ?? null,
                'tags_type' => gettype($validated['tags'] ?? null),
            ]);

            // Create the video
            $video = LiveArchiveVideo::create($validated);
            
            // Verify tags were saved
            $video->refresh();
            Log::info('Live archive video created', [
                'video_id' => $video->id,
                'saved_tags' => $video->tags,
                'tags_type' => gettype($video->tags),
            ]);

            // Save translations
            if ($translations && is_array($translations)) {
                foreach (['title', 'description'] as $field) {
                    if (isset($translations[$field])) {
                        foreach (['en', 'es', 'pt'] as $locale) {
                            if (isset($translations[$field][$locale]) && $locale !== 'en' && !empty($translations[$field][$locale])) {
                                $video->setTranslation($field, $locale, $translations[$field][$locale]);
                            }
                        }
                    }
                }
            }

            // Load translations for response
            $video->translations = $video->getAllTranslations();

            return response()->json([
                'success' => true,
                'message' => 'Live archive video created successfully',
                'data' => $video
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating live archive video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create live archive video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $video = LiveArchiveVideo::findOrFail($id);
            $video->translations = $video->getAllTranslations();

            return response()->json([
                'success' => true,
                'data' => $video
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching live archive video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch live archive video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $video = LiveArchiveVideo::findOrFail($id);

            // Pre-process request data - handle tags if sent as JSON string
            $requestData = $request->all();
            
            // Handle tags - decode if it's a JSON string (from FormData)
            if ($request->has('tags')) {
                $tagsInput = $request->get('tags');
                if (is_string($tagsInput)) {
                    try {
                        $decoded = json_decode($tagsInput, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            $requestData['tags'] = $decoded;
                        } else {
                            // If it's not valid JSON, try to parse as comma-separated string
                            $tags = array_filter(array_map('trim', explode(',', $tagsInput)));
                            $requestData['tags'] = !empty($tags) ? array_values($tags) : [];
                        }
                    } catch (\Exception $e) {
                        $requestData['tags'] = [];
                    }
                } elseif (is_array($tagsInput)) {
                    $requestData['tags'] = $tagsInput;
                } else {
                    $requestData['tags'] = [];
                }
                $request->merge($requestData);
            }

            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'bunny_video_id' => 'nullable|string|max:255',
                'bunny_video_url' => 'nullable|url|max:500',
                'bunny_embed_url' => 'sometimes|required|url|max:500',
                'bunny_thumbnail_url' => 'nullable|url|max:500',
                'thumbnail_url' => 'nullable|url|max:500',
                'duration' => 'nullable|integer|min:0',
                'status' => 'nullable|in:draft,published,archived',
                'visibility' => 'nullable|in:freemium,premium,exclusive',
                'is_free' => 'nullable|boolean',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'section' => 'nullable|in:current_season,twitch_classics,talks_questions',
                'meta_title' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string|max:500',
                'meta_keywords' => 'nullable|string|max:255',
                'translations' => 'nullable|array',
            ]);

            // Extract Bunny.net video ID from embed URL if not provided
            if (!isset($validated['bunny_video_id']) && isset($validated['bunny_embed_url'])) {
                $bunnyVideoId = $this->extractBunnyVideoId($validated['bunny_embed_url']);
                if ($bunnyVideoId) {
                    $validated['bunny_video_id'] = $bunnyVideoId;
                }
            }

            // Auto-extract duration from Bunny.net if bunny_embed_url or bunny_video_id is updated
            if ((isset($validated['bunny_embed_url']) || isset($validated['bunny_video_id'])) && 
                (!isset($validated['duration']) || $validated['duration'] == 0)) {
                $bunnyVideoId = $validated['bunny_video_id'] ?? $this->extractBunnyVideoId($validated['bunny_embed_url'] ?? $video->bunny_embed_url);
                if ($bunnyVideoId) {
                    try {
                        $bunnyMetadata = $this->bunnyNetService->getVideo($bunnyVideoId);
                        if ($bunnyMetadata['success'] && isset($bunnyMetadata['duration']) && $bunnyMetadata['duration'] > 0) {
                            $validated['duration'] = (int) $bunnyMetadata['duration'];
                            Log::info('Auto-extracted duration from Bunny.net API on update', [
                                'video_id' => $bunnyVideoId,
                                'duration' => $validated['duration'],
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::warning('Failed to extract duration from Bunny.net: ' . $e->getMessage());
                    }
                }
            }

            // Handle translations
            $translations = $validated['translations'] ?? null;
            unset($validated['translations']);

            // Update published_at if status changed to published
            if (isset($validated['status']) && $validated['status'] === 'published' && $video->status !== 'published') {
                $validated['published_at'] = now();
            }

            // Log tags before saving
            Log::info('Updating live archive video with tags', [
                'video_id' => $video->id,
                'tags' => $validated['tags'] ?? null,
                'tags_type' => gettype($validated['tags'] ?? null),
            ]);

            // Update the video
            $video->update($validated);
            
            // Verify tags were saved
            $video->refresh();
            Log::info('Live archive video updated', [
                'video_id' => $video->id,
                'saved_tags' => $video->tags,
                'tags_type' => gettype($video->tags),
            ]);

            // Update translations
            if ($translations && is_array($translations)) {
                foreach (['title', 'description'] as $field) {
                    if (isset($translations[$field])) {
                        foreach (['en', 'es', 'pt'] as $locale) {
                            if (isset($translations[$field][$locale]) && $locale !== 'en') {
                                if (!empty($translations[$field][$locale])) {
                                    $video->setTranslation($field, $locale, $translations[$field][$locale]);
                                }
                            }
                        }
                    }
                }
            }

            // Load translations for response
            $video->translations = $video->getAllTranslations();

            return response()->json([
                'success' => true,
                'message' => 'Live archive video updated successfully',
                'data' => $video
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating live archive video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update live archive video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $video = LiveArchiveVideo::findOrFail($id);
            $video->delete();

            return response()->json([
                'success' => true,
                'message' => 'Live archive video deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting live archive video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete live archive video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Extract Bunny.net video ID from embed URL
     */
    private function extractBunnyVideoId(?string $embedUrl): ?string
    {
        if (!$embedUrl) {
            return null;
        }

        // Pattern: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
        if (preg_match('/\/embed\/\d+\/([a-zA-Z0-9\-]+)/', $embedUrl, $matches)) {
            return $matches[1];
        }

        // Pattern: https://iframe.mediadelivery.net/embed/{videoId}
        if (preg_match('/\/embed\/([a-zA-Z0-9\-]+)/', $embedUrl, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Get subtitles/transcriptions for a live archive video
     */
    public function getSubtitles(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $video = LiveArchiveVideo::where('status', 'published')
                ->where('id', $id)
                ->first();

            if (!$video) {
                return response()->json([
                    'success' => false,
                    'message' => 'Video not found'
                ], 404);
            }

            // Check visibility
            $hasActiveSubscription = $user && method_exists($user, 'hasActiveSubscription') && $user->hasActiveSubscription();
            if (!$hasActiveSubscription && $video->visibility !== 'freemium') {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this video.'
                ], 403);
            }

            $locale = $request->input('locale', 'en');
            
            // Get transcription based on locale
            $transcription = null;
            $transcriptions = $video->transcriptions; // JSON field
            
            if ($transcriptions && is_array($transcriptions) && isset($transcriptions[$locale])) {
                $localeData = $transcriptions[$locale];
                
                if (is_array($localeData)) {
                    if (isset($localeData['text'])) {
                        $transcription = $localeData['text'];
                    } else if (isset($localeData['vtt'])) {
                        // Extract text from VTT if needed
                        $transcription = $localeData['vtt'];
                    }
                } else if (is_string($localeData)) {
                    $transcription = $localeData;
                }
            } else if ($transcriptions && is_array($transcriptions) && isset($transcriptions['en'])) {
                // Fallback to English
                $localeData = $transcriptions['en'];
                if (is_array($localeData) && isset($localeData['text'])) {
                    $transcription = $localeData['text'];
                } else if (is_string($localeData)) {
                    $transcription = $localeData;
                }
            }

            // Try to get WebVTT URL if available
            $webvtt = null;
            if ($transcriptions && is_array($transcriptions) && isset($transcriptions[$locale])) {
                $localeData = $transcriptions[$locale];
                if (is_array($localeData) && isset($localeData['webvtt_url'])) {
                    $webvtt = $localeData['webvtt_url'];
                }
            }

            return response()->json([
                'success' => true,
                'locale' => $locale,
                'transcription' => $transcription ? trim($transcription) : '',
                'webvtt_url' => $webvtt,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching live archive video subtitles', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subtitles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user progress for a live archive video
     */
    public function updateProgress(Request $request, $id)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $video = LiveArchiveVideo::where('status', 'published')
                ->where('id', $id)
                ->first();

            if (!$video) {
                return response()->json([
                    'success' => false,
                    'message' => 'Video not found'
                ], 404);
            }

            $validated = $request->validate([
                'time_watched' => 'required|integer|min:0',
                'video_duration' => 'required|integer|min:1',
                'progress_percentage' => 'nullable|integer|min:0|max:100',
                'is_completed' => 'nullable|boolean',
            ]);

            $timeWatched = $validated['time_watched'];
            $videoDuration = $validated['video_duration'];
            $progressPercentage = $validated['progress_percentage'] ?? round(($timeWatched / $videoDuration) * 100);
            $isCompleted = $validated['is_completed'] ?? ($progressPercentage >= 90);

            // Store progress in database
            $progress = \DB::table('live_archive_video_progress')
                ->where('user_id', $user->id)
                ->where('live_archive_video_id', $video->id)
                ->first();

            if ($progress) {
                // Update existing progress
                \DB::table('live_archive_video_progress')
                    ->where('user_id', $user->id)
                    ->where('live_archive_video_id', $video->id)
                    ->update([
                        'time_watched' => $timeWatched,
                        'last_position' => $timeWatched,
                        'progress_percentage' => $progressPercentage,
                        'is_completed' => $isCompleted,
                        'video_duration' => $videoDuration,
                        'last_watched_at' => now(),
                        'updated_at' => now(),
                    ]);
            } else {
                // Create new progress record
                \DB::table('live_archive_video_progress')->insert([
                    'user_id' => $user->id,
                    'live_archive_video_id' => $video->id,
                    'time_watched' => $timeWatched,
                    'last_position' => $timeWatched,
                    'progress_percentage' => $progressPercentage,
                    'is_completed' => $isCompleted,
                    'video_duration' => $videoDuration,
                    'last_watched_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Progress updated successfully',
                'data' => [
                    'video_id' => $video->id,
                    'time_watched' => $timeWatched,
                    'last_position' => $timeWatched,
                    'progress_percentage' => $progressPercentage,
                    'is_completed' => $isCompleted,
                    'video_duration' => $videoDuration,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating live archive video progress', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update progress',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user progress for a live archive video
     */
    public function getProgress($id)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $video = LiveArchiveVideo::where('status', 'published')
                ->where('id', $id)
                ->first();

            if (!$video) {
                return response()->json([
                    'success' => false,
                    'message' => 'Video not found'
                ], 404);
            }

            // Fetch progress from database
            $progress = \DB::table('live_archive_video_progress')
                ->where('user_id', $user->id)
                ->where('live_archive_video_id', $video->id)
                ->first();

            if ($progress) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'time_watched' => $progress->time_watched,
                        'last_position' => $progress->last_position,
                        'progress_percentage' => $progress->progress_percentage,
                        'is_completed' => (bool)$progress->is_completed,
                        'video_duration' => $progress->video_duration,
                        'last_watched_at' => $progress->last_watched_at,
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => null
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching live archive video progress', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch progress',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
