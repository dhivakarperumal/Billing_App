import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal
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

    const [selectedBill, setSelectedBill] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);

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

    const handleOpenBill = (item: any) => {
        setSelectedBill(item);
        setModalVisible(true);
    };

    const BillCard = ({ item }: { item: any }) => (
        <TouchableOpacity 
            className="bg-white rounded-3xl p-4 mb-3 border border-slate-100 flex-row justify-between"
            style={{ elevation: 2 }}
            activeOpacity={0.8}
            onPress={() => handleOpenBill(item)}
        >
            <View className="flex-row items-center flex-1 space-x-3">
                <View className="w-12 h-14 bg-slate-50 rounded-xl items-center justify-center">
                    <Feather name="file-text" size={18} color="#f97316" />
                </View>

                <View className="flex-1">
                    <View className="flex-row items-center space-x-2 mb-1">
                        <Text className="text-[9px] font-black text-orange-500 bg-orange-100 px-1.5 py-[2px] rounded">
                            #ORD-{item.id || item.order_number}
                        </Text>
                        <Text className="text-[9px] font-bold text-slate-400">
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>

                    <Text className="text-[14px] font-black text-slate-900">
                        {item.customer_name || 'Walk-in Guest'}
                    </Text>
                </View>
            </View>

            <View className="items-end">
                <Text className="text-[16px] font-black text-slate-900">
                    ₹{(item.total_amount || item.total || 0).toLocaleString()}
                </Text>

                <View className="flex-row items-center space-x-1 mt-1">
                    <View className="w-[5px] h-[5px] bg-green-500 rounded-full" />
                    <Text className="text-[9px] font-black text-green-500 uppercase">
                        {item.status || 'PAID'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={['left', 'right']}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            
            <LinearGradient colors={HEADER_GRADIENT} className="px-6 pt-4 pb-9 rounded-b-[35px]">
                <View className="flex-row items-center bg-white px-4 h-11 rounded-xl space-x-2">
                    <Feather name="search" size={14} color="#64748b" />
                    <Text className="text-[11px] font-bold text-slate-500">
                        Search transaction records...
                    </Text>
                </View>
            </LinearGradient>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#f97316" size="large" />
                    <Text className="mt-4 text-[9px] font-black text-slate-400 tracking-[2px]">
                        SYNCING VAULT RECORDS...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
                    keyExtractor={(item) => String(item.id)}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => <BillCard item={item} />}
                    ListEmptyComponent={() => (
                        <View className="items-center py-20">
                            <Feather name="database" size={40} color="#e2e8f0" />
                            <Text className="mt-4 text-[9px] font-black text-slate-200 tracking-[1.5px]">
                                NO TRANSACTION DATA LOGGED
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* MODAL */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/60 justify-center p-5">
                    <View className="bg-white rounded-3xl p-5">

                        <Text className="text-lg font-black mb-4 text-slate-900">
                            Bill Preview
                        </Text>

                        {selectedBill && (
                            <View className="bg-slate-50 p-4 rounded-2xl mb-5">
                                <Text className="text-[13px] font-bold text-slate-700 mb-1">
                                    Order ID: #{selectedBill.id}
                                </Text>
                                <Text className="text-[13px] font-bold text-slate-700 mb-1">
                                    Customer: {selectedBill.customer_name}
                                </Text>
                                <Text className="text-[13px] font-bold text-slate-700 mb-1">
                                    Amount: ₹{(selectedBill.total_amount || 0).toLocaleString()}
                                </Text>
                                <Text className="text-[13px] font-bold text-slate-700">
                                    Date: {new Date(selectedBill.created_at).toLocaleString()}
                                </Text>
                            </View>
                        )}

                        <View className="flex-row justify-between space-x-2">
                            <TouchableOpacity
                                className="flex-1 p-4 rounded-xl bg-slate-200 items-center"
                                onPress={() => setModalVisible(false)}
                            >
                                <Text className="font-black text-slate-600">Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 p-4 rounded-xl bg-orange-500 flex-row justify-center items-center space-x-2"
                                onPress={() => console.log('Print bill:', selectedBill)}
                            >
                                <Feather name="printer" size={16} color="#fff" />
                                <Text className="text-white font-black">Print</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

export default Bills;