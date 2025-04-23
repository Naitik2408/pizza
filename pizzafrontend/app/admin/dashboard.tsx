import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, SafeAreaView, Platform, StatusBar } from 'react-native';
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  XCircle, 
  CheckCircle,
  PieChart,
  BarChart3,
  MapPin,
  Filter
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';

const BOTTOM_NAV_HEIGHT = 60; // Adjust based on your actual bottom navigation height
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

const AdminDashboard = () => {
  const [revenueView, setRevenueView] = useState('today'); // today, week, month
  
  const screenWidth = Dimensions.get('window').width - 40;
  
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 75],
        color: (opacity = 1) => `rgba(255, 140, 0, ${opacity})`,
        strokeWidth: 2
      }
    ],
  };
  
  const popularItems = [
    { name: 'Pepperoni Pizza', orders: 342, growth: '+12%' },
    { name: 'Smokehouse Burger', orders: 271, growth: '+8%' },
    { name: 'Meaty Pizza', orders: 245, growth: '+15%' },
    { name: 'Beef Burger', orders: 198, growth: '+5%' },
    { name: 'Hawaiian Pizza', orders: 156, growth: '+9%' },
  ];
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#333" />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>
        
        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Users size={24} color="#FF8C00" />
            </View>
            <View>
              <Text style={styles.statValue}>2,854</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Package size={24} color="#FF8C00" />
            </View>
            <View>
              <Text style={styles.statValue}>1,287</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <DollarSign size={24} color="#FF8C00" />
            </View>
            <View>
              <Text style={styles.statValue}>$42,589</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </View>
        
        {/* Order Status Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.orderStatusRow}>
            <View style={styles.orderStatusCard}>
              <View style={[styles.statusIcon, styles.deliveredIcon]}>
                <CheckCircle size={20} color="#fff" />
              </View>
              <Text style={styles.orderStatusValue}>872</Text>
              <Text style={styles.orderStatusLabel}>Delivered</Text>
            </View>
            
            <View style={styles.orderStatusCard}>
              <View style={[styles.statusIcon, styles.inProgressIcon]}>
                <Clock size={20} color="#fff" />
              </View>
              <Text style={styles.orderStatusValue}>149</Text>
              <Text style={styles.orderStatusLabel}>In Progress</Text>
            </View>
            
            <View style={styles.orderStatusCard}>
              <View style={[styles.statusIcon, styles.cancelledIcon]}>
                <XCircle size={20} color="#fff" />
              </View>
              <Text style={styles.orderStatusValue}>58</Text>
              <Text style={styles.orderStatusLabel}>Cancelled</Text>
            </View>
          </View>
        </View>
        
        {/* Revenue Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Total Revenue</Text>
          <View style={styles.revenueToggle}>
            <TouchableOpacity 
              style={[styles.toggleButton, revenueView === 'today' && styles.activeToggle]}
              onPress={() => setRevenueView('today')}
            >
              <Text style={revenueView === 'today' ? styles.activeToggleText : styles.toggleText}>Today</Text>
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
          
          <View style={styles.revenueDisplay}>
            <Text style={styles.revenueValue}>
              {revenueView === 'today' ? '$3,845' : revenueView === 'week' ? '$24,512' : '$89,754'}
            </Text>
            <Text style={styles.revenueGrowth}>
              <TrendingUp size={16} color="#22c55e" /> 
              {revenueView === 'today' ? '+12%' : revenueView === 'week' ? '+8%' : '+15%'} vs previous {revenueView}
            </Text>
          </View>
        </View>
        
        {/* Charts Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Orders Over Time</Text>
          <LineChart
            data={chartData}
            width={screenWidth}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#FF8C00'
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>
        
        {/* Most Ordered Items */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Most Ordered Items</Text>
          {popularItems.map((item, index) => (
            <View key={index} style={styles.popularItem}>
              <View style={styles.popularItemLeft}>
                <Text style={styles.itemRank}>{index + 1}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <View style={styles.popularItemRight}>
                <Text style={styles.itemOrders}>{item.orders} orders</Text>
                <Text style={styles.itemGrowth}>{item.growth}</Text>
              </View>
            </View>
          ))}
        </View>
        
        {/* Quick Stats Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCard}>
              <MapPin size={20} color="#FF8C00" />
              <Text style={styles.quickStatValue}>24</Text>
              <Text style={styles.quickStatLabel}>Active Delivery Agents</Text>
            </View>
            
            <View style={styles.quickStatCard}>
              <Clock size={20} color="#FF8C00" />
              <Text style={styles.quickStatValue}>37</Text>
              <Text style={styles.quickStatLabel}>Pending Deliveries</Text>
            </View>
          </View>
          
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCard}>
              <BarChart3 size={20} color="#FF8C00" />
              <Text style={styles.quickStatValue}>28min</Text>
              <Text style={styles.quickStatLabel}>Avg. Delivery Time</Text>
            </View>
            
            <View style={styles.quickStatCard}>
              <PieChart size={20} color="#FF8C00" />
              <Text style={styles.quickStatValue}>4.8</Text>
              <Text style={styles.quickStatLabel}>Customer Rating</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: STATUSBAR_HEIGHT,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20, // Extra padding at bottom to account for navigation bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    elevation: 2,
  },
  filterText: {
    marginLeft: 5,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '31%',
    alignItems: 'center',
    elevation: 3,
  },
  statIconContainer: {
    backgroundColor: '#FFF4E6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  orderStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderStatusCard: {
    alignItems: 'center',
    width: '30%',
  },
  statusIcon: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  deliveredIcon: {
    backgroundColor: '#22c55e',
  },
  inProgressIcon: {
    backgroundColor: '#f59e0b',
  },
  cancelledIcon: {
    backgroundColor: '#ef4444',
  },
  orderStatusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderStatusLabel: {
    fontSize: 12,
    color: '#888',
  },
  revenueToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 15,
    padding: 2,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#FF8C00',
  },
  toggleText: {
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  revenueDisplay: {
    alignItems: 'center',
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  revenueGrowth: {
    fontSize: 14,
    color: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  popularItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  popularItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRank: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 25,
    color: '#FF8C00',
  },
  itemName: {
    fontSize: 16,
    color: '#333',
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
    color: '#22c55e',
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickStatCard: {
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 3,
  },
});

export default AdminDashboard;