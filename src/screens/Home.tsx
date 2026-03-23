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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { get } from '../api';
import { StyleSheet } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLORS = [
  '#F43F5E',
  '#10B981',
  '#F59E0B',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
];

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
        get('/orders', token).catch(() => []), // Fallback if /orders fails or is empty
      ]);

      const products = Array.isArray(productsRes)
        ? productsRes
        : productsRes.products || [];
      const orders = Array.isArray(ordersRes) ? ordersRes : [];

      // 🟢 PREPARE STATS
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayOrders = orders.filter(
        (o: any) => new Date(o.created_at) >= startOfToday,
      );
      const monthOrders = orders.filter(
        (o: any) => new Date(o.created_at) >= startOfMonth,
      );

      const totalRevenue = orders.reduce(
        (sum: number, o: any) => sum + Number(o.total_amount || 0),
        0,
      );
      const todayRevenue = todayOrders.reduce(
        (sum: number, o: any) => sum + Number(o.total_amount || 0),
        0,
      );
      const uniqueCustomers = new Set(
        orders.map((o: any) => o.customer_id || o.customer_phone),
      ).size;
      const totalStockQuantity = products.reduce(
        (sum: number, p: any) => sum + Number(p.total_stock || 0),
        0,
      );

      const mainStats = [
        {
          title: 'Products',
          value: products.length,
          icon: 'box',
          color: ['#4387F6', '#5C9CF8'],
        },
        {
          title: 'Stock',
          value: totalStockQuantity,
          icon: 'package',
          color: ['#F85A6C', '#FA7082'],
        },
        {
          title: 'Customers',
          value: uniqueCustomers,
          icon: 'users',
          color: ['#28C382', '#3DD09A'],
        },
        {
          title: 'Bills',
          value: orders.length,
          icon: 'file-text',
          color: ['#FC8C41', '#FD9D5B'],
        },
        {
          title: 'Today',
          value: todayOrders.length,
          icon: 'shopping-bag',
          color: ['#8B5CF6', '#A78BFA'],
        },
        {
          title: 'Month',
          value: monthOrders.length,
          icon: 'calendar',
          color: ['#14B8A6', '#2DD4BF'],
        },
        {
          title: 'Revenue',
          value: `₹${totalRevenue.toLocaleString('en-IN')}`,
          icon: 'dollar-sign',
          color: ['#F59E0B', '#FBBF24'],
        },
        {
          title: 'Today Rev',
          value: `₹${todayRevenue.toLocaleString('en-IN')}`,
          icon: 'trending-up',
          color: ['#EC4899', '#F472B6'],
        },
      ];

      // 🟠 STOCK STATS
      const lowStock = products.filter(
        (p: any) =>
          Number(p.total_stock || 0) > 0 && Number(p.total_stock || 0) <= 10,
      ).length;
      const outOfStock = products.filter(
        (p: any) => Number(p.total_stock || 0) <= 0,
      ).length;
      const inStock = products.length - outOfStock;

      const sStats = [
        {
          title: 'Total Items',
          value: products.length,
          icon: 'box',
          color: 'bg-slate-100 text-slate-600',
          iconColor: '#475569',
        },
        {
          title: 'In Stock',
          value: inStock,
          icon: 'check-circle',
          color: 'bg-emerald-100 text-emerald-600',
          iconColor: '#10B981',
        },
        {
          title: 'Low Stock',
          value: lowStock,
          icon: 'alert-triangle',
          color: 'bg-amber-100 text-amber-600',
          iconColor: '#F59E0B',
        },
        {
          title: 'Out of Stock',
          value: outOfStock,
          icon: 'x-circle',
          color: 'bg-rose-100 text-rose-600',
          iconColor: '#F43F5E',
        },
      ];

      // 🔵 CATEGORY DISTRIBUTION
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

      // 🟣 REVENUE GRAPH (Last 6 months)
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const last6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = months[d.getMonth()];
        const mOrders = orders.filter((o: any) => {
          const od = new Date(o.created_at);
          return (
            od.getMonth() === d.getMonth() &&
            od.getFullYear() === d.getFullYear()
          );
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
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#F43F5E" />
        <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4">
          Loading Business Intelligence...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-2xl font-black text-slate-800">
              Analytics
            </Text>
            <Text className="text-gray-500 text-xs">
              Live business performance tracking
            </Text>
          </View>
          <TouchableOpacity
            className="bg-white p-2 rounded-full border border-gray-100 shadow-sm"
            onPress={onRefresh}
          >
            <Icon name="refresh-cw" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* STATS GRID */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          {data.stats.map((item: any, i: number) => (
            <LinearGradient
              key={i}
              colors={item.color}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: (SCREEN_WIDTH - 48) / 2,
                height: 120,
                padding: 16,
                borderRadius: 22,
                marginBottom: 16,
                justifyContent: 'space-between',

                elevation: 6,
                shadowColor: item.color[0],
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 10,

                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: 100,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                }}
              />

              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 22,
                }}
              />

              <View className="flex-row justify-between items-center">
                <Text className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                  {item.title}
                </Text>

                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: 6,
                    borderRadius: 999,
                  }}
                >
                  <Icon name={item.icon} size={13} color="white" />
                </View>
              </View>

              <Text className="text-[22px] font-extrabold text-white tracking-tight">
                {item.value}
              </Text>

              <View
                style={{
                  height: 3,
                  width: '35%',
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.4)',
                  opacity: 0.6,
                }}
              />
            </LinearGradient>
          ))}
        </View>

        {/* ... */}
        <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-sm font-black text-slate-800">
              Stock Insights
            </Text>
            <Text className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
              Inventory Health
            </Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {data.stockStats.map((item: any, i: number) => (
              <TouchableOpacity
                key={i}
                onPress={() => navigation.navigate('Products')}
                style={{ width: '48%', marginBottom: 12 }}
                className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl"
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <Icon name={item.icon} size={14} color={item.iconColor} />
                  <Text className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    {item.title}
                  </Text>
                </View>
                <Text className="text-lg font-black text-slate-800">
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ... */}
        <View className="mb-6">
          <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
            <Text className="text-sm font-black text-slate-800 mb-6">
              Shipment Statistics
            </Text>
            <View style={{ height: 200, width: '100%', alignItems: 'center' }}>
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

          <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-sm font-black text-slate-800">
                Categories
              </Text>
              <Text className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                Inventory Split
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <PieChart
                data={data.categoryData}
                donut
                radius={60}
                innerRadius={45}
                innerCircleColor={'white'}
                centerLabelComponent={() => {
                  return (
                    <View
                      style={{ justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                        {data.categoryData.reduce(
                          (acc: number, item: any) => acc + item.value,
                          0,
                        )}
                      </Text>
                      <Text style={{ fontSize: 8 }}>Total</Text>
                    </View>
                  );
                }}
              />
              <View className="flex-1 ml-4 justify-center">
                {data.categoryData.map((item: any, idx: number) => (
                  <View key={idx} className="flex-row items-center mb-1">
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: item.color,
                        marginRight: 6,
                      }}
                    />
                    <Text
                      numberOfLines={1}
                      className="text-[10px] text-gray-600 font-medium flex-1"
                    >
                      {item.name} ({item.value})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ... */}
        <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <Text className="text-sm font-black text-slate-800 mb-4">
            Recent Sales
          </Text>

          <View className="gap-3">
            {data.recentBills.length > 0 ? (
              data.recentBills.map((bill: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => navigation.navigate('Bills')}
                  className="flex-row justify-between items-center border-b border-gray-50 pb-3 last:border-none px-2"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
                      <Icon name="file-text" size={16} color="#F43F5E" />
                    </View>
                    <View>
                      <Text className="text-[11px] font-black text-slate-800 uppercase">
                        #ORD-0{bill.id}
                      </Text>
                      <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        {bill.customer_name || 'Guest User'}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-xs font-black text-slate-800">
                      ₹{Number(bill.total_amount).toLocaleString('en-IN')}
                    </Text>
                    <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                      {new Date(bill.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className="py-6 items-center">
                <Text className="text-[10px] font-black uppercase text-gray-300 tracking-widest">
                  No Sales Found
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;
