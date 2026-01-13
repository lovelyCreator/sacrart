<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\SeriesController;
use App\Http\Controllers\Api\VideoController;
use App\Http\Controllers\Api\UserProgressController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SubscriptionPlanController;
use App\Http\Controllers\Api\PaymentTransactionController;
use App\Http\Controllers\Api\StripeController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\HeroBackgroundController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\LanguageController;
use App\Http\Controllers\Api\ReelController;
use App\Http\Controllers\Api\RewindController;
use App\Http\Controllers\Api\ReelCategoryController;
use App\Http\Controllers\Api\ChallengeController;
use App\Http\Controllers\Api\TranslationController;

// Preflight CORS for all API routes (avoid auth/csrf on OPTIONS)
Route::options('/{any}', function () {
    return response()->noContent();
})->where('any', '.*');

Route::get('/test', function() {
	return response()->json(['ok' => true]);
});

Route::get('/test-cors', function() {
	return response()->json(['cors' => 'working', 'origin' => request()->header('Origin')]);
});
// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public content routes
Route::get('/categories/public', [CategoryController::class, 'public']);
Route::get('/categories/homepage-featured', [CategoryController::class, 'homepageFeatured']);
Route::get('/series/featured', [SeriesController::class, 'featured']);
Route::get('/series/homepage-featured', [SeriesController::class, 'homepageFeatured']);
Route::get('/series/popular', [SeriesController::class, 'popular']);
Route::get('/series/new-releases', [SeriesController::class, 'newReleases']);

// Public FAQ routes
Route::get('/faqs', [FaqController::class, 'index']);
Route::get('/faqs/categories', [FaqController::class, 'categories']);

// Public Settings routes
Route::get('/settings/public', [SettingsController::class, 'getPublicSettings']);
Route::get('/youtube/stats', [SettingsController::class, 'getYouTubeStats']);

// Public Hero Backgrounds route
Route::get('/hero-backgrounds/public', [HeroBackgroundController::class, 'public']);

// Public Language routes
Route::get('/languages', [LanguageController::class, 'languages']);
Route::get('/locale', [LanguageController::class, 'getLocale']);
Route::get('/translations/{locale?}', [LanguageController::class, 'translations']);
Route::post('/locale', [LanguageController::class, 'setLocale']);

// Public Subscription Plans route
Route::get('/subscription-plans/public', [SubscriptionPlanController::class, 'public']);

// Public Testimonial routes
Route::get('/testimonials/public', [TestimonialController::class, 'public']);

// Public routes for videos and series (authentication optional)
Route::get('/series', [SeriesController::class, 'index']);
Route::get('/series/{series}', [SeriesController::class, 'show']);
Route::get('/videos', [VideoController::class, 'index']);
Route::get('/videos/trending-last-7-days', [VideoController::class, 'trendingLast7Days']);
Route::get('/videos/featured-process', [VideoController::class, 'featuredProcess']);
Route::get('/videos/{video}', [VideoController::class, 'show']);
Route::get('/videos/{video}/stream', [VideoController::class, 'stream']);
Route::get('/videos/{video}/subtitles/{locale?}', [VideoController::class, 'getSubtitleVtt'])->where('locale', '[a-z]{2}');
Route::get('/videos/{video}/transcription', [VideoController::class, 'getSubtitles']); // JSON transcription endpoint
Route::get('/reels/{reel}/transcription', [ReelController::class, 'getSubtitles']); // JSON transcription endpoint for reels
Route::get('/reels/{reel}/transcription/{locale}.vtt', [ReelController::class, 'getSubtitleVtt'])->name('api.reels.subtitles.vtt'); // WebVTT subtitle file for reels

// Public routes for reels and rewinds (authentication optional)
Route::get('/reels/public', [ReelController::class, 'getPublic']);
Route::get('/reels/{reel}', [ReelController::class, 'show']);
Route::get('/rewinds/public', [RewindController::class, 'getPublic']);
Route::get('/rewinds/{rewind}', [RewindController::class, 'show']);

