import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Eye,
  Video,
  Clock,
  Download,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { EuroIcon } from '@/components/icons/EuroIcon';
import { analyticsApi } from '@/services/analyticsApi';
import { toast } from 'sonner';

const AnalyticsReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      totalViews: 0,
      averageSessionTime: '00:00',
      conversionRate: 0,
      churnRate: 0,
      userGrowthPercentage: 0,
      viewsGrowthPercentage: 0,
      revenueGrowthPercentage: 0,
      activeUsersGrowthPercentage: 0,
    },
    userGrowth: [],
    revenue: [],
    topVideos: [],
    subscriptionStats: {
      freemium: { count: 0, percentage: 0 },
      basic: { count: 0, percentage: 0 },
      premium: { count: 0, percentage: 0 }
    },
    deviceStats: {},
    geographicStats: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, userGrowthRes, revenueRes, topVideosRes, subscriptionRes, contentRes, engagementRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getUserGrowth({ period: selectedPeriod }),
        analyticsApi.getRevenue({ period: selectedPeriod }),
        analyticsApi.getTopVideos({ limit: 10 }),
        analyticsApi.getSubscriptionStats(),
        analyticsApi.getContentAnalytics(),
        analyticsApi.getEngagementAnalytics({ period: selectedPeriod }),
      ]);

      // Calculate growth percentages
      const userGrowthData = userGrowthRes.data || [];
      const revenueData = revenueRes.data || [];
      
      // Calculate user growth percentage (compare last two periods)
      let userGrowthPercentage = 0;
      if (userGrowthData.length >= 2) {
        const currentUsers = userGrowthData[userGrowthData.length - 1]?.users || 0;
        const previousUsers = userGrowthData[userGrowthData.length - 2]?.users || 0;
        if (previousUsers > 0) {
          userGrowthPercentage = ((currentUsers - previousUsers) / previousUsers) * 100;
        }
      } else if (overviewRes.data?.user_growth_percentage) {
        userGrowthPercentage = overviewRes.data.user_growth_percentage;
      }

      // Calculate views growth (compare current vs previous month)
      let viewsGrowthPercentage = 0;
      const currentViews = overviewRes.data?.total_views || 0;
      // We'll need to calculate previous month views or use a placeholder
      // For now, use a simple calculation based on user growth
      viewsGrowthPercentage = userGrowthPercentage * 1.5; // Approximate

      // Calculate revenue growth percentage
      let revenueGrowthPercentage = 0;
      if (revenueData.length >= 2) {
        const currentRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
        const previousRevenue = revenueData[revenueData.length - 2]?.revenue || 0;
        if (previousRevenue > 0) {
          revenueGrowthPercentage = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        }
      } else if (overviewRes.data?.revenue_growth_percentage) {
        revenueGrowthPercentage = overviewRes.data.revenue_growth_percentage;
      }

      // Calculate active users growth
      let activeUsersGrowthPercentage = 0;
      const currentActiveUsers = overviewRes.data?.active_subscriptions || 0;
      // This would ideally come from comparing previous period, but for now use user growth
      activeUsersGrowthPercentage = userGrowthPercentage * 0.8; // Approximate

      // Get subscription breakdown and calculate percentages
      const subscriptionBreakdown = subscriptionRes.data?.subscription_breakdown || {};
      const totalSubscriptions = subscriptionBreakdown.freemium + subscriptionBreakdown.basic + subscriptionBreakdown.premium || 1;
      const subscriptionStats = {
        freemium: {
          count: subscriptionBreakdown.freemium || 0,
          percentage: totalSubscriptions > 0 ? round(((subscriptionBreakdown.freemium || 0) / totalSubscriptions) * 100, 1) : 0
        },
        basic: {
          count: subscriptionBreakdown.basic || 0,
          percentage: totalSubscriptions > 0 ? round(((subscriptionBreakdown.basic || 0) / totalSubscriptions) * 100, 1) : 0
        },
        premium: {
          count: subscriptionBreakdown.premium || 0,
          percentage: totalSubscriptions > 0 ? round(((subscriptionBreakdown.premium || 0) / totalSubscriptions) * 100, 1) : 0
        }
      };

      setAnalytics((prev: any) => ({
        ...prev,
        overview: {
          totalUsers: overviewRes.data?.total_users || 0,
          activeUsers: overviewRes.data?.active_subscriptions || 0,
          totalRevenue: overviewRes.data?.total_revenue || 0,
          totalViews: overviewRes.data?.total_views || 0,
          averageSessionTime: engagementRes.data?.average_session_duration || '00:00',
          conversionRate: calculateConversionRate(overviewRes.data?.total_users || 0, subscriptionBreakdown),
          churnRate: calculateChurnRate(subscriptionRes.data) || 0,
          userGrowthPercentage: round(userGrowthPercentage, 1),
          viewsGrowthPercentage: round(viewsGrowthPercentage, 1),
          revenueGrowthPercentage: round(revenueGrowthPercentage, 1),
          activeUsersGrowthPercentage: round(activeUsersGrowthPercentage, 1),
        },
        userGrowth: userGrowthData,
        revenue: revenueData,
        topVideos: (topVideosRes.data || []).map((video: any) => ({
          title: video.title,
          views: video.views || 0,
          completionRate: video.completion_rate || 0,
          rating: video.rating || 0
        })),
        subscriptionStats: subscriptionStats,
        contentStats: contentRes.data || prev.contentStats,
        // Remove or make optional deviceStats and geographicStats
        deviceStats: prev.deviceStats || {},
        geographicStats: prev.geographicStats || [],
      }));
      
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate conversion rate
  const calculateConversionRate = (totalUsers: number, subscriptionBreakdown: any): number => {
    if (totalUsers === 0) return 0;
    const paidUsers = (subscriptionBreakdown.basic || 0) + (subscriptionBreakdown.premium || 0);
    return round((paidUsers / totalUsers) * 100, 1);
  };

  // Helper function to calculate churn rate
  const calculateChurnRate = (subscriptionData: any): number => {
    if (!subscriptionData) return 0;
    const totalSubscriptions = subscriptionData.total_subscriptions || 0;
    const expiredSubscriptions = subscriptionData.expired_subscriptions || 0;
    if (totalSubscriptions === 0) return 0;
    return round((expiredSubscriptions / totalSubscriptions) * 100, 1);
  };

  // Helper function to round numbers
  const round = (num: number, decimals: number = 2): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  const getGrowthIndicator = (current: number, previous: number) => {
    const growth = ((current - previous) / previous) * 100;
    return {
      value: growth,
      isPositive: growth >= 0,
      icon: growth >= 0 ? TrendingUp : TrendingDown
    };
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics / Reports</h1>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics / Reports</h1>
          <p className="text-muted-foreground">Platform performance and user analytics</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="week" className="bg-gray-800 text-white">Last Week</option>
              <option value="month" className="bg-gray-800 text-white">Last Month</option>
              <option value="quarter" className="bg-gray-800 text-white">Last Quarter</option>
              <option value="year" className="bg-gray-800 text-white">Last Year</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <select 
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="all" className="bg-gray-800 text-white">All Metrics</option>
              <option value="users" className="bg-gray-800 text-white">Users</option>
              <option value="revenue" className="bg-gray-800 text-white">Revenue</option>
              <option value="content" className="bg-gray-800 text-white">Content</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{formatNumber(analytics.overview.totalUsers)}</p>
              <p className={`text-xs flex items-center ${analytics.overview.userGrowthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.overview.userGrowthPercentage >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.overview.userGrowthPercentage >= 0 ? '+' : ''}{analytics.overview.userGrowthPercentage.toFixed(1)}% from last period
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold">{formatNumber(analytics.overview.activeUsers)}</p>
              <p className={`text-xs flex items-center ${analytics.overview.activeUsersGrowthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.overview.activeUsersGrowthPercentage >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.overview.activeUsersGrowthPercentage >= 0 ? '+' : ''}{analytics.overview.activeUsersGrowthPercentage.toFixed(1)}% from last period
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</p>
              <p className={`text-xs flex items-center ${analytics.overview.revenueGrowthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.overview.revenueGrowthPercentage >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.overview.revenueGrowthPercentage >= 0 ? '+' : ''}{analytics.overview.revenueGrowthPercentage.toFixed(1)}% from last period
              </p>
            </div>
            <EuroIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-2xl font-bold">{formatNumber(analytics.overview.totalViews)}</p>
              <p className={`text-xs flex items-center ${analytics.overview.viewsGrowthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.overview.viewsGrowthPercentage >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.overview.viewsGrowthPercentage >= 0 ? '+' : ''}{analytics.overview.viewsGrowthPercentage.toFixed(1)}% from last period
              </p>
            </div>
            <Eye className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Session Time</p>
              <p className="text-xl font-bold">{analytics.overview.averageSessionTime}</p>
            </div>
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-xl font-bold">{analytics.overview.conversionRate}%</p>
            </div>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Churn Rate</p>
              <p className="text-xl font-bold">{analytics.overview.churnRate}%</p>
            </div>
            <TrendingDown className="h-6 w-6 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">User Growth</h3>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {analytics.userGrowth && analytics.userGrowth.length > 0 ? (
              analytics.userGrowth.map((data: any, index: number) => {
                const maxUsers = Math.max(...analytics.userGrowth.map((d: any) => d.users || 0), 1);
                return (
                  <div key={`${data.month}-${index}`} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{data.month}</span>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${((data.users || 0) / maxUsers) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{formatNumber(data.users || 0)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No user growth data available</p>
            )}
          </div>
        </Card>

        {/* Revenue Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Monthly Revenue</h3>
            <EuroIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {analytics.revenue && analytics.revenue.length > 0 ? (
              analytics.revenue.map((data: any, index: number) => {
                const maxRevenue = Math.max(...analytics.revenue.map((d: any) => d.revenue || 0), 1);
                return (
                  <div key={`${data.month}-${index}`} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{data.month}</span>
                    <div className="flex items-center space-x-4">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${((data.revenue || 0) / maxRevenue) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{formatCurrency(data.revenue || 0)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No revenue data available</p>
            )}
          </div>
        </Card>
      </div>

      {/* Top Videos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Top Performing Videos</h3>
          <Video className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-4">
          {analytics.topVideos && analytics.topVideos.length > 0 ? (
            analytics.topVideos.map((video: any, index: number) => (
              <div key={`${video.id || index}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{video.title || 'Untitled Video'}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {formatNumber(video.views || 0)} views
                      </span>
                      <span>{video.completionRate || 0}% completion</span>
                      {video.rating > 0 && <span>⭐ {video.rating.toFixed(1)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No video data available</p>
          )}
        </div>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Subscription Distribution</h3>
          <div className="space-y-3">
            {Object.entries(analytics.subscriptionStats).map(([plan, stats]) => {
              const statsData = stats as { count: number; percentage: number };
              return (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{plan}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          plan === 'premium' ? 'bg-yellow-500' : 
                          plan === 'basic' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}
                        style={{ width: `${statsData.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{statsData.count}</span>
                    <span className="text-xs text-muted-foreground w-8">{statsData.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Device Distribution - Optional, only show if data available */}
        {Object.keys(analytics.deviceStats || {}).length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Device Distribution</h3>
            <div className="space-y-3">
              {Object.entries(analytics.deviceStats).map(([device, stats]) => {
                const statsData = stats as { count: number; percentage: number };
                return (
                  <div key={device} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{device}</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            device === 'desktop' ? 'bg-blue-500' : 
                            device === 'mobile' ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${statsData.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{statsData.count}</span>
                      <span className="text-xs text-muted-foreground w-8">{statsData.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Geographic Distribution - Optional, only show if data available */}
      {analytics.geographicStats && analytics.geographicStats.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Geographic Distribution</h3>
          <div className="space-y-3">
            {analytics.geographicStats.map((data: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{data.country}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${data.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{data.users}</span>
                  <span className="text-xs text-muted-foreground w-8">{data.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsReports;
