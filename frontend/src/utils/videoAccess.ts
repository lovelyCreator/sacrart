import { User } from '@/lib/api';

export type VideoVisibility = 'freemium' | 'basic' | 'premium';
export type SubscriptionType = 'freemium' | 'basic' | 'premium' | 'admin';

/**
 * Check if a video should show a lock icon (based on visibility level, not user access)
 * This shows the lock icon if the video requires a subscription higher than freemium
 * @param videoVisibility - The visibility level of the video ('freemium', 'basic', 'premium')
 * @returns true if the video should show a lock icon (requires subscription)
 */
export function shouldShowLockIcon(
  videoVisibility: VideoVisibility | string | null | undefined
): boolean {
  // If no visibility specified, assume freemium (no lock)
  if (!videoVisibility || videoVisibility === '' || videoVisibility === null || videoVisibility === undefined) {
    return false;
  }

  // Normalize visibility to lowercase for comparison
  const visibility = String(videoVisibility).toLowerCase().trim();

  // Show lock icon for basic and premium videos (require subscription)
  return visibility === 'basic' || visibility === 'premium';
}

/**
 * Check if a video is locked for the current user
 * @param videoVisibility - The visibility level of the video ('freemium', 'basic', 'premium')
 * @param userSubscription - The user's subscription type ('freemium', 'basic', 'premium', 'admin')
 * @returns true if the video is locked (user cannot access), false if accessible
 */
export function isVideoLocked(
  videoVisibility: VideoVisibility | string | null | undefined,
  userSubscription: SubscriptionType | string | null | undefined
): boolean {
  // If no visibility specified, assume freemium (accessible to all)
  if (!videoVisibility || videoVisibility === '' || videoVisibility === null || videoVisibility === undefined) {
    return false;
  }

  // Normalize visibility to lowercase for comparison
  const visibility = String(videoVisibility).toLowerCase().trim();

  // Admin can access everything (but we still show lock icon based on visibility)
  // For navigation blocking, we check if a non-admin user would be locked
  const isAdmin = userSubscription === 'admin' || String(userSubscription || '').toLowerCase() === 'admin';
  
  // Default to freemium if no user subscription
  const subscription = (userSubscription || 'freemium').toLowerCase().trim() as SubscriptionType;

  // Visibility hierarchy: freemium < basic < premium
  // User subscription hierarchy: freemium < basic < premium < admin

  if (visibility === 'freemium') {
    // Freemium videos are accessible to everyone
    return false;
  }

  if (visibility === 'basic') {
    // Basic videos require at least basic subscription
    // For admins, we still check if it would be locked for a freemium user
    if (isAdmin) {
      return false; // Admin can access, but lock icon is shown by shouldShowLockIcon
    }
    return subscription === 'freemium';
  }

  if (visibility === 'premium') {
    // Premium videos require premium subscription
    // For admins, we still check if it would be locked for a non-premium user
    if (isAdmin) {
      return false; // Admin can access, but lock icon is shown by shouldShowLockIcon
    }
    return subscription !== 'premium';
  }

  // Unknown visibility level, assume locked
  return true;
}

/**
 * Check if a video is accessible to the current user
 * @param videoVisibility - The visibility level of the video
 * @param userSubscription - The user's subscription type
 * @returns true if the video is accessible, false if locked
 */
export function canAccessVideo(
  videoVisibility: VideoVisibility | string | null | undefined,
  userSubscription: SubscriptionType | string | null | undefined
): boolean {
  return !isVideoLocked(videoVisibility, userSubscription);
}

/**
 * Get the lock message key based on video visibility level
 * @param videoVisibility - The visibility level of the video ('freemium', 'basic', 'premium')
 * @returns The i18n key for the lock message
 */
export function getLockMessageKey(
  videoVisibility: VideoVisibility | string | null | undefined
): string {
  if (!videoVisibility || videoVisibility === '' || videoVisibility === null || videoVisibility === undefined) {
    return 'video.locked';
  }

  const visibility = String(videoVisibility).toLowerCase().trim();

  if (visibility === 'basic') {
    return 'video.requires_basic_subscription';
  }

  if (visibility === 'premium') {
    return 'video.requires_premium_subscription';
  }

  return 'video.locked';
}
