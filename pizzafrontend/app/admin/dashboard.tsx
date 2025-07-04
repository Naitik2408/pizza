import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
  Image,
  ImageBackground,
  StyleProp,
  ViewStyle,
  DimensionValue
} from 'react-native';
import {
  Users,
  Package,
  DollarSign,
  Clock,
  XCircle,
  CheckCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  RotateCcw
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { API_URL } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';

// TypeScript interfaces
interface PopularItem {
  name: string;
  orders: number;
  growth: string;
}

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: {
    delivered: number;
    inProgress: number;
    cancelled: number;
  };
  revenueData: {
    today: number;
    week: number;
    month: number;
    todayGrowth: number;
    weekGrowth: number;
    monthGrowth: number;
  };
  chartData: {
    labels: string[];
    data: number[];
  };
  popularItems: PopularItem[];
  quickStats: {
    activeDeliveryAgents: number;
    pendingDeliveries: number;
    avgDeliveryTime: number;
    customerRating: number;
  };
}

const BOTTOM_NAV_HEIGHT = 60;
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

// Improved Skeleton component with proper pulsing animation
const Skeleton = ({
  width,
  height,
  style,
}: {
  width: DimensionValue;
  height: DimensionValue;
  style?: StyleProp<ViewStyle>;
}) => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.ease }),
        withTiming(0.5, { duration: 750, easing: Easing.ease })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E0E0E0',
          borderRadius: 4,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

