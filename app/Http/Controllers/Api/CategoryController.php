<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\WebpConversionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    protected $webpService;

    public function __construct(WebpConversionService $webpService)
    {
        $this->webpService = $webpService;
    }
    /**
     * Display a listing of categories.
     */
    public function index(Request $request): JsonResponse
    {
        // Ensure locale is set (should be set by SetLocale middleware, but ensure it's set)
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        // Check if this is an admin request (admin routes)
        $isAdminRequest = $request->is('api/admin/*');
        
        if ($isAdminRequest) {
            // Admin can see all categories (including inactive)
            $query = Category::ordered();
        } else {
            // Public users see only active categories
            $query = Category::active()->ordered();
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Include videos count
        // Videos belong to Series, and Series belong to Categories
        // So we count videos through the series relationship
        if ($request->boolean('with_counts')) {
            // Always use series relationship (Category -> Series -> Videos)
            // Load series with their video counts
            $query->with(['series' => function ($q) use ($isAdminRequest) {
                if (!$isAdminRequest) {
                    // For public requests, only count published series
                    $q->where('status', 'published');
                }
                $q->withCount(['videos' => function ($q2) use ($isAdminRequest) {
                    if (!$isAdminRequest) {
                        // For public requests, only count published videos
                        $q2->where('status', 'published');
                    }
                }]);
            }]);
        }

        $perPage = $request->get('per_page', 15);
        $categories = $query->paginate($perPage);

        // Load all translations for each category (for admin editing)
        if ($isAdminRequest) {
            foreach ($categories->items() as $category) {
                $category->translations = $category->getAllTranslations();
            }
        }

        // Calculate videos_count manually through series (Category -> Series -> Videos)
        if ($request->boolean('with_counts')) {
            foreach ($categories->items() as $category) {
                $totalVideos = 0;
                if ($category->relationLoaded('series')) {
                    foreach ($category->series as $series) {
                        $totalVideos += $series->videos_count ?? 0;
                    }
                }
                $category->videos_count = $totalVideos;
            }
        }

        \Log::info('Categories fetched:', [
            'total' => $categories->total(),
            'per_page' => $categories->perPage(),
            'current_page' => $categories->currentPage(),
            'count' => $categories->count()
        ]);

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Store a newly created category.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'icon' => 'nullable|string|max:255',
            'image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'image' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'translations' => 'nullable|string|json',
        ]);

        // Handle image file upload
        if ($request->hasFile('image_file')) {
            try {
                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('image_file'),
                    'data_section/image'
                );
                $validated['image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload category image: ' . $e->getMessage(),
                ], 500);
            }
        }

        // Generate slug if not provided
        $validated['slug'] = Str::slug($validated['name']);

        // Ensure is_active is set (default to true for new categories)
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
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
            // Name fields
            if (isset($translations['name'])) {
                $validated['name_en'] = $translations['name']['en'] ?? $validated['name'] ?? '';
                $validated['name_es'] = $translations['name']['es'] ?? '';
                $validated['name_pt'] = $translations['name']['pt'] ?? '';
            }
            // Description fields
            if (isset($translations['description'])) {
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
            }
        } else {
            // If no translations object, use main fields for English
            $validated['name_en'] = $validated['name'] ?? '';
            $validated['description_en'] = $validated['description'] ?? '';
        }
        
        // Remove translations from validated as it's not a model field
        unset($validated['translations']);

        try {
            \Log::info('Creating category with data:', $validated);
            
            $category = Category::create($validated);
            
            // Refresh to get any auto-generated fields
            $category->refresh();
            
            \Log::info('Category created successfully:', [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'is_active' => $category->is_active
            ]);

            // Load all translations for the response
            $category->translations = $category->getAllTranslations();

            return response()->json([
                'success' => true,
                'message' => 'Category created successfully.',
                'data' => $category,
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Category creation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'validated' => $validated,
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create category: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified category.
     */
    public function show(Category $category): JsonResponse
    {
        $category->load(['videos' => function ($q) {
            $q->where('status', 'published');
        }]);

        // Load all translations for the response
        $category->translations = $category->getAllTranslations();

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    /**
     * Update the specified category.
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Find category by ID instead of slug
        $category = Category::findOrFail($id);
        
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categories', 'name')->ignore($category->id),
            ],
            'description' => 'nullable|string',
            'color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'icon' => 'nullable|string|max:255',
            'image_file' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'image' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
            'status' => 'nullable|in:draft,published,archived',
            'visibility' => 'nullable|in:freemium,basic,premium',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        // Handle image file upload
        if ($request->hasFile('image_file')) {
            try {
                // Delete old image if exists
                if ($category->image) {
                    $this->webpService->deleteFile($category->image);
                }

                $imageUploadResult = $this->webpService->convertToWebP(
                    $request->file('image_file'),
                    'data_section/image'
                );
                $validated['image'] = $imageUploadResult['path'];
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload category image: ' . $e->getMessage(),
                ], 500);
            }
        }

        // Refresh model to ensure we have latest schema
        $category->refresh();
        
        // Get current values from database (raw attributes)
        $attributes = $category->getAttributes();
        $currentNameEn = $attributes['name_en'] ?? $category->getOriginal('name_en') ?? '';
        $currentDescriptionEn = $attributes['description_en'] ?? $category->getOriginal('description_en') ?? '';

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
            // Name fields - always set all three languages
            if (isset($translations['name'])) {
                $validated['name_en'] = $translations['name']['en'] ?? $validated['name'] ?? $currentNameEn ?? '';
                $validated['name_es'] = $translations['name']['es'] ?? '';
                $validated['name_pt'] = $translations['name']['pt'] ?? '';
            } else {
                // If name is in validated but not in translations, use it for English
                if (isset($validated['name'])) {
                    $validated['name_en'] = $validated['name'];
                    $validated['name_es'] = $validated['name_es'] ?? $currentNameEn ?? '';
                    $validated['name_pt'] = $validated['name_pt'] ?? '';
                }
            }
            // Description fields - always set all three languages
            if (isset($translations['description'])) {
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? $currentDescriptionEn ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
            } else {
                // If description is in validated but not in translations, use it for English
                if (isset($validated['description'])) {
                    $validated['description_en'] = $validated['description'];
                    $validated['description_es'] = $validated['description_es'] ?? $currentDescriptionEn ?? '';
                    $validated['description_pt'] = $validated['description_pt'] ?? '';
                }
            }
        } else {
            // If no translations object, use main fields for English if provided
            if (isset($validated['name'])) {
                $validated['name_en'] = $validated['name'];
                // Preserve existing translations if not provided
                $validated['name_es'] = $validated['name_es'] ?? $currentNameEn ?? '';
                $validated['name_pt'] = $validated['name_pt'] ?? '';
            }
            if (isset($validated['description'])) {
                $validated['description_en'] = $validated['description'];
                // Preserve existing translations if not provided
                $validated['description_es'] = $validated['description_es'] ?? $currentDescriptionEn ?? '';
                $validated['description_pt'] = $validated['description_pt'] ?? '';
            }
        }
        
        // Update slug if name changed (use English name)
        if (isset($validated['name_en']) && $currentNameEn !== $validated['name_en']) {
            $validated['slug'] = Str::slug($validated['name_en']);
        } elseif (isset($validated['name']) && $currentNameEn !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']);
        }
        
        // Remove translations from validated as it's not a model field
        unset($validated['translations']);

        $category->update($validated);

        // Load all translations for the response
        $category->translations = $category->getAllTranslations();

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully.',
            'data' => $category,
        ]);
    }

    /**
     * Remove the specified category.
     */
    public function destroy($id): JsonResponse
    {
        // Find category by ID instead of slug
        $category = Category::findOrFail($id);
        
        // Check if category has series
        $seriesCount = $category->series()->count();
        if ($seriesCount > 0) {
            // Check if any series have videos
            $totalVideos = 0;
            foreach ($category->series as $series) {
                $totalVideos += $series->videos()->count();
            }
            
            if ($totalVideos > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete category that contains {$seriesCount} series with {$totalVideos} videos. Please delete or move the series and videos first.",
                ], 422);
            }
            
            // If series exist but have no videos, we can delete them or prevent deletion
            // For safety, prevent deletion if series exist
            return response()->json([
                'success' => false,
                'message' => "Cannot delete category that contains {$seriesCount} series. Please delete the series first.",
            ], 422);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully.',
        ]);
    }

    /**
     * Get categories for public display (published series only).
     */
    public function public(): JsonResponse
    {
        try {
            // Load categories with series and their video counts
            // Videos belong to Series, Series belong to Categories
            $categories = Category::active()
                ->ordered()
                ->with(['series' => function ($q) {
                    // Only load published series for public view
                    $q->where('status', 'published')
                      ->withCount(['videos' => function ($q2) {
                          // Only count published videos
                          $q2->where('status', 'published');
                      }]);
                }])
                ->get();
            
            // Calculate videos_count for each category through series
            foreach ($categories as $category) {
                $totalVideos = 0;
                foreach ($category->series as $series) {
                    $totalVideos += $series->videos_count ?? 0;
                }
                $category->videos_count = $totalVideos;
            }

            return response()->json([
                'success' => true,
                'data' => $categories,
            ]);
        } catch (\Exception $e) {
            // If something fails, return categories without count
            \Log::error('Error loading videos count for categories: ' . $e->getMessage());
            $categories = Category::active()
                ->ordered()
                ->get();
            
            // Manually set videos_count to 0 for each category
            foreach ($categories as $category) {
                $category->videos_count = 0;
            }

            return response()->json([
                'success' => true,
                'data' => $categories,
            ]);
        }
    }
}