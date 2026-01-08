<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\KidsSetting;
use App\Models\KidsVideo;
use App\Models\KidsResource;
use App\Models\KidsProduct;
use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class KidsManagementController extends Controller
{
    // ==================== SETTINGS ====================
    
    public function getSettings()
    {
        try {
            $settings = KidsSetting::all();
            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids settings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateSettings(Request $request)
    {
        try {
            $settings = $request->input('settings', []);
            
            foreach ($settings as $key => $value) {
                KidsSetting::set($key, $value);
            }

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating kids settings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function setHeroVideo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'video_id' => 'nullable|exists:videos,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            KidsSetting::set('hero_video_id', $request->video_id, 'video', 'Hero section featured video');

            return response()->json([
                'success' => true,
                'message' => 'Hero video set successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error setting hero video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to set hero video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== VIDEOS ====================
    
    public function getVideos()
    {
        try {
            $kidsVideos = KidsVideo::with('video')->orderBy('display_order')->get();
            return response()->json([
                'success' => true,
                'data' => $kidsVideos
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids videos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch videos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function addVideo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'video_id' => 'required|exists:videos,id|unique:kids_videos,video_id',
            'display_order' => 'nullable|integer',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $kidsVideo = KidsVideo::create($request->only([
                'video_id',
                'display_order',
                'is_featured',
                'is_active'
            ]));

            $kidsVideo->load('video');

            return response()->json([
                'success' => true,
                'message' => 'Video added to kids section successfully',
                'data' => $kidsVideo
            ]);
        } catch (\Exception $e) {
            Log::error('Error adding kids video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to add video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateVideo(Request $request, KidsVideo $kidsVideo)
    {
        $validator = Validator::make($request->all(), [
            'display_order' => 'nullable|integer',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $kidsVideo->update($request->only([
                'display_order',
                'is_featured',
                'is_active'
            ]));

            $kidsVideo->load('video');

            return response()->json([
                'success' => true,
                'message' => 'Video updated successfully',
                'data' => $kidsVideo
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating kids video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function removeVideo(KidsVideo $kidsVideo)
    {
        try {
            $kidsVideo->delete();

            return response()->json([
                'success' => true,
                'message' => 'Video removed from kids section successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error removing kids video: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove video',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reorderVideos(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'videos' => 'required|array',
            'videos.*.id' => 'required|exists:kids_videos,id',
            'videos.*.display_order' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            foreach ($request->videos as $videoData) {
                KidsVideo::where('id', $videoData['id'])->update([
                    'display_order' => $videoData['display_order']
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Videos reordered successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error reordering videos: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reorder videos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== RESOURCES ====================
    
    public function getResources()
    {
        try {
            $resources = KidsResource::orderBy('display_order')->get();
            return response()->json([
                'success' => true,
                'data' => $resources
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids resources: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch resources',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createResource(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'resource_type' => 'required|in:pdf,image,zip',
            'file' => 'required|file|max:51200', // 50MB max
            'thumbnail' => 'nullable|image|max:5120', // 5MB max
            'display_order' => 'nullable|integer',
            'is_active' => 'boolean',
            'tags' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $filePath = $request->file('file')->store('kids/resources', 'public');
            $fileSize = $request->file('file')->getSize();

            $thumbnailPath = null;
            if ($request->hasFile('thumbnail')) {
                $thumbnailPath = $request->file('thumbnail')->store('kids/thumbnails', 'public');
            }

            $resource = KidsResource::create([
                'title' => $request->title, // English title (source language)
                'description' => $request->description, // English description (source language)
                'resource_type' => $request->resource_type,
                'file_path' => $filePath,
                'thumbnail_path' => $thumbnailPath,
                'file_size' => $fileSize,
                'display_order' => $request->display_order ?? 0,
                'is_active' => $request->is_active ?? true,
                'tags' => $request->tags,
            ]);

            // Handle translations if provided
            if ($request->has('translations')) {
                $translations = is_string($request->translations) 
                    ? json_decode($request->translations, true) 
                    : $request->translations;
                
                if (is_array($translations)) {
                    foreach (['title', 'description'] as $field) {
                        if (isset($translations[$field])) {
                            foreach ($translations[$field] as $locale => $value) {
                                if ($locale !== 'en' && !empty($value)) {
                                    $resource->setTranslation($field, $locale, $value);
                                }
                            }
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Resource created successfully',
                'data' => $resource
            ]);
        } catch (\Exception $e) {
            Log::error('Error creating kids resource: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create resource',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getResource(KidsResource $resource)
    {
        $data = $resource->toArray();
        $data['all_translations'] = $resource->getAllTranslations();
        
        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function updateResource(Request $request, KidsResource $resource)
    {
        // Handle is_active specially for simple boolean updates
        if ($request->has('is_active') && count($request->all()) <= 2) {
            try {
                $resource->update([
                    'is_active' => $request->input('is_active') === '1' || $request->input('is_active') === true
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Resource status updated successfully',
                    'data' => $resource->fresh()
                ]);
            } catch (\Exception $e) {
                Log::error('Error updating resource status: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update resource status',
                    'error' => $e->getMessage()
                ], 500);
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'string|max:255',
            'description' => 'nullable|string',
            'resource_type' => 'in:pdf,image,zip',
            'file' => 'nullable|file|max:51200', // 50MB max
            'thumbnail' => 'nullable|image|max:5120', // 5MB max
            'display_order' => 'nullable|integer',
            'is_active' => 'nullable',
            'tags' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = [];
            
            if ($request->has('title')) $data['title'] = $request->input('title');
            if ($request->has('description')) $data['description'] = $request->input('description');
            if ($request->has('resource_type')) $data['resource_type'] = $request->input('resource_type');
            if ($request->has('display_order')) $data['display_order'] = (int)$request->input('display_order');
            if ($request->has('is_active')) $data['is_active'] = $request->input('is_active') === '1' || $request->input('is_active') === true;
            if ($request->has('tags')) {
                $tags = $request->input('tags');
                $data['tags'] = is_string($tags) ? json_decode($tags, true) : $tags;
            }

            // Handle translations if provided
            if ($request->has('translations')) {
                $translations = is_string($request->translations) 
                    ? json_decode($request->translations, true) 
                    : $request->translations;
                
                if (is_array($translations)) {
                    foreach (['title', 'description'] as $field) {
                        if (isset($translations[$field])) {
                            foreach ($translations[$field] as $locale => $value) {
                                if ($locale !== 'en' && !empty($value)) {
                                    $resource->setTranslation($field, $locale, $value);
                                }
                            }
                        }
                    }
                }
            }

            // Handle file update
            if ($request->hasFile('file')) {
                // Delete old file
                if ($resource->file_path) {
                    Storage::disk('public')->delete($resource->file_path);
                }
                $data['file_path'] = $request->file('file')->store('kids/resources', 'public');
                $data['file_size'] = $request->file('file')->getSize();
            }

            // Handle thumbnail update
            if ($request->hasFile('thumbnail')) {
                // Delete old thumbnail
                if ($resource->thumbnail_path) {
                    Storage::disk('public')->delete($resource->thumbnail_path);
                }
                $data['thumbnail_path'] = $request->file('thumbnail')->store('kids/thumbnails', 'public');
            }

            $resource->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Resource updated successfully',
                'data' => $resource->fresh()
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating kids resource: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update resource',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteResource(KidsResource $resource)
    {
        try {
            // Delete files
            if ($resource->file_path) {
                Storage::disk('public')->delete($resource->file_path);
            }
            if ($resource->thumbnail_path) {
                Storage::disk('public')->delete($resource->thumbnail_path);
            }

            $resource->delete();

            return response()->json([
                'success' => true,
                'message' => 'Resource deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting kids resource: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete resource',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reorderResources(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resources' => 'required|array',
            'resources.*.id' => 'required|exists:kids_resources,id',
            'resources.*.display_order' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            foreach ($request->resources as $resourceData) {
                KidsResource::where('id', $resourceData['id'])->update([
                    'display_order' => $resourceData['display_order']
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Resources reordered successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error reordering resources: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reorder resources',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ==================== PRODUCTS ====================
    
    public function getProducts()
    {
        try {
            $products = KidsProduct::orderBy('display_order')->get();
            return response()->json([
                'success' => true,
                'data' => $products
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching kids products: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function createProduct(Request $request)
    {
        // Parse FormData values - booleans come as strings '1' or '0'
        $data = $request->all();
        if (isset($data['in_stock'])) {
            $data['in_stock'] = $data['in_stock'] === '1' || $data['in_stock'] === true || $data['in_stock'] === 'true';
        }
        if (isset($data['is_featured'])) {
            $data['is_featured'] = $data['is_featured'] === '1' || $data['is_featured'] === true || $data['is_featured'] === 'true';
        }
        if (isset($data['is_active'])) {
            $data['is_active'] = $data['is_active'] === '1' || $data['is_active'] === true || $data['is_active'] === 'true';
        }
        
        $validator = Validator::make($data, [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'long_description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string',
            'image' => 'nullable|image|max:5120', // 5MB max
            'gallery_images' => 'nullable',
            'badge_text' => 'nullable|string|max:255',
            'badge_color' => 'nullable|string|max:255',
            'stock_quantity' => 'nullable|integer|min:0',
            'in_stock' => 'nullable',
            'display_order' => 'nullable|integer',
            'is_featured' => 'nullable',
            'is_active' => 'nullable',
            'sku' => 'nullable|string|max:255|unique:kids_products',
            'tags' => 'nullable',
            'external_link' => 'nullable|url',
            'translations' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('kids/products', 'public');
            }

            // Parse boolean values from FormData (they come as strings '1' or '0')
            $inStock = $request->has('in_stock') 
                ? ($request->in_stock === '1' || $request->in_stock === true || $request->in_stock === 'true')
                : true;
            $isFeatured = $request->has('is_featured')
                ? ($request->is_featured === '1' || $request->is_featured === true || $request->is_featured === 'true')
                : false;
            $isActive = $request->has('is_active')
                ? ($request->is_active === '1' || $request->is_active === true || $request->is_active === 'true')
                : true;

            $product = KidsProduct::create([
                'title' => $request->title, // English title (source language)
                'description' => $request->description ?? '', // English description (source language)
                'long_description' => $request->long_description ?? '', // English long description (source language)
                'price' => (float)$request->price,
                'original_price' => $request->has('original_price') ? (float)$request->original_price : null,
                'currency' => $request->currency ?? 'EUR',
                'image_path' => $imagePath,
                'gallery_images' => $request->gallery_images,
                'badge_text' => $request->badge_text ?? '', // English badge text (source language)
                'badge_color' => $request->badge_color ?? 'bg-primary',
                'stock_quantity' => $request->has('stock_quantity') ? (int)$request->stock_quantity : 0,
                'in_stock' => $inStock,
                'display_order' => $request->has('display_order') ? (int)$request->display_order : 0,
                'is_featured' => $isFeatured,
                'is_active' => $isActive,
                'sku' => $request->sku,
                'tags' => $request->tags,
                'external_link' => $request->external_link,
            ]);

            // Handle translations if provided
            if ($request->has('translations')) {
                $translations = is_string($request->translations) 
                    ? json_decode($request->translations, true) 
                    : $request->translations;
                
                if (is_array($translations)) {
                    foreach (['title', 'description', 'long_description', 'badge_text'] as $field) {
                        if (isset($translations[$field])) {
                            foreach ($translations[$field] as $locale => $value) {
                                if ($locale !== 'en' && !empty($value)) {
                                    $product->setTranslation($field, $locale, $value);
                                }
                            }
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Product created successfully',
                'data' => $product
            ]);
        } catch (\Exception $e) {
            Log::error('Error creating kids product: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getProduct(KidsProduct $product)
    {
        $data = $product->toArray();
        $data['all_translations'] = $product->getAllTranslations();
        
        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function updateProduct(Request $request, KidsProduct $product)
    {
        // Handle is_active specially for simple boolean updates
        if ($request->has('is_active') && count($request->all()) <= 2) {
            try {
                $product->update([
                    'is_active' => $request->input('is_active') === '1' || $request->input('is_active') === true
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Product status updated successfully',
                    'data' => $product->fresh()
                ]);
            } catch (\Exception $e) {
                Log::error('Error updating product status: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update product status',
                    'error' => $e->getMessage()
                ], 500);
            }
        }

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'long_description' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string',
            'image' => 'nullable|image|max:5120',
            'gallery_images' => 'nullable',
            'badge_text' => 'nullable|string|max:255',
            'badge_color' => 'nullable|string|max:255',
            'stock_quantity' => 'nullable|integer|min:0',
            'in_stock' => 'nullable',
            'display_order' => 'nullable|integer',
            'is_featured' => 'nullable',
            'is_active' => 'nullable',
            'sku' => 'nullable|string|max:255|unique:kids_products,sku,' . $product->id,
            'tags' => 'nullable',
            'external_link' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $data = [];
            
            if ($request->has('title')) $data['title'] = $request->input('title');
            if ($request->has('description')) $data['description'] = $request->input('description');
            if ($request->has('long_description')) $data['long_description'] = $request->input('long_description');
            if ($request->has('price')) $data['price'] = (float)$request->input('price');
            if ($request->has('original_price')) $data['original_price'] = (float)$request->input('original_price');
            if ($request->has('currency')) $data['currency'] = $request->input('currency');
            if ($request->has('badge_text')) $data['badge_text'] = $request->input('badge_text');
            if ($request->has('badge_color')) $data['badge_color'] = $request->input('badge_color');
            if ($request->has('stock_quantity')) $data['stock_quantity'] = (int)$request->input('stock_quantity');
            if ($request->has('in_stock')) $data['in_stock'] = $request->input('in_stock') === '1' || $request->input('in_stock') === true;
            if ($request->has('display_order')) $data['display_order'] = (int)$request->input('display_order');
            if ($request->has('is_featured')) $data['is_featured'] = $request->input('is_featured') === '1' || $request->input('is_featured') === true;
            if ($request->has('is_active')) $data['is_active'] = $request->input('is_active') === '1' || $request->input('is_active') === true;
            if ($request->has('sku')) $data['sku'] = $request->input('sku');
            if ($request->has('external_link')) $data['external_link'] = $request->input('external_link');
            
            if ($request->has('gallery_images')) {
                $gallery = $request->input('gallery_images');
                $data['gallery_images'] = is_string($gallery) ? json_decode($gallery, true) : $gallery;
            }
            if ($request->has('tags')) {
                $tags = $request->input('tags');
                $data['tags'] = is_string($tags) ? json_decode($tags, true) : $tags;
            }

            // Handle image update
            if ($request->hasFile('image')) {
                // Delete old image
                if ($product->image_path) {
                    Storage::disk('public')->delete($product->image_path);
                }
                $data['image_path'] = $request->file('image')->store('kids/products', 'public');
            }

            $product->update($data);

            // Handle translations if provided
            if ($request->has('translations')) {
                $translations = is_string($request->translations) 
                    ? json_decode($request->translations, true) 
                    : $request->translations;
                
                if (is_array($translations)) {
                    foreach (['title', 'description', 'long_description', 'badge_text'] as $field) {
                        if (isset($translations[$field])) {
                            foreach ($translations[$field] as $locale => $value) {
                                if ($locale !== 'en' && !empty($value)) {
                                    $product->setTranslation($field, $locale, $value);
                                }
                            }
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Product updated successfully',
                'data' => $product->fresh()
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating kids product: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function deleteProduct(KidsProduct $product)
    {
        try {
            // Delete image
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }

            $product->delete();

            return response()->json([
                'success' => true,
                'message' => 'Product deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting kids product: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete product',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reorderProducts(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'products' => 'required|array',
            'products.*.id' => 'required|exists:kids_products,id',
            'products.*.display_order' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            foreach ($request->products as $productData) {
                KidsProduct::where('id', $productData['id'])->update([
                    'display_order' => $productData['display_order']
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Products reordered successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error reordering products: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reorder products',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
