import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrders } from '../api';

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
            // Alert.alert('Sync failed', 'Could not refresh bill logs.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [navigation, loadData]);

    const BillCard = ({ item }: { item: any }) => (
        <TouchableOpacity 
            className="bg-white p-5 rounded-[32px] mb-4 border border-gray-100 shadow-sm flex-row items-center justify-between"
            activeOpacity={0.7}
        >
            <View className="flex-row items-center space-x-4">
                <View className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center">
                    <Feather name="file-text" size={20} color="#64748b" />
                </View>
                <View>
                    <Text className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md self-start mb-1">
                        #{item.id || item.order_number}
                    </Text>
                    <Text className="text-sm font-black text-slate-800 tracking-tight">
                        {item.customer_name || item.customer?.name || 'Walk-in Customer'}
                    </Text>
                    <Text className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <View className="items-end">
                <Text className="text-lg font-black text-slate-900 tracking-tighter">
                    ₹{(item.total_amount || item.total || 0).toLocaleString()}
                </Text>
                <View className="flex-row items-center mt-1">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                    <Text className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">{item.status || 'PAID'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" />
            
            {/* Premium Header */}
            <View className="px-6 pt-6 pb-4 bg-white shadow-sm rounded-b-[40px]">
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-3xl font-black italic text-slate-900 lowercase leading-tight">
                            billing<Text className="text-rose-600">.</Text>
                        </Text>
                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transaction Vault History</Text>
                    </View>
                    <TouchableOpacity onPress={loadData} className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <Feather name="refresh-cw" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                {/* Search / Filter Placeholder */}
                <View className="relative">
                    <View className="absolute left-4 top-1/2 -mt-2.5 z-10">
                        <Feather name="search" size={16} color="#cbd5e1" />
                    </View>
                    <View className="bg-gray-50/50 border border-gray-100 px-12 py-3 rounded-2xl">
                        <Text className="font-bold text-gray-300 text-xs">Search transactions...</Text>
                    </View>
                </View>

                {/* Stats Row */}
                <View className="flex-row gap-3 mt-6 mb-2">
                    <View className="p-4 rounded-3xl bg-rose-50 flex-1 shadow-sm">
                        <Text className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Today</Text>
                        <Text className="text-xl font-black text-slate-900 mt-1">₹0</Text>
                    </View>
                    <View className="p-4 rounded-3xl bg-emerald-50 flex-1 shadow-sm">
                        <Text className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Average</Text>
                        <Text className="text-xl font-black text-slate-900 mt-1">₹0</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#E11D48" size="large" />
                    <Text className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Syncing terminals...</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => <BillCard item={item} />}
                    ListEmptyComponent={() => (
                        <View className="items-center py-20 opacity-30">
                            <Feather name="file-text" size={40} color="#64748b" />
                            <Text className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No local records</Text>
                        </View>
                   )}
                />
            )}

           
        </SafeAreaView>
    );
};

export default Bills;
