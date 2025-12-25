<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Series;
use App\Services\WebpConversionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class SeriesController extends Controller
{
    protected $webpService;

    public function __construct(WebpConversionService $webpService)
    {
        $this->webpService = $webpService;
    }
    /**
     * Display a listing of series.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        // Ensure locale is set (should be set by SetLocale middleware, but ensure it's set)
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        // Check if series table exists, otherwise fallback to Category (for backward compatibility)
        $hasSeriesTable = Schema::hasTable('series');
        $query = $hasSeriesTable ? Series::query() : Category::query();

        // Check if this is an admin request (admin routes)
        $isAdminRequest = $request->is('api/admin/*');
        
        // Debug logging
        \Log::info('Series API Request', [
            'category_id' => $request->get('category_id'),
            'status' => $request->get('status'),
            'has_series_table' => $hasSeriesTable,
            'is_admin_request' => $isAdminRequest,
            'url' => $request->fullUrl(),
        ]);

        // Filter by category_id FIRST (series belong to categories)
        // This is the primary filter - we want series for a specific category
        if ($request->has('category_id')) {
            $categoryId = $request->get('category_id');
            if (Schema::hasTable('series')) {
                $query->where('category_id', $categoryId);
                \Log::info('Filtering series by category_id', [
                    'category_id' => $categoryId,
                    'total_series_in_db' => Series::count(),
                    'series_with_category_id' => Series::where('category_id', $categoryId)->count(),
                ]);
            } else {
                // Fallback for backward compatibility
                $query->where('id', $categoryId);
            }
        }

        // Note: We don't filter series by status - series should be shown regardless of status
        // Only videos/episodes are filtered by 'published' status
        // Series status is for internal use (draft/published/archived) but all should be visible

        // Filter by status (only if explicitly provided and not already filtered)
        // Note: For public requests, we already filter by 'published' above, so this is for additional filtering
        if ($request->has('status') && $isAdminRequest) {
            // Only apply additional status filter for admin requests
            // Public requests already filter by 'published' status above
            if (Schema::hasTable('series')) {
                $query->where('status', $request->get('status'));
            } else {
                // Fallback for backward compatibility
                $query->where('is_active', $request->get('status') === 'published');
            }
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->get('search');
            if (Schema::hasTable('series')) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            } else {
                // Fallback for backward compatibility
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'sort_order');
        $sortOrder = $request->get('sort_order', 'asc');
        
        if (Schema::hasTable('series')) {
            switch ($sortBy) {
                case 'title':
                case 'name':
                    $query->orderBy('title', $sortOrder);
                    break;
                case 'sort_order':
                    $query->orderBy('sort_order', $sortOrder);
                    break;
                default:
                    $query->orderBy('sort_order', 'asc');
            }
        } else {
            // Fallback for backward compatibility
            switch ($sortBy) {
                case 'name':
                    $query->orderBy('name', $sortOrder);
                    break;
                case 'sort_order':
                    $query->orderBy('sort_order', $sortOrder);
                    break;
                default:
                    $query->orderBy('sort_order', 'asc');
            }
        }

        // Load video count for each series (series contain episodes/videos)
        if (Schema::hasTable('series')) {
            $query->withCount(['videos' => function ($q) use ($isAdminRequest) {
                if (!$isAdminRequest) {
                    // For public requests, only count published videos/episodes
                    $q->where('status', 'published');
                }
            }]);
            
            // Also load category relationship for complete data
            $query->with('category:id,name,name_en,name_es,name_pt');
        }

        // Get the SQL query for debugging
        $sql = $query->toSql();
        $bindings = $query->getBindings();
        \Log::info('Series Query SQL', [
            'sql' => $sql,
            'bindings' => $bindings,
        ]);
        
        $series = $query->paginate($request->get('per_page', 15));
        
        \Log::info('Series Query Results', [
            'total' => $series->total(),
            'count' => $series->count(),
            'current_page' => $series->currentPage(),
            'per_page' => $series->perPage(),
            'has_more' => $series->hasMorePages(),
        ]);

        // Load all translations for each series (for admin editing)
        if ($isAdminRequest && Schema::hasTable('series')) {
            foreach ($series->items() as $serie) {
                if ($serie instanceof Series) {
                    $serie->translations = $serie->getAllTranslations();
                }
            }
        }

        // For public requests, also load translations for display
        if (!$isAdminRequest && Schema::hasTable('series')) {
            foreach ($series->items() as $serie) {
                if ($serie instanceof Series) {
                    // Load translations for multilingual display
                    $serie->translations = $serie->getAllTranslations();
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $series,
        ]);
    }

    /**
     * Store a newly created series.
     */
    public function store(Request $request): JsonResponse
    {
        // Check if series table exists
        if (!Schema::hasTable('series')) {
            return response()->json([
                'success' => false,
                'message' => 'Series table does not exist. Please run the migration first.',
            ], 500);
        }

        // Accept both category fields (name) and series fields (title) for compatibility
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'name' => 'nullable|string|max:255', // For backward compatibility
            'description' => 'nullable|string',
            'short_description' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'status' => 'nullable|in:draft,published,archived',
            'visibility' => 'nullable|in:freemium,basic,premium',
            'sort_order' => 'nullable|integer|min:0',
            'thumbnail' => 'nullable|string|max:255',
            'cover_image' => 'nullable|string|max:255',
            'trailer_url' => 'nullable|url|max:255',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'is_free' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'featured_until' => 'nullable|date',
            'tags' => 'nullable|json',
            'instructor_id' => 'nullable|exists:users,id',
            'translations' => 'nullable|array',
        ]);

        // Map name to title if title is not provided (for backward compatibility)
        if (!isset($validated['title']) && isset($validated['name'])) {
            $validated['title'] = $validated['name'];
        }
        
        // Validate that title exists
        if (!isset($validated['title']) || empty($validated['title'])) {
            return response()->json([
                'success' => false,
                'message' => 'Title is required.',
            ], 422);
        }
        
        // Check uniqueness
        if (Series::where('title', $validated['title'])->where('category_id', $validated['category_id'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'A series with this title already exists in this category.',
            ], 422);
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
        } else {
            // If no translations object, use main fields for English
            $validated['title_en'] = $validated['title'] ?? '';
            $validated['description_en'] = $validated['description'] ?? '';
            $validated['short_description_en'] = $validated['short_description'] ?? '';
        }
        
        // Generate slug from English title
        $validated['slug'] = Str::slug($validated['title_en'] ?? $validated['title'] ?? '');
        
        // Set default values
        if (!isset($validated['status'])) {
            $validated['status'] = 'draft';
        }
        if (!isset($validated['visibility'])) {
            $validated['visibility'] = 'freemium';
        }
        if (!isset($validated['is_free'])) {
            $validated['is_free'] = true;
        }
        if (!isset($validated['is_featured'])) {
            $validated['is_featured'] = false;
        }
        if (!isset($validated['sort_order'])) {
            // Get max sort_order for this category and add 1
            $maxSortOrder = Series::where('category_id', $validated['category_id'])->max('sort_order') ?? 0;
            $validated['sort_order'] = $maxSortOrder + 1;
        }
        if (!isset($validated['instructor_id'])) {
            $validated['instructor_id'] = Auth::id();
        }

        // Remove 'name' field as it's not in Series model
        unset($validated['name']);
        unset($validated['translations']); // Remove from validated data as it's not a model field
        
        // Ensure description is not null (database requires it)
        if (!isset($validated['description_en']) || empty($validated['description_en'])) {
            $validated['description_en'] = ''; // Set empty string instead of null
        }

        try {
            // Create the series
            $series = Series::create($validated);
            
            // Refresh to get any auto-generated fields
            $series->refresh();

            // Load all translations for the response
            $series->translations = $series->getAllTranslations();

            return response()->json([
                'success' => true,
                'message' => 'Series created successfully.',
                'data' => $series,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Series creation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'validated' => $validated
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create series: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified series.
     */
    public function show($id): JsonResponse
    {
        if (Schema::hasTable('series')) {
            $series = Series::findOrFail($id);
            $series->load('category');
            // Load all translations for the response
            $series->translations = $series->getAllTranslations();
            return response()->json([
                'success' => true,
                'data' => $series,
            ]);
        } else {
            // Fallback for backward compatibility
            $category = Category::findOrFail($id);
            return response()->json([
                'success' => true,
                'data' => $category,
            ]);
        }
    }

    /**
     * Update the specified series.
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Check if series table exists
        if (!Schema::hasTable('series')) {
            return response()->json([
                'success' => false,
                'message' => 'Series table does not exist. Please run the migration first.',
            ], 500);
        }

        $series = Series::findOrFail($id);
        
        // Check if user is admin
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to edit this series.',
            ], 403);
        }

        // Accept series fields
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string',
            'category_id' => 'nullable|exists:categories,id',
            'status' => 'nullable|in:draft,published,archived',
            'visibility' => 'nullable|in:freemium,basic,premium',
            'sort_order' => 'nullable|integer|min:0',
            'thumbnail' => 'nullable|string|max:255',
            'cover_image' => 'nullable|string|max:255',
            'trailer_url' => 'nullable|url|max:255',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'is_free' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
            'featured_until' => 'nullable|date',
            'tags' => 'nullable|json',
            'instructor_id' => 'nullable|exists:users,id',
        ]);
        
        // Check uniqueness if title is being updated
        if (isset($validated['title']) && $validated['title'] !== $series->title) {
            $categoryId = $validated['category_id'] ?? $series->category_id;
            if (Series::where('title', $validated['title'])
                ->where('category_id', $categoryId)
                ->where('id', '!=', $series->id)
                ->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'A series with this title already exists in this category.',
                ], 422);
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
        $currentTitleEn = $series->getAttributes()['title_en'] ?? $series->getOriginal('title_en') ?? '';
        $currentDescriptionEn = $series->getAttributes()['description_en'] ?? $series->getOriginal('description_en') ?? '';
        $currentShortDescriptionEn = $series->getAttributes()['short_description_en'] ?? $series->getOriginal('short_description_en') ?? '';

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
        }
        
        // Update slug if title changed (use English title)
        if (isset($validated['title_en']) && $currentTitleEn !== $validated['title_en']) {
            $validated['slug'] = Str::slug($validated['title_en']);
        } elseif (isset($validated['title']) && $currentTitleEn !== $validated['title']) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        // Ensure description is not null (database requires it)
        if (isset($validated['description_en']) && $validated['description_en'] === null) {
            $validated['description_en'] = '';
        }
        
        // Remove translations from validated as it's not a model field
        unset($validated['translations']);

        $series->update($validated);

        // Load all translations for the response
        $series->translations = $series->getAllTranslations();

        return response()->json([
            'success' => true,
            'message' => 'Series updated successfully.',
            'data' => $series->load('category'),
        ]);
    }

    /**
     * Remove the specified series (using category table).
     */
    public function destroy($id): JsonResponse
    {
        // Check if series table exists
        if (!Schema::hasTable('series')) {
            return response()->json([
                'success' => false,
                'message' => 'Series table does not exist. Please run the migration first.',
            ], 500);
        }

        $series = Series::findOrFail($id);
        
        // Check if user is admin
        if (!Auth::user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to delete this series.',
            ], 403);
        }

        // Check if series has videos
        if ($series->videos()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete series that contains videos. Please delete or move the videos first.',
            ], 422);
        }

        $series->delete();

        return response()->json([
            'success' => true,
            'message' => 'Series deleted successfully.',
        ]);
    }

    /**
     * Get featured series (using category table).
     */
    public function featured(Request $request): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->limit($request->get('limit', 10))
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Get popular series (using category table).
     */
    public function popular(Request $request): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->limit($request->get('limit', 10))
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Get new releases (using category table).
     */
    public function newReleases(Request $request): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->limit($request->get('limit', 10))
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Get recommended series for user (using category table).
     */
    public function recommended(Request $request): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->limit($request->get('limit', 10))
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }
}