// Public routes for Sacrart Kids (authentication optional)
Route::get('/kids/content', [\App\Http\Controllers\Api\KidsContentController::class, 'index']);
Route::get('/kids/videos', [\App\Http\Controllers\Api\KidsContentController::class, 'getVideos']);
Route::get('/kids/resources', [\App\Http\Controllers\Api\KidsContentController::class, 'getResources']);
Route::get('/kids/products', [\App\Http\Controllers\Api\KidsContentController::class, 'getProducts']);
Route::get('/kids/products/{id}', [\App\Http\Controllers\Api\KidsContentController::class, 'getProduct']);
Route::get('/kids/hero-video', [\App\Http\Controllers\Api\KidsContentController::class, 'getHeroVideo']);
Route::get('/kids/resources/{id}/download', [\App\Http\Controllers\Api\KidsContentController::class, 'downloadResource']);

// Public routes for Challenges (authentication optional)
Route::get('/challenges', [ChallengeController::class, 'index']);
Route::get('/challenges/{id}', [ChallengeController::class, 'show']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Video Comments (require authentication to read)
    Route::get('/videos/{video}/comments', [\App\Http\Controllers\Api\VideoCommentController::class, 'index']);
    // Payments (Stripe)
    Route::get('/payments/stripe/status', [StripeController::class, 'checkStatus']);
    Route::post('/payments/checkout', [StripeController::class, 'createCheckoutSession']);
    Route::post('/payments/stripe/portal', [StripeController::class, 'createCustomerPortalSession']);
    // Auth routes
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/subscription', [AuthController::class, 'updateSubscription']);

    // User Progress
    Route::prefix('progress')->group(function () {
        Route::get('/', [UserProgressController::class, 'index']);
        Route::get('/stats', [UserProgressController::class, 'getStats']);
        Route::get('/continue-watching', [UserProgressController::class, 'continueWatching']);
        Route::get('/favorites', [UserProgressController::class, 'favorites']);
        Route::get('/completed', [UserProgressController::class, 'completed']);
        Route::get('/video/{video}', [UserProgressController::class, 'getVideoProgress']);
        Route::get('/series/{series}', [UserProgressController::class, 'getSeriesProgress']);
        Route::put('/video/{video}', [UserProgressController::class, 'updateVideoProgress']);
        Route::post('/video/{video}/favorite', [UserProgressController::class, 'toggleFavorite']);
        Route::post('/video/{video}/like', [UserProgressController::class, 'toggleLike']);
        Route::post('/video/{video}/dislike', [UserProgressController::class, 'toggleDislike']);
        Route::post('/video/{video}/rate', [UserProgressController::class, 'rateVideo']);
        Route::get('/favorites/list', [UserProgressController::class, 'getFavorites']);
    });

    // User Challenges
    Route::prefix('challenges')->group(function () {
        Route::get('/my-challenges', [ChallengeController::class, 'getUserChallenges']);
        Route::post('/{id}/complete', [ChallengeController::class, 'completeChallenge']);
    });

    // Translation routes (authenticated)
    Route::post('/translate', [TranslationController::class, 'translate']);
    Route::post('/translate/fields', [TranslationController::class, 'translateFields']);

    // Admin routes
    Route::middleware('admin')->group(function () {
        // User Management
        Route::apiResource('users', UserController::class);
        Route::post('/users/{user}/toggle-status', [UserController::class, 'toggleStatus']);
        Route::post('/users/{user}/upgrade', [UserController::class, 'upgradeSubscription']);
        Route::get('/users-statistics', [UserController::class, 'statistics']);

        // Categories (Admin CRUD) - Use ID-based routing for admin operations
        Route::post('/admin/categories', [CategoryController::class, 'store']);
        Route::put('/admin/categories/{id}', [CategoryController::class, 'update']);
        Route::delete('/admin/categories/{id}', [CategoryController::class, 'destroy']);

        // Series (Admin CRUD) - Use ID-based routing for admin operations
        Route::post('/admin/series', [SeriesController::class, 'store']);
        Route::put('/admin/series/{id}', [SeriesController::class, 'update']);
        Route::delete('/admin/series/{id}', [SeriesController::class, 'destroy']);

        // Videos (Admin CRUD) - Use ID-based routing for admin operations
        // IMPORTANT: Specific routes (like bunny-metadata) must come BEFORE parameterized routes
        Route::get('/admin/videos/test-bunny-credentials', [VideoController::class, 'testBunnyCredentials']);
        Route::post('/admin/videos/bunny-metadata', [VideoController::class, 'getBunnyVideoMetadata']);
        Route::post('/admin/videos', [VideoController::class, 'store']);
        Route::put('/admin/videos/{id}', [VideoController::class, 'update']);
        Route::post('/admin/videos/{id}/update-duration', [VideoController::class, 'updateDuration']);
        Route::delete('/admin/videos/{id}', [VideoController::class, 'destroy']);
        Route::post('/admin/videos/{id}/reencode', [VideoController::class, 'reencode']);
        Route::get('/admin/videos/{id}/codec-info', [VideoController::class, 'codecInfo']);
        
        // Transcription processing routes
        Route::post('/admin/videos/{id}/process-transcription', [VideoController::class, 'processTranscription']);
        Route::get('/admin/videos/{id}/transcription-status', [VideoController::class, 'getTranscriptionStatus']);
        Route::post('/admin/videos/{id}/reprocess-language', [VideoController::class, 'reprocessLanguage']);
        
        // Admin read access to series and videos (for admin panel)
        Route::get('/admin/series', [SeriesController::class, 'index']);
        Route::get('/admin/series/{series}', [SeriesController::class, 'show']);
        Route::get('/admin/videos', [VideoController::class, 'index']);
        Route::get('/admin/videos/{video}', [VideoController::class, 'show']);
        Route::get('/admin/categories', [CategoryController::class, 'index']);

        // Reels (Admin CRUD)
        Route::get('/admin/reels', [ReelController::class, 'index']);
        Route::post('/admin/reels', [ReelController::class, 'store']);
        Route::get('/admin/reels/{reel}', [ReelController::class, 'show']);
        Route::put('/admin/reels/{reel}', [ReelController::class, 'update']);
        Route::delete('/admin/reels/{reel}', [ReelController::class, 'destroy']);
        
        // Reel transcription processing routes
        Route::post('/admin/reels/{id}/process-transcription', [ReelController::class, 'processTranscription']);

        // Reel Categories (Admin CRUD)
        Route::get('/admin/reel-categories', [ReelCategoryController::class, 'index']);
        Route::post('/admin/reel-categories', [ReelCategoryController::class, 'store']);
        Route::put('/admin/reel-categories/{reelCategory}', [ReelCategoryController::class, 'update']);
        Route::delete('/admin/reel-categories/{reelCategory}', [ReelCategoryController::class, 'destroy']);

        // Rewinds (Admin CRUD)
        Route::get('/admin/rewinds', [RewindController::class, 'index']);
        Route::post('/admin/rewinds', [RewindController::class, 'store']);
        Route::get('/admin/rewinds/{rewind}', [RewindController::class, 'show']);
        Route::put('/admin/rewinds/{rewind}', [RewindController::class, 'update']);
        Route::delete('/admin/rewinds/{rewind}', [RewindController::class, 'destroy']);

        // FAQ Management (Admin CRUD)
        Route::post('/admin/faqs', [FaqController::class, 'store']);
        Route::put('/admin/faqs/{faq}', [FaqController::class, 'update']);
        Route::delete('/admin/faqs/{faq}', [FaqController::class, 'destroy']);
        Route::get('/admin/faqs', [FaqController::class, 'adminIndex']);

        // Settings Management (Admin CRUD)
        Route::get('/admin/settings', [SettingsController::class, 'index']);
        Route::get('/admin/settings/{group}', [SettingsController::class, 'getByGroup']);
        Route::put('/admin/settings', [SettingsController::class, 'bulkUpdate']);

        // Subscription Plans Management (Admin CRUD)
        Route::prefix('admin/subscription-plans')->group(function () {
            Route::get('/', [SubscriptionPlanController::class, 'index']);
            Route::post('/', [SubscriptionPlanController::class, 'store']);
            Route::get('/public', [SubscriptionPlanController::class, 'public']);
            Route::get('/{plan}', [SubscriptionPlanController::class, 'show']);
            Route::put('/{plan}', [SubscriptionPlanController::class, 'update']);
            Route::patch('/{plan}', [SubscriptionPlanController::class, 'update']);
            Route::delete('/{plan}', [SubscriptionPlanController::class, 'destroy']);
            Route::post('/{plan}/toggle-status', [SubscriptionPlanController::class, 'toggleStatus']);
            Route::get('/{plan}/statistics', [SubscriptionPlanController::class, 'statistics']);
        });

        // Payment Transactions Management (Admin CRUD)
        Route::apiResource('admin/payment-transactions', PaymentTransactionController::class);
        Route::post('/admin/payment-transactions/{transaction}/mark-completed', [PaymentTransactionController::class, 'markCompleted']);
        Route::post('/admin/payment-transactions/{transaction}/mark-failed', [PaymentTransactionController::class, 'markFailed']);
        Route::post('/admin/payment-transactions/{transaction}/refund', [PaymentTransactionController::class, 'refund']);
        Route::get('/admin/payment-transactions/statistics', [PaymentTransactionController::class, 'statistics']);
        Route::get('/admin/payment-transactions/export', [PaymentTransactionController::class, 'export']);

        // Analytics and Reports (Admin only)
        Route::prefix('analytics')->group(function () {
            Route::get('/overview', [AnalyticsController::class, 'overview']);
            Route::get('/user-growth', [AnalyticsController::class, 'userGrowth']);
            Route::get('/revenue', [AnalyticsController::class, 'revenue']);
            Route::get('/top-videos', [AnalyticsController::class, 'topVideos']);
            Route::get('/subscription-stats', [AnalyticsController::class, 'subscriptionStats']);
            Route::get('/content-analytics', [AnalyticsController::class, 'contentAnalytics']);
            Route::get('/engagement-analytics', [AnalyticsController::class, 'engagementAnalytics']);
        });

        // Coupons Management (Admin CRUD)
        Route::prefix('admin/coupons')->group(function () {
            Route::get('/', [CouponController::class, 'index']);
            Route::post('/', [CouponController::class, 'store']);
            Route::post('/validate', [CouponController::class, 'validate']);
            Route::get('/{coupon}', [CouponController::class, 'show']);
            Route::put('/{coupon}', [CouponController::class, 'update']);
            Route::patch('/{coupon}', [CouponController::class, 'update']);
            Route::delete('/{coupon}', [CouponController::class, 'destroy']);
            Route::post('/{coupon}/toggle-status', [CouponController::class, 'toggleStatus']);
            Route::get('/{coupon}/statistics', [CouponController::class, 'statistics']);
            Route::get('/{coupon}/usage', [CouponController::class, 'usage']);
        });
        Route::get('/admin/coupons-statistics', [CouponController::class, 'overallStatistics']);

        // Support Tickets Management (Admin CRUD)
        Route::apiResource('support-tickets', SupportTicketController::class);
        Route::post('/support-tickets/{ticket}/assign', [SupportTicketController::class, 'assign']);
        Route::post('/support-tickets/{ticket}/resolve', [SupportTicketController::class, 'resolve']);
        Route::post('/support-tickets/{ticket}/close', [SupportTicketController::class, 'close']);
        Route::post('/support-tickets/{ticket}/reopen', [SupportTicketController::class, 'reopen']);
        Route::post('/support-tickets/{ticket}/add-reply', [SupportTicketController::class, 'addReply']);
        Route::get('/support-tickets/{ticket}/replies', [SupportTicketController::class, 'replies']);
        Route::get('/support-tickets-statistics', [SupportTicketController::class, 'statistics']);

        // Feedback Management (Admin CRUD)
        Route::apiResource('feedback', FeedbackController::class);
        Route::post('/feedback/{feedback}/assign', [FeedbackController::class, 'assign']);
        Route::post('/feedback/{feedback}/resolve', [FeedbackController::class, 'resolve']);
        Route::post('/feedback/{feedback}/reject', [FeedbackController::class, 'reject']);
        Route::get('/feedback/by-type/{type}', [FeedbackController::class, 'byType']);
        Route::get('/feedback/high-priority', [FeedbackController::class, 'highPriority']);
        Route::get('/admin/feedback-statistics', [FeedbackController::class, 'statistics']);

        // Hero Background Management (Admin CRUD)
        Route::apiResource('/admin/hero-backgrounds', HeroBackgroundController::class);
        Route::post('/admin/hero-backgrounds/{background}/toggle-status', [HeroBackgroundController::class, 'toggleStatus']);
        Route::get('/admin/hero-backgrounds/public', [HeroBackgroundController::class, 'public']);

        // Testimonial Management (Admin CRUD)
        Route::get('/admin/testimonials', [TestimonialController::class, 'index']);
        Route::post('/admin/testimonials', [TestimonialController::class, 'store']);
        Route::get('/admin/testimonials/{id}', [TestimonialController::class, 'show']);
        Route::put('/admin/testimonials/{id}', [TestimonialController::class, 'update']);
        Route::delete('/admin/testimonials/{id}', [TestimonialController::class, 'destroy']);
        Route::post('/admin/testimonials/{id}/toggle-approval', [TestimonialController::class, 'toggleApproval']);
        Route::post('/admin/testimonials/{id}/toggle-featured', [TestimonialController::class, 'toggleFeatured']);

        // Translation Management (Admin CRUD)
        Route::get('/admin/translations', [LanguageController::class, 'getAllTranslations']);
        Route::post('/admin/translations', [LanguageController::class, 'updateTranslation']);
        Route::post('/admin/translations/bulk', [LanguageController::class, 'bulkUpdateTranslations']);
        Route::delete('/admin/translations/{id}', [LanguageController::class, 'deleteTranslation']);

        // Challenges Management (Admin CRUD)
        Route::prefix('admin/challenges')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\Admin\ChallengeManagementController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\Admin\ChallengeManagementController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\Api\Admin\ChallengeManagementController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\Api\Admin\ChallengeManagementController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\Admin\ChallengeManagementController::class, 'destroy']);
            Route::get('/{id}/stats', [\App\Http\Controllers\Api\Admin\ChallengeManagementController::class, 'getStats']);
        });

        // Kids Content Management (Admin CRUD)
        Route::prefix('admin/kids')->group(function () {
            // Kids Settings
            Route::get('/settings', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'getSettings']);
            Route::put('/settings', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'updateSettings']);
            Route::post('/settings/hero-video', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'setHeroVideo']);
            
            // Kids Videos
            Route::get('/videos', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'getVideos']);
            Route::post('/videos', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'addVideo']);
            Route::delete('/videos/{kidsVideo}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'removeVideo']);
            Route::put('/videos/{kidsVideo}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'updateVideo']);
            Route::post('/videos/reorder', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'reorderVideos']);
            
            // Kids Resources
            Route::get('/resources', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'getResources']);
            Route::post('/resources', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'createResource']);
            Route::get('/resources/{resource}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'getResource']);
            Route::post('/resources/{resource}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'updateResource']); // POST for FormData
            Route::put('/resources/{resource}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'updateResource']);
            Route::delete('/resources/{resource}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'deleteResource']);
            Route::post('/resources/reorder', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'reorderResources']);
            
            // Kids Products
            Route::get('/products', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'getProducts']);
            Route::post('/products', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'createProduct']);
            Route::get('/products/{product}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'getProduct']);
            Route::post('/products/{product}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'updateProduct']); // POST for FormData
            Route::put('/products/{product}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'updateProduct']);
            Route::delete('/products/{product}', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'deleteProduct']);
            Route::post('/products/reorder', [\App\Http\Controllers\Api\Admin\KidsManagementController::class, 'reorderProducts']);
        });
    });

    // Public read access to categories
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);

    // Series (read access for authenticated users)
    Route::get('/series/{series}/videos', [VideoController::class, 'seriesVideos']);
    Route::get('/series/{series}/recommended', [SeriesController::class, 'recommended']);
    Route::get('/series/{series}/accessible', [SeriesController::class, 'isAccessibleTo']);

    // Videos (additional authenticated routes)
    Route::get('/videos/{video}/accessible', [VideoController::class, 'isAccessibleTo']);
    Route::get('/videos/{video}/download-url', [VideoController::class, 'getDownloadUrl']);
    Route::get('/videos/{video}/proxy-download', [VideoController::class, 'proxyDownload']);
    Route::get('/videos/{video}/audio-tracks', [VideoController::class, 'getAudioTracks']);
    Route::get('/videos/{video}/subtitles', [VideoController::class, 'getSubtitles']);

    // Video Comments (authenticated)
    Route::post('/videos/{video}/comments', [\App\Http\Controllers\Api\VideoCommentController::class, 'store']);
    Route::put('/comments/{comment}', [\App\Http\Controllers\Api\VideoCommentController::class, 'update']);
    Route::delete('/comments/{comment}', [\App\Http\Controllers\Api\VideoCommentController::class, 'destroy']);
    Route::post('/comments/{comment}/like', [\App\Http\Controllers\Api\VideoCommentController::class, 'toggleLike']);

    // User support and feedback routes
    Route::prefix('support-tickets')->group(function () {
        Route::get('/', [SupportTicketController::class, 'index']);
        Route::post('/', [SupportTicketController::class, 'store']);
        Route::get('/{ticket}', [SupportTicketController::class, 'show']);
        Route::post('/{ticket}/add-reply', [SupportTicketController::class, 'addReply']);
        Route::get('/{ticket}/replies', [SupportTicketController::class, 'replies']);
    });

    Route::prefix('feedback')->group(function () {
        Route::get('/', [FeedbackController::class, 'index']);
        Route::post('/', [FeedbackController::class, 'store']);
        Route::get('/{feedback}', [FeedbackController::class, 'show']);
    });

    // Coupon validation (public)
    Route::post('/coupons/validate', [CouponController::class, 'validate']);
    
    // Media upload routes (admin only)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/media/images', [\App\Http\Controllers\Api\MediaController::class, 'uploadImages']);
        Route::post('/media/videos', [\App\Http\Controllers\Api\MediaController::class, 'uploadVideos']);
        Route::get('/media/images', [\App\Http\Controllers\Api\MediaController::class, 'getImages']);
        Route::get('/media/videos', [\App\Http\Controllers\Api\MediaController::class, 'getVideos']);
        Route::delete('/media/files', [\App\Http\Controllers\Api\MediaController::class, 'deleteFile']);
        Route::post('/media/files/delete', [\App\Http\Controllers\Api\MediaController::class, 'deleteFile']); // POST alias for compatibility
    });
    
});

// Stripe webhook (public)
Route::post('/payments/stripe/webhook', [StripeController::class, 'webhook']);

