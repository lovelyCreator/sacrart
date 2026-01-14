<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Challenge;
use App\Models\UserChallenge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ChallengeManagementController extends Controller
{
    /**
     * Get all challenges (admin)
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

            $query = Challenge::query();

            // Filter by status
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            // Filter by featured
            if ($request->has('is_featured')) {
                $query->where('is_featured', $request->boolean('is_featured'));
            }

            // Search
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $challenges = $query->orderBy('display_order')
                ->orderBy('created_at', 'desc')
                ->paginate($request->input('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $challenges
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching challenges: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch challenges',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single challenge (admin)
     */
    public function show($id)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $challenge = Challenge::with('userChallenges')->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $challenge
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch challenge',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new challenge
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

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'instructions' => 'nullable|string',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
                'thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
                'display_order' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
                'is_featured' => 'nullable|boolean',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'tags' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $challenge = new Challenge();
            $challenge->title = $request->input('title');
            $challenge->description = $request->input('description');
            $challenge->instructions = $request->input('instructions');
            $challenge->display_order = $request->input('display_order', 0);
            $challenge->is_active = $request->input('is_active', true);
            $challenge->is_featured = $request->input('is_featured', false);
            $challenge->start_date = $request->input('start_date');
            $challenge->end_date = $request->input('end_date');
            $challenge->tags = $request->input('tags', []);

            // Handle image upload
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imagePath = $image->store('challenges', 'public');
                $challenge->image_path = 'storage/' . $imagePath;
                $challenge->image_url = asset('storage/' . $imagePath);
            }

            // Handle thumbnail upload
            if ($request->hasFile('thumbnail')) {
                $thumbnail = $request->file('thumbnail');
                $thumbnailPath = $thumbnail->store('challenges/thumbnails', 'public');
                $challenge->thumbnail_path = 'storage/' . $thumbnailPath;
                $challenge->thumbnail_url = asset('storage/' . $thumbnailPath);
            }

            $challenge->save();

            // Handle translations
            if ($request->has('translations')) {
                $translations = json_decode($request->input('translations'), true);
                if (is_array($translations)) {
                    foreach (['title', 'description', 'instructions'] as $field) {
                        if (isset($translations[$field])) {
                            foreach (['en', 'es', 'pt'] as $locale) {
                                if (isset($translations[$field][$locale]) && $locale !== 'en') {
                                    $challenge->setTranslation($field, $locale, $translations[$field][$locale]);
                                }
                            }
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Challenge created successfully',
                'data' => $challenge
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating challenge: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create challenge',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a challenge
     */
    public function update(Request $request, $id)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $challenge = Challenge::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'instructions' => 'nullable|string',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:10240',
                'thumbnail' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
                'display_order' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
                'is_featured' => 'nullable|boolean',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'tags' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            if ($request->has('title')) {
                $challenge->title = $request->input('title');
            }
            if ($request->has('description')) {
                $challenge->description = $request->input('description');
            }
            if ($request->has('instructions')) {
                $challenge->instructions = $request->input('instructions');
            }
            if ($request->has('display_order')) {
                $challenge->display_order = $request->input('display_order');
            }
            if ($request->has('is_active')) {
                $challenge->is_active = $request->input('is_active');
            }
            if ($request->has('is_featured')) {
                $challenge->is_featured = $request->input('is_featured');
            }
            if ($request->has('start_date')) {
                $challenge->start_date = $request->input('start_date');
            }
            if ($request->has('end_date')) {
                $challenge->end_date = $request->input('end_date');
            }
            if ($request->has('tags')) {
                $challenge->tags = $request->input('tags');
            }

            // Handle translations
            if ($request->has('translations')) {
                $translations = json_decode($request->input('translations'), true);
                if (is_array($translations)) {
                    foreach (['title', 'description', 'instructions'] as $field) {
                        if (isset($translations[$field])) {
                            foreach (['en', 'es', 'pt'] as $locale) {
                                if (isset($translations[$field][$locale]) && $locale !== 'en') {
                                    $challenge->setTranslation($field, $locale, $translations[$field][$locale]);
                                }
                            }
                        }
                    }
                }
            }

            // Handle image upload
            if ($request->hasFile('image')) {
                // Delete old image
                if ($challenge->image_path && Storage::disk('public')->exists(str_replace('storage/', '', $challenge->image_path))) {
                    Storage::disk('public')->delete(str_replace('storage/', '', $challenge->image_path));
                }

                $image = $request->file('image');
                $imagePath = $image->store('challenges', 'public');
                $challenge->image_path = 'storage/' . $imagePath;
                $challenge->image_url = asset('storage/' . $imagePath);
            }

            // Handle thumbnail upload
            if ($request->hasFile('thumbnail')) {
                // Delete old thumbnail
                if ($challenge->thumbnail_path && Storage::disk('public')->exists(str_replace('storage/', '', $challenge->thumbnail_path))) {
                    Storage::disk('public')->delete(str_replace('storage/', '', $challenge->thumbnail_path));
                }

                $thumbnail = $request->file('thumbnail');
                $thumbnailPath = $thumbnail->store('challenges/thumbnails', 'public');
                $challenge->thumbnail_path = 'storage/' . $thumbnailPath;
                $challenge->thumbnail_url = asset('storage/' . $thumbnailPath);
            }

            $challenge->save();

            return response()->json([
                'success' => true,
                'message' => 'Challenge updated successfully',
                'data' => $challenge
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating challenge: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update challenge',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a challenge
     */
    public function destroy($id)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $challenge = Challenge::findOrFail($id);

            // Delete associated images
            if ($challenge->image_path && Storage::disk('public')->exists(str_replace('storage/', '', $challenge->image_path))) {
                Storage::disk('public')->delete(str_replace('storage/', '', $challenge->image_path));
            }
            if ($challenge->thumbnail_path && Storage::disk('public')->exists(str_replace('storage/', '', $challenge->thumbnail_path))) {
                Storage::disk('public')->delete(str_replace('storage/', '', $challenge->thumbnail_path));
            }

            $challenge->delete();

            return response()->json([
                'success' => true,
                'message' => 'Challenge deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting challenge: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete challenge',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get challenge statistics
     */
    public function getStats($id)
    {
        try {
            $user = Auth::user();
            if (!$user || !$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $challenge = Challenge::findOrFail($id);

            $totalParticipants = UserChallenge::where('challenge_id', $challenge->id)->count();
            $completedCount = UserChallenge::where('challenge_id', $challenge->id)
                ->where('status', 'completed')
                ->count();
            $pendingCount = UserChallenge::where('challenge_id', $challenge->id)
                ->where('status', 'pending')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_participants' => $totalParticipants,
                    'completed_count' => $completedCount,
                    'pending_count' => $pendingCount,
                    'completion_rate' => $totalParticipants > 0 
                        ? round(($completedCount / $totalParticipants) * 100, 2) 
                        : 0,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch challenge statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
