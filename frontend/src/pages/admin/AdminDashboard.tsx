import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Eye,
  UserCheck,
  Video,
  Star,
  Gift,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { EuroIcon } from '@/components/icons/EuroIcon';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '@/services/analyticsApi';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { getPathWithLocale } = useLocale();
  const [overview, setOverview] = useState<any>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);
  const [topVideos, setTopVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { locale } = useLocale();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch all analytics data in parallel
        const [overviewRes, subscriptionRes, topVideosRes] = await Promise.all([
          analyticsApi.getOverview(),
          analyticsApi.getSubscriptionStats(),
          analyticsApi.getTopVideos({ limit: 10 }),
        ]);
        
        console.log('Overview Response:', overviewRes);
        console.log('Subscription Response:', subscriptionRes);
        console.log('Top Videos Response:', topVideosRes);
        
        // Safely set data with validation
        setOverview(overviewRes.success && overviewRes.data ? overviewRes.data : null);
        
        // Validate and normalize subscription stats
        if (subscriptionRes.success && subscriptionRes.data) {
          const stats = subscriptionRes.data;
          // Ensure subscription_breakdown values are numbers
          if (stats.subscription_breakdown) {
            const breakdown = stats.subscription_breakdown;
            stats.subscription_breakdown = {
              freemium: typeof breakdown.freemium === 'number' ? breakdown.freemium : parseFloat(String(breakdown.freemium || 0)) || 0,
              basic: typeof breakdown.basic === 'number' ? breakdown.basic : parseFloat(String(breakdown.basic || 0)) || 0,
              premium: typeof breakdown.premium === 'number' ? breakdown.premium : parseFloat(String(breakdown.premium || 0)) || 0,
            };
          }
          // Ensure revenue values are numbers
          if (stats.monthly_recurring_revenue != null) {
            stats.monthly_recurring_revenue = typeof stats.monthly_recurring_revenue === 'number' 
              ? stats.monthly_recurring_revenue 
              : parseFloat(String(stats.monthly_recurring_revenue || 0)) || 0;
          }
          if (stats.average_revenue_per_user != null) {
            stats.average_revenue_per_user = typeof stats.average_revenue_per_user === 'number' 
              ? stats.average_revenue_per_user 
              : parseFloat(String(stats.average_revenue_per_user || 0)) || 0;
          }
          setSubscriptionStats(stats);
        } else {
          setSubscriptionStats(null);
        }
        
        // Validate top videos
        if (topVideosRes.success && topVideosRes.data) {
          const videos = Array.isArray(topVideosRes.data) ? topVideosRes.data : [];
          // Ensure rating is a number for each video
          const normalizedVideos = videos.map((video: any) => ({
            ...video,
            rating: typeof video.rating === 'number' && !isNaN(video.rating) 
              ? video.rating 
              : (video.rating != null ? parseFloat(String(video.rating)) || 0 : 0),
            views: typeof video.views === 'number' && !isNaN(video.views) 
              ? video.views 
              : (video.views != null ? parseFloat(String(video.views)) || 0 : 0),
            completion_rate: typeof video.completion_rate === 'number' && !isNaN(video.completion_rate) 
              ? video.completion_rate 
              : (video.completion_rate != null ? parseFloat(String(video.completion_rate)) || 0 : 0),
          }));
          setTopVideos(normalizedVideos);
        } else {
          setTopVideos([]);
        }
        
      } catch (error: any) {
        console.error('Error loading analytics:', error);
        toast.error('Failed to load analytics data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [locale]); // Refetch when locale changes

  const formatCurrency = (amount: number | string | null | undefined) => {
    // Ensure amount is a valid number
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
    if (isNaN(numAmount)) {
      return new Intl.NumberFormat('en-EU', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(0);
    }
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatNumber = (num: number | string | null | undefined) => {
    // Ensure num is a valid number
    const numValue = typeof num === 'number' ? num : parseFloat(String(num || 0));
    if (isNaN(numValue) || !isFinite(numValue)) {
      return '0';
    }
    return new Intl.NumberFormat('en-US').format(numValue);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.loading_analytics')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state if data failed to load
  if (!overview || !subscriptionStats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.overview_performance')}</p>
        </div>
        <Card className="p-6">
          <div className="text-center py-8">
            <p className="text-lg font-medium mb-2">Failed to load analytics data</p>
            <p className="text-sm text-muted-foreground mb-4">
              Analytics data is currently unavailable. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              {t('admin.common_refresh')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: t('admin.total_users'),
      value: formatNumber(overview.total_users || 0),
      change: overview.user_growth_percentage ? `${overview.user_growth_percentage > 0 ? '+' : ''}${overview.user_growth_percentage}%` : 'N/A',
      changeType: (overview.user_growth_percentage || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: Users,
      description: t('admin.from_last_month')
    },
    {
      title: t('admin.active_subscriptions'),
      value: formatNumber(overview.active_subscriptions || 0),
      change: 'N/A',
      changeType: 'positive' as const,
      icon: UserCheck,
      description: t('admin.currently_active')
    },
    {
      title: t('admin.total_revenue'),
      value: formatCurrency(overview.total_revenue || 0),
      change: overview.revenue_growth_percentage ? `${overview.revenue_growth_percentage > 0 ? '+' : ''}${overview.revenue_growth_percentage}%` : 'N/A',
      changeType: (overview.revenue_growth_percentage || 0) >= 0 ? 'positive' as const : 'negative' as const,
      icon: EuroIcon,
      description: t('admin.this_month')
    },
    {
      title: t('admin.video_views'),
      value: formatNumber(overview.total_views || 0),
      change: 'N/A',
      changeType: 'positive' as const,
      icon: Eye,
      description: t('admin.all_time')
    },
    {
      title: t('admin.total_videos'),
      value: formatNumber(overview.total_videos || 0),
      change: 'N/A',
      changeType: 'positive' as const,
      icon: Video,
      description: t('admin.content_library')
    },
    {
      title: t('admin.total_categories'),
      value: formatNumber(overview.total_categories || 0),
      change: 'N/A',
      changeType: 'positive' as const,
      icon: Star,
      description: t('admin.content_categories')
    }
  ];

  const recentActivities = [
    { type: 'user_registered', message: 'New user John Doe registered with Premium plan', time: '2 minutes ago' },
    { type: 'payment_received', message: 'Payment received from Jane Smith (€19.99)', time: '15 minutes ago' },
    { type: 'video_uploaded', message: 'New video "Advanced React Patterns" uploaded', time: '1 hour ago' },
    { type: 'support_ticket', message: 'New support ticket from Mike Johnson', time: '2 hours ago' },
    { type: 'subscription_cancelled', message: 'Subscription cancelled by Sarah Wilson', time: '3 hours ago' },
  ];

  // topVideos is already loaded from API

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.overview_performance')}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            {t('admin.common_refresh')}
          </Button>
          <Button variant="outline">{t('admin.analytics_export_report')}</Button>
          <Button>{t('admin.analytics_generate')}</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
                <div className="flex flex-col items-end">
                  <Icon className="h-8 w-8 text-primary mb-2" />
                  <span className={`text-sm font-medium ${getChangeColor(stat.changeType)}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Subscription Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('admin.subscription_distribution')}</h3>
          </div>
          <div className="space-y-4">
            {subscriptionStats?.subscription_breakdown && (() => {
              // Safely extract and normalize values
              const getSafeNumber = (val: any): number => {
                if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
                  return val;
                }
                const parsed = parseFloat(String(val || 0));
                return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
              };
              
              const freemium = getSafeNumber(subscriptionStats.subscription_breakdown.freemium);
              const basic = getSafeNumber(subscriptionStats.subscription_breakdown.basic);
              const premium = getSafeNumber(subscriptionStats.subscription_breakdown.premium);
              const total = freemium + basic + premium;
              
              // Safe percentage calculation
              const getPercentage = (value: number, total: number): string => {
                if (total <= 0 || !isFinite(total) || !isFinite(value)) {
                  return '0.0';
                }
                const percentage = (value / total) * 100;
                return isNaN(percentage) || !isFinite(percentage) ? '0.0' : percentage.toFixed(1);
              };
              
              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm">{t('subscription.plan_names.freemium')}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{freemium}</div>
                      <div className="text-xs text-muted-foreground">
                        {getPercentage(freemium, total)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm">{t('subscription.plan_names.basic')}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{basic}</div>
                      <div className="text-xs text-muted-foreground">
                        {getPercentage(basic, total)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                      <span className="text-sm">{t('subscription.plan_names.premium')}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{premium}</div>
                      <div className="text-xs text-muted-foreground">
                        {getPercentage(premium, total)}%
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('admin.performance_metrics')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm">{t('admin.total_subscriptions')}</span>
              </div>
              <Badge variant="secondary">{subscriptionStats?.total_subscriptions || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm">{t('admin.active_subs_short')}</span>
              </div>
              <Badge variant="secondary">{subscriptionStats?.active_subscriptions || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm">{t('admin.mrr')}</span>
              </div>
              <Badge variant="secondary">{formatCurrency(subscriptionStats?.monthly_recurring_revenue || 0)}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('admin.quick_stats')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('admin.total_revenue')}</span>
              <span className="text-sm font-medium">{formatCurrency(overview?.total_revenue || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('admin.avg_revenue_user')}</span>
              <span className="text-sm font-medium">{formatCurrency(subscriptionStats?.average_revenue_per_user || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('admin.video_views')}</span>
              <span className="text-sm font-medium">{formatNumber(overview?.total_views || 0)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('admin.recent_activity')}</h3>
            <Button variant="outline" size="sm">{t('admin.dashboard_view_all')}</Button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Videos */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('admin.top_performing_videos')}</h3>
            <Button variant="outline" size="sm">{t('admin.dashboard_view_all')}</Button>
          </div>
          <div className="space-y-4">
            {topVideos.length > 0 ? (
              topVideos.map((video, index) => (
                <div key={video.id || index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{video.title}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {formatNumber(video.views || 0)} {t('admin.views_label')}
                      </span>
                      <span className="flex items-center">
                        <Star className="h-3 w-3 mr-1" />
                        {(() => {
                          try {
                            let r: number;
                            if (typeof video.rating === 'number' && !isNaN(video.rating) && isFinite(video.rating)) {
                              r = video.rating;
                            } else {
                              const parsed = parseFloat(String(video.rating || '0'));
                              r = isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
                            }
                            return (typeof r === 'number' && !isNaN(r) && isFinite(r)) ? r.toFixed(1) : '0.0';
                          } catch (error) {
                            console.error('Error formatting rating:', error, video);
                            return '0.0';
                          }
                        })()}
                      </span>
                      <span className="text-xs">
                        {video.completion_rate || 0}% {t('admin.completion')}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No videos found</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('admin.dashboard_quick_actions')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex-col" onClick={() => navigate(getPathWithLocale('/admin/users'))}>
            <Users className="h-6 w-6 mb-2" />
            <span className="text-sm">{t('admin.dashboard_add_user')}</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col" onClick={() => navigate(getPathWithLocale('/admin/content'))}>
            <Video className="h-6 w-6 mb-2" />
            <span className="text-sm">{t('admin.dashboard_upload_video')}</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col" onClick={() => navigate(getPathWithLocale('/admin/plans'))}>
            <CreditCard className="h-6 w-6 mb-2" />
            <span className="text-sm">{t('admin.dashboard_create_plan')}</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col" onClick={() => navigate(getPathWithLocale('/admin/coupons'))}>
            <Gift className="h-6 w-6 mb-2" />
            <span className="text-sm">{t('admin.dashboard_add_coupon')}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
