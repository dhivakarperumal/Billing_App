import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrders } from '../api';

const HEADER_GRADIENT = ['#0f172a', '#1e293b'];

const Bills = () => {
    const { token } = useAuth();
    const navigation = useNavigation<any>();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await fetchOrders(token);
            setOrders(data || []);
        } catch (error: any) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const BillCard = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.card}
            activeOpacity={0.8}
        >
            <View style={styles.cardMain}>
                <View style={styles.iconBox}>
                    <Feather name="file-text" size={18} color="#f97316" />
                </View>
                <View style={styles.metaBox}>
                    <View style={styles.badgeLine}>
                        <Text style={styles.idBadge}>#ORD-{item.id || item.order_number}</Text>
                        <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.customerName}>{item.customer_name || 'Walk-in Guest'}</Text>
                </View>
            </View>
            <View style={styles.valBox}>
                <Text style={styles.totalVal}>₹{(item.total_amount || item.total || 0).toLocaleString()}</Text>
                <View style={styles.statusRow}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{item.status || 'PAID'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            
            <LinearGradient colors={HEADER_GRADIENT} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Billing Logs<Text style={{ color: '#f97316' }}>.</Text></Text>
                        <Text style={styles.headerSubtitle}>Historical transaction vault</Text>
                    </View>
                    <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
                        <Feather name="refresh-cw" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBar}>
                    <Feather name="search" size={14} color="#64748b" />
                    <Text style={styles.searchPlaceholder}>Search transaction records...</Text>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator color="#f97316" size="large" />
                    <Text style={styles.loadingText}>SYNCING VAULT RECORDS...</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    contentContainerStyle={styles.listContent}
                    keyExtractor={(item) => String(item.id)}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => <BillCard item={item} />}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyBox}>
                            <Feather name="database" size={40} color="#e2e8f0" />
                            <Text style={styles.emptyText}>NO TRANSACTION DATA LOGGED</Text>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 35, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 10, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 15, height: 44, borderRadius: 15, gap: 10 },
    searchPlaceholder: { color: '#64748b', fontSize: 11, fontWeight: '700' },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
    listContent: { padding: 20, paddingBottom: 110 },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', elevation: 2 },
    cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconBox: { width: 44, height: 44, backgroundColor: '#f8fafc', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    metaBox: { flex: 1 },
    badgeLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    idBadge: { fontSize: 9, fontWeight: '900', color: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    dateText: { fontSize: 9, fontWeight: '700', color: '#94a3b8' },
    customerName: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
    valBox: { alignItems: 'flex-end' },
    totalVal: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22c55e' },
    statusText: { fontSize: 9, fontWeight: '900', color: '#22c55e', textTransform: 'uppercase' },
    emptyBox: { flex: 1, alignItems: 'center', paddingVertical: 80 },
    emptyText: { marginTop: 15, fontSize: 9, fontWeight: '900', color: '#e2e8f0', letterSpacing: 1.5 }
});

export default Bills;
