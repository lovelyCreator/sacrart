<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Challenge;
use App\Models\UserChallenge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ChallengeController extends Controller
{
    /**
     * Get all active challenges
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Check if we want all challenges (for archive) or just active ones
            $showAll = $request->boolean('all', false);
            
            if ($showAll) {
                // For archive: show all active challenges regardless of date range
                $query = Challenge::query()->where('is_active', true);
            } else {
                // For regular list: show only currently active challenges (with date filters)
                $query = Challenge::active();
            }
            
            $query->orderBy('display_order')
                ->orderBy('created_at', 'desc');

            $challenges = $query->get();

            // Get locale from request header or default to 'en'
            $locale = $request->header('Accept-Language', 'en');
            $locale = substr($locale, 0, 2);
            if (!in_array($locale, ['en', 'es', 'pt'])) {
                $locale = 'en';
            }

            // If user is authenticated, include their status for each challenge
            if ($user) {
                $userChallengeIds = UserChallenge::where('user_id', $user->id)
                    ->where('status', 'completed')
                    ->pluck('challenge_id')
                    ->toArray();

                $challenges = $challenges->map(function ($challenge) use ($user, $userChallengeIds, $locale) {
                    $userChallenge = UserChallenge::where('user_id', $user->id)
                        ->where('challenge_id', $challenge->id)
                        ->first();

                    $challenge->user_status = $userChallenge ? $userChallenge->status : 'pending';
                    $challenge->is_completed = in_array($challenge->id, $userChallengeIds);
                    $challenge->completed_at = $userChallenge && $userChallenge->isCompleted() 
                        ? $userChallenge->completed_at 
                        : null;
                    $challenge->generated_image_url = $userChallenge && $userChallenge->isCompleted() 
                        ? $userChallenge->getGeneratedImageUrl() 
                        : null;

                    // Apply localized translations
                    $translations = $challenge->getAllTranslations();
                    if (isset($translations['title'][$locale]) && !empty($translations['title'][$locale])) {
                        $challenge->title = $translations['title'][$locale];
                    }
                    if (isset($translations['description'][$locale]) && !empty($translations['description'][$locale])) {
                        $challenge->description = $translations['description'][$locale];
                    }
                    if (isset($translations['instructions'][$locale]) && !empty($translations['instructions'][$locale])) {
                        $challenge->instructions = $translations['instructions'][$locale];
                    }

                    return $challenge;
                });
            } else {
                // For non-authenticated users, set default values
                $challenges = $challenges->map(function ($challenge) use ($locale) {
                    $challenge->user_status = 'pending';
                    $challenge->is_completed = false;
                    $challenge->completed_at = null;
                    $challenge->generated_image_url = null;
                    
                    // Apply localized translations
                    $translations = $challenge->getAllTranslations();
                    if (isset($translations['title'][$locale]) && !empty($translations['title'][$locale])) {
                        $challenge->title = $translations['title'][$locale];
                    }
                    if (isset($translations['description'][$locale]) && !empty($translations['description'][$locale])) {
                        $challenge->description = $translations['description'][$locale];
                    }
                    if (isset($translations['instructions'][$locale]) && !empty($translations['instructions'][$locale])) {
                        $challenge->instructions = $translations['instructions'][$locale];
                    }
                    
                    return $challenge;
                });
            }

            return response()->json([
                'success' => true,
                'data' => $challenges
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch challenges',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single challenge by ID
     */
    public function show($id, Request $request)
    {
        try {
            $user = Auth::user();
            
            $challenge = Challenge::findOrFail($id);

            if (!$challenge->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Challenge not found or inactive'
                ], 404);
            }

            // Get locale from request header or default to 'en'
            $locale = $request->header('Accept-Language', 'en');
            $locale = substr($locale, 0, 2);
            if (!in_array($locale, ['en', 'es', 'pt'])) {
                $locale = 'en';
            }

            // Include user status if authenticated
            if ($user) {
                $userChallenge = UserChallenge::where('user_id', $user->id)
                    ->where('challenge_id', $challenge->id)
                    ->first();

                $challenge->user_status = $userChallenge ? $userChallenge->status : 'pending';
                $challenge->is_completed = $userChallenge ? $userChallenge->isCompleted() : false;
                $challenge->completed_at = $userChallenge && $userChallenge->isCompleted() 
                    ? $userChallenge->completed_at 
                    : null;
                $challenge->generated_image_url = $userChallenge && $userChallenge->isCompleted() 
                    ? $userChallenge->getGeneratedImageUrl() 
                    : null;
            } else {
                $challenge->user_status = 'pending';
                $challenge->is_completed = false;
                $challenge->completed_at = null;
                $challenge->generated_image_url = null;
            }

            // Apply localized translations
            $translations = $challenge->getAllTranslations();
            if (isset($translations['title'][$locale]) && !empty($translations['title'][$locale])) {
                $challenge->title = $translations['title'][$locale];
            }
            if (isset($translations['description'][$locale]) && !empty($translations['description'][$locale])) {
                $challenge->description = $translations['description'][$locale];
            }
            if (isset($translations['instructions'][$locale]) && !empty($translations['instructions'][$locale])) {
                $challenge->instructions = $translations['instructions'][$locale];
            }

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
     * Get user's challenges (with status)
     */
    public function getUserChallenges(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $userChallenges = UserChallenge::where('user_id', $user->id)
                ->with('challenge')
                ->get();

            $challenges = $userChallenges->map(function ($userChallenge) {
                $challenge = $userChallenge->challenge;
                if ($challenge) {
                    $challenge->user_status = $userChallenge->status;
                    $challenge->is_completed = $userChallenge->isCompleted();
                    $challenge->completed_at = $userChallenge->completed_at;
                    $challenge->generated_image_url = $userChallenge->getGeneratedImageUrl();
                }
                return $challenge;
            })->filter();

            return response()->json([
                'success' => true,
                'data' => $challenges
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user challenges',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark challenge as completed (called after successful image generation)
     */
    public function completeChallenge(Request $request, $id)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $validator = Validator::make($request->all(), [
                'image_id' => 'nullable|exists:videos,id',
                'generated_image_url' => 'nullable|url',
                'generated_image_path' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $challenge = Challenge::findOrFail($id);

            // Get or create user challenge entry
            $userChallenge = UserChallenge::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'challenge_id' => $challenge->id,
                ],
                [
                    'status' => 'pending',
                ]
            );

            // Mark as completed
            $userChallenge->markAsCompleted(
                $request->input('image_id'),
                $request->input('generated_image_url'),
                $request->input('generated_image_path')
            );

            return response()->json([
                'success' => true,
                'message' => 'Challenge completed successfully',
                'data' => [
                    'challenge_id' => $challenge->id,
                    'status' => 'completed',
                    'completed_at' => $userChallenge->completed_at,
                    'generated_image_url' => $userChallenge->getGeneratedImageUrl(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete challenge',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit a challenge proposal (upload submission)
     */
    public function submitProposal(Request $request, $id)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|max:255',
                'cover_image' => 'required|file|image|mimes:jpeg,png,jpg,webp,gif|max:10240',
                'process_video' => 'nullable|file|mimes:mp4,mov,avi|max:512000', // 500MB max
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $challenge = Challenge::findOrFail($id);

            // Handle cover image upload
            $coverImage = $request->file('cover_image');
            $coverImagePath = $coverImage->store('challenges/submissions', 'public');
            $coverImageUrl = asset('storage/' . $coverImagePath);

            // Handle process video upload if provided
            $processVideoUrl = null;
            if ($request->hasFile('process_video')) {
                $processVideo = $request->file('process_video');
                $processVideoPath = $processVideo->store('challenges/submissions/videos', 'public');
                $processVideoUrl = asset('storage/' . $processVideoPath);
            }

            // Get or create user challenge entry
            $userChallenge = UserChallenge::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'challenge_id' => $challenge->id,
                ],
                [
                    'status' => 'pending',
                ]
            );

            // Update with submission data
            $userChallenge->generated_image_url = $coverImageUrl;
            $userChallenge->generated_image_path = 'storage/' . $coverImagePath;
            if ($processVideoUrl) {
                // Store video URL in a way we can retrieve it later
                // For now, we'll store it in a JSON field or use generated_image_path for video
                // Note: You might want to add a separate 'process_video_url' field to the table
            }
            // Mark as completed
            $userChallenge->status = 'completed';
            $userChallenge->completed_at = now();
            $userChallenge->save();

            return response()->json([
                'success' => true,
                'message' => 'Proposal submitted successfully',
                'data' => [
                    'challenge_id' => $challenge->id,
                    'submission_id' => $userChallenge->id,
                    'image_url' => $userChallenge->generated_image_url,
                    'video_url' => $processVideoUrl,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit proposal',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get recent challenge submissions (public)
     */
    public function getRecentSubmissions(Request $request)
    {
        try {
            $limit = $request->input('limit', 20);
            
            $submissions = UserChallenge::where('status', 'completed')
                ->whereNotNull('generated_image_url')
                ->with(['user', 'challenge'])
                ->orderBy('completed_at', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($userChallenge) {
                    $imageUrl = $userChallenge->getGeneratedImageUrl();
                    
                    return [
                        'id' => $userChallenge->id,
                        'image' => $imageUrl,
                        'username' => $userChallenge->user ? ('@' . ($userChallenge->user->username ?? $userChallenge->user->name ?? 'user_' . $userChallenge->user_id)) : '@anonymous',
                        'avatar' => $userChallenge->user && $userChallenge->user->avatar ? $userChallenge->user->avatar : null,
                        'challenge_title' => $userChallenge->challenge ? $userChallenge->challenge->title : null,
                        'completed_at' => $userChallenge->completed_at ? $userChallenge->completed_at->toISOString() : null,
                    ];
                })
                ->filter(function ($submission) {
                    return !empty($submission['image']); // Only return submissions with valid images
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => $submissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent submissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
