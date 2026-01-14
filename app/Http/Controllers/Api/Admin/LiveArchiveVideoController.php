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

            // Create the video
            $video = LiveArchiveVideo::create($validated);

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

            // Update the video
            $video->update($validated);

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
}
