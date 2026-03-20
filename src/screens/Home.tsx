import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { get } from '../api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLORS = ['#F43F5E', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6', '#EC4899'];
const HEADER_GRADIENT = ['#0f172a', '#1e293b'];

const Home = () => {
  const [data, setData] = useState<any>({
    stats: [],
    stockStats: [],
    recentBills: [],
    categoryData: [],
    revenueGraphData: [],
    loading: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();
  const { token, user } = useAuth();

  const fetchDashboardData = async () => {
    try {
      const [productsRes, ordersRes]: any = await Promise.all([
        get('/products', token),
        get('/orders', token).catch(() => []), 
      ]);

      const products = Array.isArray(productsRes) ? productsRes : (productsRes.products || []);
      const orders = Array.isArray(ordersRes) ? ordersRes : [];

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayOrders = orders.filter((o: any) => new Date(o.created_at) >= startOfToday);
      const monthOrders = orders.filter((o: any) => new Date(o.created_at) >= startOfMonth);

      const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      const uniqueCustomers = new Set(orders.map((o: any) => o.customer_id || o.customer_phone)).size;
      const totalStockQuantity = products.reduce((sum: number, p: any) => sum + Number(p.total_stock || 0), 0);

      const mainStats = [
        { title: 'Products', value: products.length, icon: 'box', color: ['#4387F6', '#5C9CF8'] },
        { title: 'Stock', value: totalStockQuantity, icon: 'package', color: ['#F85A6C', '#FA7082'] },
        { title: 'Customers', value: uniqueCustomers, icon: 'users', color: ['#28C382', '#3DD09A'] },
        { title: 'Bills', value: orders.length, icon: 'file-text', color: ['#FC8C41', '#FD9D5B'] },
        { title: 'Today', value: todayOrders.length, icon: 'shopping-bag', color: ['#8B5CF6', '#A78BFA'] },
        { title: 'Month', value: monthOrders.length, icon: 'calendar', color: ['#14B8A6', '#2DD4BF'] },
        { title: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: 'dollar-sign', color: ['#F59E0B', '#FBBF24'] },
        { title: 'Today Rev', value: `₹${todayRevenue.toLocaleString('en-IN')}`, icon: 'trending-up', color: ['#EC4899', '#F472B6'] },
      ];

      const lowStock = products.filter((p: any) => Number(p.total_stock || 0) > 0 && Number(p.total_stock || 0) <= 10).length;
      const outOfStock = products.filter((p: any) => Number(p.total_stock || 0) <= 0).length;
      const inStock = products.length - outOfStock;

      const sStats = [
        { title: 'Total Items', value: products.length, icon: 'box', color: 'bg-slate-100 text-slate-600', iconColor: '#475569' },
        { title: 'In Stock', value: inStock, icon: 'check-circle', color: 'bg-emerald-100 text-emerald-600', iconColor: '#10B981' },
        { title: 'Low Stock', value: lowStock, icon: 'alert-triangle', color: 'bg-amber-100 text-amber-600', iconColor: '#F59E0B' },
        { title: 'Out of Stock', value: outOfStock, icon: 'x-circle', color: 'bg-rose-100 text-rose-600', iconColor: '#F43F5E' },
      ];

      const catMap: any = {};
      products.forEach((p: any) => {
        const cat = p.category || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      const cData = Object.entries(catMap)
        .map(([name, value]: any, index) => ({
          name,
          value,
          text: name,
          color: COLORS[index % COLORS.length],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const last6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = months[d.getMonth()];
        const mOrders = orders.filter((o: any) => {
          const od = new Date(o.created_at);
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        });
        last6.push({
          label: monthName,
          value: mOrders.length,
          frontColor: '#F43F5E',
        });
      }

      setData({
        stats: mainStats,
        stockStats: sStats,
        recentBills: orders.slice(0, 5),
        categoryData: cData,
        revenueGraphData: last6,
        loading: false,
      });
    } catch (e) {
      console.error('Dashboard fetch error', e);
      setData((prev: any) => ({ ...prev, loading: false }));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (data.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F43F5E" />
        <Text style={styles.loadingText}>SYNCING VAULT ANALYTICS...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Premium Header */}
      <LinearGradient colors={HEADER_GRADIENT} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Analytics<Text style={{ color: '#f97316' }}>.</Text></Text>
            <Text style={styles.headerSubtitle}>Live business intelligence tracking</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
             <Icon name="refresh-cw" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      >
        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          {data.stats.map((item: any, i: number) => (
            <LinearGradient
              key={i}
              colors={item.color}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCard}
            >
              <View style={styles.statHeader}>
                <Text style={styles.statTitle}>{item.title}</Text>
                <Icon name={item.icon} size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.statValue}>{item.value}</Text>
            </LinearGradient>
          ))}
        </View>

        {/* STOCK INSIGHTS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stock Evolution</Text>
            <Text style={styles.sectionSubtitle}>HEALTH METRICS</Text>
          </View>

          <View style={styles.stockGrid}>
            {data.stockStats.map((item: any, i: number) => (
              <TouchableOpacity
                key={i}
                onPress={() => navigation.navigate('Products')}
                style={styles.stockCard}
              >
                <View style={styles.stockItemHeader}>
                  <Icon name={item.icon} size={14} color={item.iconColor} />
                  <Text style={styles.stockItemTitle}>{item.title}</Text>
                </View>
                <Text style={styles.stockItemValue}>{item.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CHARTS */}
        <View style={styles.sectionCard}>
           <Text style={styles.chartTitle}>Shipment Distribution</Text>
           <View style={styles.chartContainer}>
              <BarChart
                data={data.revenueGraphData}
                barWidth={22}
                noOfSections={3}
                barBorderRadius={4}
                frontColor="#F43F5E"
                yAxisThickness={0}
                xAxisThickness={0}
                hideRules
                yAxisTextStyle={{ color: '#94a3b8', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10 }}
                labelWidth={30}
                spacing={20}
              />
           </View>
        </View>

        {/* RECENT SALES */}
        <View style={styles.sectionCard}>
          <Text style={styles.chartTitle}>Recent Operations</Text>
          <View style={{ gap: 12 }}>
            {data.recentBills.length > 0 ? (
              data.recentBills.map((bill: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => navigation.navigate('Bills')}
                  style={styles.recentItem}
                >
                  <View style={styles.recentItemMain}>
                    <View style={styles.recentIconBox}>
                      <Icon name="file-text" size={16} color="#F43F5E" />
                    </View>
                    <View>
                      <Text style={styles.orderId}>#ORD-{bill.id}</Text>
                      <Text style={styles.customerName}>{bill.customer_name || 'Guest Proxy'}</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.orderValue}>₹{Number(bill.total_amount).toLocaleString('en-IN')}</Text>
                    <Text style={styles.orderDate}>{new Date(bill.created_at).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyRecent}>
                 <Text style={styles.emptyText}>NO DATA LOGS FOUND</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginTop: 15 },
  header: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 35, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  refreshBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 18, paddingTop: 24, paddingBottom: 110 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: (SCREEN_WIDTH - 54) / 2,
    height: 110,
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    justifyContent: 'space-between',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statTitle: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 28, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  sectionSubtitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  stockGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  stockCard: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  stockItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stockItemTitle: { fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' },
  stockItemValue: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  chartTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
  chartContainer: { height: 200, alignItems: 'center', justifyContent: 'center' },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  recentItemMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentIconBox: { width: 38, height: 38, backgroundColor: '#fff5f5', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  orderId: { fontSize: 11, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  customerName: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 1 },
  orderValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  orderDate: { fontSize: 8, fontWeight: '700', color: '#cbd5e1', marginTop: 2 },
  emptyRecent: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: 9, fontWeight: '900', color: '#e2e8f0', letterSpacing: 1.5 }
});