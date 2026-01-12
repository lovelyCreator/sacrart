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
            
            $query = Challenge::active()
                ->orderBy('display_order')
                ->orderBy('created_at', 'desc');

            $challenges = $query->get();

            // If user is authenticated, include their status for each challenge
            if ($user) {
                $userChallengeIds = UserChallenge::where('user_id', $user->id)
                    ->where('status', 'completed')
                    ->pluck('challenge_id')
                    ->toArray();

                $challenges = $challenges->map(function ($challenge) use ($user, $userChallengeIds) {
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

                    return $challenge;
                });
            } else {
                // For non-authenticated users, set default values
                $challenges = $challenges->map(function ($challenge) {
                    $challenge->user_status = 'pending';
                    $challenge->is_completed = false;
                    $challenge->completed_at = null;
                    $challenge->generated_image_url = null;
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
}
