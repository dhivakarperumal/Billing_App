import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrders } from '../api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'all';

const Reports = ({ navigation }: any) => {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<DateFilter>('today');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders(token);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter((order) => {
      const orderDate = new Date(order.created_at || order.date);
      
      switch (activeFilter) {
        case 'today':
          return orderDate >= startOfDay;
        case 'yesterday': {
          const yesterday = new Date(startOfDay);
          yesterday.setDate(yesterday.getDate() - 1);
          return orderDate >= yesterday && orderDate < startOfDay;
        }
        case 'this_week': {
          const startOfWeek = new Date(startOfDay);
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          return orderDate >= startOfWeek;
        }
        case 'last_week': {
          const startOfLastWeek = new Date(startOfDay);
          startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay() - 7);
          const endOfLastWeek = new Date(startOfDay);
          endOfLastWeek.setDate(endOfLastWeek.getDate() - endOfLastWeek.getDay());
          return orderDate >= startOfLastWeek && orderDate < endOfLastWeek;
        }
        case 'this_month': {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return orderDate >= startOfMonth;
        }
        case 'last_month': {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
        }
        default:
          return true;
      }
    });
  }, [orders, activeFilter]);

  const summary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        acc.total += Number(order.total_amount) || 0;
        acc.count += 1;
        return acc;
      },
      { total: 0, count: 0 },
    );
  }, [filteredOrders]);

  const FilterChip = ({ label, id }: { label: string; id: DateFilter }) => (
    <TouchableOpacity
      onPress={() => setActiveFilter(id)}
      style={[styles.chip, activeFilter === id && styles.chipActive]}
    >
      <Text style={[styles.chipText, activeFilter === id && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Reports</Text>
        <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
          <Icon name="refresh-cw" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <FilterChip label="Today" id="today" />
          <FilterChip label="Yesterday" id="yesterday" />
          <FilterChip label="This Week" id="this_week" />
          <FilterChip label="Last Week" id="last_week" />
          <FilterChip label="This Month" id="this_month" />
          <FilterChip label="Last Month" id="last_month" />
          <FilterChip label="All" id="all" />
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#f43f5e" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Bills</Text>
                <Text style={styles.summaryValue}>{summary.count}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>₹{summary.total.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Transactions</Text>
              <TouchableOpacity style={styles.exportButton}>
                <Icon name="download" size={16} color="#f43f5e" />
                <Text style={styles.exportText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="file-text" size={48} color="#e2e8f0" />
                <Text style={styles.emptyText}>No transactions found for this period</Text>
              </View>
            ) : (
              filteredOrders.map((order, i) => (
                <View key={i} style={styles.transactionItem}>
                  <View style={styles.orderIcon}>
                    <Icon name="shopping-bag" size={18} color="#64748b" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.orderId}>Order #{order.id?.toString().slice(-6).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>{new Date(order.created_at || order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={styles.orderAmount}>₹{Number(order.total_amount).toLocaleString()}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  backButton: { padding: 4 },
  refreshButton: { padding: 4 },
  filterContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterScroll: { padding: 12, gap: 8 },
  content: { flex: 1 },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#f1f5f9', 
    borderWidth: 1, 
    borderColor: 'transparent' 
  },
  chipActive: { backgroundColor: '#fff1f2', borderColor: '#f43f5e' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#f43f5e' },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  divider: { width: 1, backgroundColor: '#f1f5f9', height: '100%' },
  transactionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff1f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  exportText: { fontSize: 12, fontWeight: '900', color: '#f43f5e', marginLeft: 4 },
  transactionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginBottom: 8, 
    padding: 16, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  orderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  orderId: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  orderDate: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  orderAmount: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 20 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginTop: 12, textAlign: 'center' },
});

export default Reports;