const AdminDashboard = () => {
  const [revenueView, setRevenueView] = useState('today'); // today, week, month
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useSelector((state: RootState) => state.auth);

  // Dashboard data states with proper typing
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    ordersByStatus: {
      delivered: 0,
      inProgress: 0,
      cancelled: 0,
    },
    revenueData: {
      today: 0,
      week: 0,
      month: 0,
      todayGrowth: 0,
      weekGrowth: 0,
      monthGrowth: 0
    },
    chartData: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [0, 0, 0, 0, 0, 0, 0]
    },
    popularItems: [],
    quickStats: {
      activeDeliveryAgents: 0,
      pendingDeliveries: 0,
      avgDeliveryTime: 0,
      customerRating: 0
    }
  });

  const screenWidth = Dimensions.get('window').width - 40;

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();

      // Update dashboard data with response
      setDashboardStats({
        totalUsers: data.totalUsers || 0,
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        ordersByStatus: {
          delivered: data.ordersByStatus?.delivered || 0,
          inProgress: data.ordersByStatus?.inProgress || 0,
          cancelled: data.ordersByStatus?.cancelled || 0,
        },
        revenueData: {
          today: data.revenueData?.today || 0,
          week: data.revenueData?.week || 0,
          month: data.revenueData?.month || 0,
          todayGrowth: data.revenueData?.todayGrowth || 0,
          weekGrowth: data.revenueData?.weekGrowth || 0,
          monthGrowth: data.revenueData?.monthGrowth || 0
        },
        chartData: {
          labels: data.chartData?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: data.chartData?.data || [0, 0, 0, 0, 0, 0, 0]
        },
        popularItems: data.popularItems || [],
        quickStats: {
          activeDeliveryAgents: data.quickStats?.activeDeliveryAgents || 0,
          pendingDeliveries: data.quickStats?.pendingDeliveries || 0,
          avgDeliveryTime: data.quickStats?.avgDeliveryTime || 0,
          customerRating: data.quickStats?.customerRating || 0
        }
      });

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard data');
    } finally {
      // FIX: Setting loading to false after data is fetched
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Load data on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Format currency with abbreviations for large amounts
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000000) {
      return '₹' + (amount / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (amount >= 1000000) {
      return '₹' + (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (amount >= 1000) {
      return '₹' + (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    // For amounts less than 1000, show with 2 decimal places if there are decimals
    return '₹' + (amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2));
  };

  // Get current date
  const getCurrentDate = (): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Chart configuration
  const chartData = {
    labels: dashboardStats.chartData.labels,
    datasets: [
      {
        data: dashboardStats.chartData.data,
        color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
        strokeWidth: 2
      }
    ],
  };

  // Render error state
  if (error && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <AlertCircle size={50} color="#FF6B00" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardStats}>
          <RotateCcw size={16} color="#FFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Get arrow color based on growth percentage
  const getGrowthColor = (growth: number): string => {
    return growth >= 0 ? '#22c55e' : '#ef4444';
  };

  // Get growth icon based on growth percentage
  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ?
      <ArrowUp size={16} color="#22c55e" /> :
      <ArrowDown size={16} color="#ef4444" />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF6B00"]}
            tintColor="#FF6B00"
          />
        }
      >
        {/* Header Banner with Image - Skeleton or Loaded */}
        {loading ? (
          <View style={styles.headerBanner}>
            <Skeleton width="100%" height={250} style={{ borderRadius: 0 }} />
          </View>
        ) : (
          <ImageBackground
            source={{ uri: 'https://img.freepik.com/free-photo/pleased-happy-young-woman-gazes-with-happiness-points-with-thumb-aside-free-space-eats-pizza-shows-direction-keeps-jaw-dropped-exclaims-happiness-isolated-yellow-wall_273609-29201.jpg?t=st=1745397508~exp=1745401108~hmac=b6b3555cdda51260f31d9d84b6ae9a3880708bf5f7319279788ccb631284e4b5&w=1380' }}
            style={styles.headerBanner}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)']}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <Text style={styles.welcomeText}>Welcome back, Admin</Text>
                <View style={styles.dateContainer}>
                  <Calendar size={14} color="#fff" style={{ marginRight: 5 }} />
                  <Text style={styles.dateText}>
                    {getCurrentDate()}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        )}

        {/* Dashboard Header */}
        <View style={styles.dashboardHeader}>
          <Text style={styles.title}>Dashboard Overview</Text>
        </View>

        {/* Quick Stats Cards - Skeleton or Loaded */}
        <View style={styles.statsCardRow}>
          {loading ? (
            <>
              <Skeleton width="48%" height={80} style={styles.statsCardSkeleton} />
              <Skeleton width="48%" height={80} style={styles.statsCardSkeleton} />
            </>
          ) : (
            <>
              <View style={[styles.statsCard, { backgroundColor: '#FFF0E6' }]}>
                <View style={styles.statsCardContent}>
                  <View style={styles.statsCardIcon}>
                    <Users size={24} color="#FF6B00" />
                  </View>
                  <View>
                    <Text style={styles.statsCardValue}>{formatNumber(dashboardStats.totalUsers)}</Text>
                    <Text style={styles.statsCardLabel}>Customers</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsCard, { backgroundColor: '#E6F5FF' }]}>
                <View style={styles.statsCardContent}>
                  <View style={[styles.statsCardIcon, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                    <Package size={24} color="#007AFF" />
                  </View>
                  <View>
                    <Text style={styles.statsCardValue}>{formatNumber(dashboardStats.totalOrders)}</Text>
                    <Text style={styles.statsCardLabel}>Orders</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.statsCardRow}>
          {loading ? (
            <>
              <Skeleton width="48%" height={80} style={styles.statsCardSkeleton} />
              <Skeleton width="48%" height={80} style={styles.statsCardSkeleton} />
            </>
          ) : (
            <>
              <View style={[styles.statsCard, { backgroundColor: '#E6FFF0' }]}>
                <View style={styles.statsCardContent}>
                  <View style={[styles.statsCardIcon, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                    <DollarSign size={24} color="#34C759" />
                  </View>
                  <View>
                    <Text style={styles.statsCardValue}>{formatCurrency(dashboardStats.totalRevenue)}</Text>
                    <Text style={styles.statsCardLabel}>Revenue</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.statsCard, { backgroundColor: '#FFF0F0' }]}>
                <View style={styles.statsCardContent}>
                  <View style={[styles.statsCardIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                    <Clock size={24} color="#FF3B30" />
                  </View>
                  <View>
                    <Text style={styles.statsCardValue}>{formatNumber(dashboardStats.ordersByStatus.inProgress)}</Text>
                    <Text style={styles.statsCardLabel}>Pending</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Revenue Section - Skeleton or Loaded */}
        <View style={styles.sectionContainer}>
          {loading ? (
            <>
              <Skeleton width={150} height={24} style={{ marginBottom: 15 }} />
              <View style={styles.revenueSkeletonHeader}>
                <Skeleton width={200} height={40} />
                <Skeleton width={80} height={32} style={{ borderRadius: 8 }} />
              </View>
              <Skeleton width="100%" height={200} style={{ marginTop: 20 }} />
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Revenue</Text>
                <View style={styles.revenueToggle}>
                  <TouchableOpacity
                    style={[styles.toggleButton, revenueView === 'today' && styles.activeToggle]}
                    onPress={() => setRevenueView('today')}
                  >
                    <Text style={revenueView === 'today' ? styles.activeToggleText : styles.toggleText}>Day</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleButton, revenueView === 'week' && styles.activeToggle]}
                    onPress={() => setRevenueView('week')}
                  >
                    <Text style={revenueView === 'week' ? styles.activeToggleText : styles.toggleText}>Week</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleButton, revenueView === 'month' && styles.activeToggle]}
                    onPress={() => setRevenueView('month')}
                  >
                    <Text style={revenueView === 'month' ? styles.activeToggleText : styles.toggleText}>Month</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.revenueInfo}>
                <View>
                  <Text style={styles.revenueValue}>
                    {revenueView === 'today'
                      ? formatCurrency(dashboardStats.revenueData.today)
                      : revenueView === 'week'
                        ? formatCurrency(dashboardStats.revenueData.week)
                        : formatCurrency(dashboardStats.revenueData.month)
                    }
                  </Text>
                  <View style={styles.growthContainer}>
                    {getGrowthIcon(revenueView === 'today'
                      ? dashboardStats.revenueData.todayGrowth
                      : revenueView === 'week'
                        ? dashboardStats.revenueData.weekGrowth
                        : dashboardStats.revenueData.monthGrowth
                    )}
                    <Text style={[
                      styles.growthText,
                      {
                        color: getGrowthColor(revenueView === 'today'
                          ? dashboardStats.revenueData.todayGrowth
                          : revenueView === 'week'
                            ? dashboardStats.revenueData.weekGrowth
                            : dashboardStats.revenueData.monthGrowth
                        )
                      }
                    ]}>
                      {revenueView === 'today'
                        ? `${Math.abs(dashboardStats.revenueData.todayGrowth)}%`
                        : revenueView === 'week'
                          ? `${Math.abs(dashboardStats.revenueData.weekGrowth)}%`
                          : `${Math.abs(dashboardStats.revenueData.monthGrowth)}%`
                      } vs previous {revenueView}
                    </Text>
                  </View>
                </View>

                <Image
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2382/2382533.png' }}
                  style={styles.revenueImage}
                />
              </View>

              <LineChart
                data={chartData}
                width={screenWidth - 20}
                height={200}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '5',
                    strokeWidth: '2',
                    stroke: '#FF6B00'
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#E5E5E5',
                    strokeWidth: 1
                  }
                }}
                bezier
                style={styles.chart}
                fromZero
              />
            </>
          )}
        </View>

        {/* Order Status Section - Skeleton or Loaded */}
        <View style={styles.sectionContainer}>
          {loading ? (
            <>
              <Skeleton width={150} height={24} style={{ marginBottom: 15 }} />

              {/* Skeleton for three order status items */}
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.orderStatRowSkeleton}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Skeleton width={32} height={32} style={{ borderRadius: 16, marginRight: 12 }} />
                    <Skeleton width={120} height={40} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Skeleton width={40} height={16} />
                    <Skeleton width={40} height={16} />
                  </View>
                  <Skeleton width="100%" height={8} style={{ borderRadius: 4 }} />
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Order Status</Text>

              {(() => {
                const total =
                  dashboardStats.ordersByStatus.delivered +
                  dashboardStats.ordersByStatus.inProgress +
                  dashboardStats.ordersByStatus.cancelled;

                const deliveredPercentage = total > 0 ?
                  (dashboardStats.ordersByStatus.delivered / total) * 100 : 0;

                const inProgressPercentage = total > 0 ?
                  (dashboardStats.ordersByStatus.inProgress / total) * 100 : 0;

                const cancelledPercentage = total > 0 ?
                  (dashboardStats.ordersByStatus.cancelled / total) * 100 : 0;

                return (
                  <View style={styles.orderStatsContainer}>
                    {/* Delivered Orders */}
                    <View style={styles.orderStatRow}>
                      <View style={styles.orderStatHeader}>
                        <View style={styles.orderStatIconContainer}>
                          <CheckCircle size={18} color="#22c55e" />
                        </View>
                        <View>
                          <Text style={styles.orderStatTitle}>Delivered</Text>
                          <Text style={styles.orderStatSubtitle}>Completed orders</Text>
                        </View>
                      </View>

                      <View style={styles.orderStatDetails}>
                        <Text style={styles.orderStatCount}>{formatNumber(dashboardStats.ordersByStatus.delivered)}</Text>
                        <Text style={styles.orderStatPercentage}>{deliveredPercentage.toFixed(1)}%</Text>
                      </View>

                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${deliveredPercentage}%`,
                              backgroundColor: '#22c55e'
                            }
                          ]}
                        />
                      </View>
                    </View>

                    {/* In Progress Orders */}
                    <View style={styles.orderStatRow}>
                      <View style={styles.orderStatHeader}>
                        <View style={styles.orderStatIconContainer}>
                          <Clock size={18} color="#f59e0b" />
                        </View>
                        <View>
                          <Text style={styles.orderStatTitle}>In Progress</Text>
                          <Text style={styles.orderStatSubtitle}>Ongoing orders</Text>
                        </View>
                      </View>

                      <View style={styles.orderStatDetails}>
                        <Text style={styles.orderStatCount}>{formatNumber(dashboardStats.ordersByStatus.inProgress)}</Text>
                        <Text style={styles.orderStatPercentage}>{inProgressPercentage.toFixed(1)}%</Text>
                      </View>

                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${inProgressPercentage}%`,
                              backgroundColor: '#f59e0b'
                            }
                          ]}
                        />
                      </View>
                    </View>

                    {/* Cancelled Orders */}
                    <View style={styles.orderStatRow}>
                      <View style={styles.orderStatHeader}>
                        <View style={styles.orderStatIconContainer}>
                          <XCircle size={18} color="#ef4444" />
                        </View>
                        <View>
                          <Text style={styles.orderStatTitle}>Cancelled</Text>
                          <Text style={styles.orderStatSubtitle}>Cancelled orders</Text>
                        </View>
                      </View>

                      <View style={styles.orderStatDetails}>
                        <Text style={styles.orderStatCount}>{formatNumber(dashboardStats.ordersByStatus.cancelled)}</Text>
                        <Text style={styles.orderStatPercentage}>{cancelledPercentage.toFixed(1)}%</Text>
                      </View>

                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${cancelledPercentage}%`,
                              backgroundColor: '#ef4444'
                            }
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })()}
            </>
          )}
        </View>

        {/* Most Ordered Items - Skeleton or Loaded */}
        <View style={styles.sectionContainer}>
          {loading ? (
            <>
              <Skeleton width={150} height={24} style={{ marginBottom: 15 }} />

              {/* Skeleton for popular items */}
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.popularItemSkeleton}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Skeleton width={28} height={28} style={{ borderRadius: 14, marginRight: 12 }} />
                    <Skeleton width={180} height={16} />
                  </View>
                  <Skeleton width={80} height={32} />
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Popular Items</Text>

              {dashboardStats.popularItems.length > 0 ? (
                <>
                  {dashboardStats.popularItems.map((item: PopularItem, index: number) => (
                    <View key={index} style={styles.popularItem}>
                      <View style={styles.popularItemLeft}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.itemName}>{item.name}</Text>
                      </View>
                      <View style={styles.popularItemRight}>
                        <Text style={styles.itemOrders}>{formatNumber(item.orders)} orders</Text>
                        <Text style={[
                          styles.itemGrowth,
                          { color: item.growth.startsWith('+') ? '#22c55e' : '#ef4444' }
                        ]}>
                          {item.growth}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Image
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/5445/5445197.png' }}
                    style={styles.emptyStateImage}
                  />
                  <Text style={styles.emptyStateText}>No popular items data available</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: STATUSBAR_HEIGHT,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  headerBanner: {
    height: 250,
    width: '100%',
    justifyContent: 'flex-end',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  headerContent: {
    justifyContent: 'flex-end',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statsCardRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statsCard: {
    width: '48%',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsCardSkeleton: {
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsCardIcon: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginRight: 12,
  },
  statsCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsCardLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  revenueSkeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  revenueToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: '#FF6B00',
  },
  toggleText: {
    color: '#666',
    fontSize: 12,
  },
  activeToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  revenueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  revenueValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  growthText: {
    fontSize: 14,
    marginLeft: 4,
  },
  revenueImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  // Order Stats UI
  orderStatsContainer: {
    marginTop: 5,
  },
  orderStatRow: {
    marginBottom: 16,
  },
  orderStatRowSkeleton: {
    marginBottom: 24,
  },
  orderStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderStatIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  orderStatTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  orderStatSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  orderStatDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderStatCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderStatPercentage: {
    fontSize: 14,
    color: '#666',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  popularItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  popularItemSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  popularItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  popularItemRight: {
    alignItems: 'flex-end',
  },
  itemOrders: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  itemGrowth: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
    opacity: 0.6,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default AdminDashboard;