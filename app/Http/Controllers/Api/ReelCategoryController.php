<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReelCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ReelCategoryController extends Controller
{
    /**
     * Display a listing of reel categories.
     */
    public function index(Request $request): JsonResponse
    {
        $locale = $request->header('Accept-Language', app()->getLocale());
        $locale = in_array(substr($locale, 0, 2), ['en', 'es', 'pt']) ? substr($locale, 0, 2) : 'en';
        app()->setLocale($locale);
        
        $isAdminRequest = $request->is('api/admin/*');
        
        $query = ReelCategory::query();
        
        if (!$isAdminRequest) {
            $query->where('is_active', true);
        }
        
        $query->orderBy('sort_order', 'asc');
        
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        $perPage = $request->get('per_page', 100);
        $categories = $query->paginate($perPage);
        
        if ($isAdminRequest) {
            foreach ($categories->items() as $category) {
                $category->translations = $category->getAllTranslations();
            }
        }
        
        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Store a newly created reel category.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'translations' => 'nullable',
        ]);
        
        // Handle multilingual translations
        $translations = $request->input('translations');
        if (is_string($translations)) {
            $decoded = json_decode($translations, true);
            $translations = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
        }
        
        if ($translations && is_array($translations)) {
            if (isset($translations['name'])) {
                $validated['name_en'] = $translations['name']['en'] ?? $validated['name'] ?? '';
                $validated['name_es'] = $translations['name']['es'] ?? '';
                $validated['name_pt'] = $translations['name']['pt'] ?? '';
                // Also update the main name field if not provided
                if (!isset($validated['name'])) {
                    $validated['name'] = $validated['name_en'];
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
        } else {
            $validated['name_en'] = $validated['name'] ?? '';
            $validated['description_en'] = $validated['description'] ?? '';
        }
        
        $validated['slug'] = Str::slug($validated['name_en'] ?? $validated['name'] ?? '');
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        
        unset($validated['translations']);
        
        $category = ReelCategory::create($validated);
        $category->translations = $category->getAllTranslations();
        
        return response()->json([
            'success' => true,
            'message' => 'Reel category created successfully.',
            'data' => $category,
        ], 201);
    }

    /**
     * Update the specified reel category.
     */
    public function update(Request $request, ReelCategory $reelCategory): JsonResponse
    {
        \Log::info('🟢 [Backend] ReelCategory Update Request Received', [
            'id' => $reelCategory->id,
            'method' => $request->method(),
            'real_method' => $request->getMethod(),
            'all_input' => $request->all(),
            'input_name' => $request->input('name'),
            'input_translations' => $request->input('translations'),
            'input_method' => $request->input('_method'),
            'content_type' => $request->header('Content-Type'),
            'current_category' => [
                'name' => $reelCategory->name,
                'name_en' => $reelCategory->name_en,
                'name_es' => $reelCategory->name_es,
                'name_pt' => $reelCategory->name_pt,
            ],
        ]);
        
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:reel_categories,name,' . $reelCategory->id,
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'translations' => 'nullable',
        ]);
        
        \Log::info('🟢 [Backend] After validation', [
            'validated' => $validated,
        ]);
        
        // Handle multilingual translations
        $translations = $request->input('translations');
        \Log::info('🟢 [Backend] Translations input', [
            'raw' => $translations,
            'type' => gettype($translations),
        ]);
        
        if (is_string($translations)) {
            $decoded = json_decode($translations, true);
            $translations = json_last_error() === JSON_ERROR_NONE ? $decoded : null;
            \Log::info('🟢 [Backend] Decoded translations', [
                'decoded' => $translations,
                'json_error' => json_last_error_msg(),
            ]);
        }
        
        if ($translations && is_array($translations)) {
            \Log::info('🟢 [Backend] Processing translations array', [
                'translations' => $translations,
            ]);
            
            if (isset($translations['name'])) {
                // Prioritize translations over direct name field
                $validated['name_en'] = $translations['name']['en'] ?? $validated['name'] ?? $reelCategory->name_en ?? '';
                $validated['name_es'] = $translations['name']['es'] ?? '';
                $validated['name_pt'] = $translations['name']['pt'] ?? '';
                // Always update the main name field to match English translation
                $validated['name'] = $validated['name_en'];
                
                \Log::info('🟢 [Backend] Set name fields from translations', [
                    'name' => $validated['name'],
                    'name_en' => $validated['name_en'],
                    'name_es' => $validated['name_es'],
                    'name_pt' => $validated['name_pt'],
                ]);
            }
            if (isset($translations['description'])) {
                // Prioritize translations over direct description field
                $validated['description_en'] = $translations['description']['en'] ?? $validated['description'] ?? $reelCategory->description_en ?? '';
                $validated['description_es'] = $translations['description']['es'] ?? '';
                $validated['description_pt'] = $translations['description']['pt'] ?? '';
                // Always update the main description field to match English translation
                $validated['description'] = $validated['description_en'];
            }
        } else {
            \Log::info('🟢 [Backend] No translations provided, using direct fields');
            // If translations are not provided but name/description are, update the English versions
            if (isset($validated['name'])) {
                $validated['name_en'] = $validated['name'];
            }
            if (isset($validated['description'])) {
                $validated['description_en'] = $validated['description'];
            }
        }
        
        if (isset($validated['name']) || isset($validated['name_en'])) {
            $validated['slug'] = Str::slug($validated['name_en'] ?? $validated['name'] ?? $reelCategory->name_en ?? $reelCategory->name ?? '');
        }
        
        unset($validated['translations']);
        
        // Log what we're about to update for debugging
        \Log::info('🟢 [Backend] Before update', [
            'id' => $reelCategory->id,
            'validated' => $validated,
            'before_update' => [
                'name' => $reelCategory->name,
                'name_en' => $reelCategory->name_en,
                'name_es' => $reelCategory->name_es,
                'name_pt' => $reelCategory->name_pt,
            ],
        ]);
        
        $updated = $reelCategory->update($validated);
        
        // Refresh the model to ensure we have the latest data
        $reelCategory->refresh();
        
        \Log::info('🟢 [Backend] After update', [
            'id' => $reelCategory->id,
            'updated' => $updated,
            'after_update' => [
                'name' => $reelCategory->name,
                'name_en' => $reelCategory->name_en,
                'name_es' => $reelCategory->name_es,
                'name_pt' => $reelCategory->name_pt,
            ],
            'attributes' => $reelCategory->getAttributes(),
        ]);
        $reelCategory->translations = $reelCategory->getAllTranslations();
        
        return response()->json([
            'success' => true,
            'message' => 'Reel category updated successfully.',
            'data' => $reelCategory,
        ]);
    }

    /**
     * Remove the specified reel category.
     */
    public function destroy(ReelCategory $reelCategory): JsonResponse
    {
        $reelCategory->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Reel category deleted successfully.',
        ]);
    }
}
