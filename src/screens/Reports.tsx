import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { BluetoothEscposPrinter } from 'react-native-bluetooth-escpos-printer';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrders } from '../api';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

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

  const handleExportExcel = async () => {
    if (filteredOrders.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Data',
        text2: 'No transactions found',
      });
      return;
    }

    try {
      const header = 'Date,Order ID,Customer,Total\n';
      const rows = filteredOrders.map(order => {
        const date = new Date(order.created_at || order.date).toLocaleDateString();
        const id = order.id || 'N/A';
        const cust = order.customer_name || 'Walk-in';
        const total = order.total_amount || 0;
        return `"${date}","${id}","${cust}","${total}"`;
      }).join('\n');

      const csvContent = header + rows;
      const fileName = `Report_${activeFilter}_${Date.now()}.csv`;
      // Use CachesDirectoryPath as it's generally more accessible for temporary sharing
      const path = `${RNFS.CachesDirectoryPath}/${fileName}`;

      await RNFS.writeFile(path, csvContent, 'utf8');

      // Strategy 1: Share via file path (most common)
      // Strategy 2: Share via base64 (fallback for some restrictive environments)
      const base64Data = await RNFS.readFile(path, 'base64');

      try {
        await Share.open({
          url: path.startsWith('file://') ? path : `file://${path}`,
          type: 'text/csv',
          filename: fileName,
          subject: 'Transaction Report',
          failOnCancel: false,
        });
      } catch (shareErr: any) {
        // If file path fails, try base64 as fallback
        if (shareErr.message && shareErr.message !== 'User did not share') {
          await Share.open({
            url: `data:text/csv;base64,${base64Data}`,
            type: 'text/csv',
            filename: fileName,
            subject: 'Transaction Report',
            failOnCancel: false,
          });
        }
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Export Failed',
          text2: error.message,
        });
      }
    }
  };

  const handleExportPDF = async () => {
    if (filteredOrders.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Data',
        text2: 'No transactions found',
      });
      return;
    }

    let results: any = null;
    setLoading(true);
    try {
      const rowsHtml = filteredOrders.map(order => `
        <tr>
          <td>${new Date(order.created_at || order.date).toLocaleString()}</td>
          <td>#${order.id}</td>
          <td>${order.customer_name || 'Walk-in'}</td>
          <td style="text-align: right;">Rs.${Number(order.total_amount).toLocaleString()}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
              h1 { color: #f43f5e; margin-bottom: 5px; }
              .summary { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; }
              th { background-color: #f8fafc; text-align: left; padding: 12px; border-bottom: 1px solid #e1e8f0; }
              td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
              .total-row { font-weight: bold; background-color: #f0fdf4; }
            </style>
          </head>
          <body>
            <h1>Transaction Report</h1>
            <div class="summary">
              <p><strong>Period:</strong> ${activeFilter.toUpperCase().replace('_', ' ')}</p>
              <p><strong>Total Bills:</strong> ${summary.count}</p>
              <p><strong>Total Revenue:</strong> Rs.${summary.total.toLocaleString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="3">GRAND TOTAL</td>
                  <td style="text-align: right;">Rs.${summary.total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const options: any = {
        html,
        fileName: `Report_${activeFilter}_${Date.now()}`,
      };

      try {
        results = await generatePDF(options);
      } catch (pdfErr) {
        console.error('PDF Conversion Error:', pdfErr);
        throw pdfErr;
      }

      if (!results) {
        throw new Error('PDF generation failed: No result returned from native module');
      }

      const fPath = results.filePath || (results as any).path;

      if (!fPath) {
        throw new Error('PDF generation failed: filePath is missing from response');
      }

      const shareOptions: any = {
        type: 'application/pdf',
        subject: 'Transaction Report',
        filename: `Report_${activeFilter}_${Date.now()}.pdf`,
        url: fPath.startsWith('file://') ? fPath : `file://${fPath}`,
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        const detail = results ? JSON.stringify(results) : 'No results';
        Toast.show({
          type: 'error',
          text1: 'PDF Export Error',
          text2: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = async () => {
    if (filteredOrders.length === 0) return;
    try {
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText(`\nTRANSACTION REPORT\n`, { encoding: 'GBK', codepage: 0, widthtimes: 1, heigthtimes: 1, fonttype: 1 });
      await BluetoothEscposPrinter.printText(`Period: ${activeFilter.toUpperCase()}\n`, {});
      await BluetoothEscposPrinter.printText(`------------------------------\n`, {});
      await BluetoothEscposPrinter.printText(`Total Bills: ${summary.count}\n`, {});
      await BluetoothEscposPrinter.printText(`Total Revenue: Rs.${summary.total.toLocaleString()}\n`, {});
      await BluetoothEscposPrinter.printText(`------------------------------\n\n`, {});
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);

      for (const order of filteredOrders.slice(0, 20)) {
        const date = new Date(order.created_at || order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await BluetoothEscposPrinter.printText(`${date}  #${String(order.id).slice(-4)}  Rs.${order.total_amount}\n`, {});
      }
      await BluetoothEscposPrinter.printText(`\n\n\n`, {});
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Printer Error',
        text2: 'Connect printer in settings',
      });
    }
  };

  const FilterChip = ({ label, id }: { label: string; id: DateFilter }) => (
    <TouchableOpacity
      onPress={() => setActiveFilter(id)}
      style={[styles.chip, activeFilter === id && styles.chipActive]}
    >
      <Text style={[styles.chipText, activeFilter === id && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      <View 
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction Reports</Text>
          <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
            <Icon name="refresh-cw" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
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
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
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
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#f0fdf4' }]} onPress={handlePrintReport}>
                  <Icon name="printer" size={12} color="#10b981" />
                  <Text style={[styles.exportText, { color: '#10b981', fontSize: 10 }]}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#eff6ff' }]} onPress={handleExportPDF}>
                  <Icon name="file" size={12} color="#3b82f6" />
                  <Text style={[styles.exportText, { color: '#3b82f6', fontSize: 10 }]}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#f0fdf4' }]} onPress={handleExportExcel}>
                  <Icon name="grid" size={12} color="#22c55e" />
                  <Text style={[styles.exportText, { color: '#22c55e', fontSize: 10 }]}>Excel</Text>
                </TouchableOpacity>
              </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },

  filterScroll: { padding: 12, gap: 8 },

  content: { flex: 1 },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe'
  },

  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },

  chipText: { fontSize: 13, fontWeight: '600', color: '#1e3a8a' },

  chipTextActive: { color: '#ffffff' },

  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 24,
    padding: 20,
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },

  summaryItem: { flex: 1, alignItems: 'center' },

  summaryLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2563eb'
  },

  divider: { width: 1, backgroundColor: '#e2e8f0', height: '100%' },

  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1
  },

  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },

  exportText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#2563eb',
    marginLeft: 4
  },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },

  orderId: { fontSize: 14, fontWeight: '900', color: '#1e3a8a' },

  orderDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2
  },

  orderAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563eb'
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    padding: 20
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center'
  },
});

export default Reports;
