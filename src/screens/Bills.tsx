import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrders } from '../api';
import { printReceipt } from '../utils/printer';

const HEADER_GRADIENT = ['#0f172a', '#1e293b'];

const Bills = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<any>(null);

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
    loadBusinessInfo();
  }, [loadData]);

  const loadBusinessInfo = async () => {
    try {
      const data = await AsyncStorage.getItem('business_info');
      if (data) setBusinessInfo(JSON.parse(data));
    } catch (e) {}
  };

  const handlePrint = async () => {
    if (!selectedBill) return;
    
    const items = billItems.map((item: any) => ({
      name: item.name || `Product ${item.product_id}`,
      quantity: item.quantity || 1,
      price: item.price || 0
    }));

    const total = selectedBill.total_amount || selectedBill.total || 0;

    await printReceipt({
      customerName: selectedBill.customer_name || 'Walk-in Guest',
      customerPhone: selectedBill.customer_phone || 'N/A',
      items,
      totalAmount: total,
      billId: selectedBill.id,
      date: new Date(selectedBill.created_at).toLocaleDateString()
    });
    setReceiptModalVisible(false);
    setModalVisible(false);
  };

  const handleOpenBill = (item: any) => {
    console.log("CLICKED", item);
    setSelectedBill(item);
    setModalVisible(true);
  };

  // Parse items from bill - handle multiple possible formats
  const billItems = useMemo(() => {
    if (!selectedBill) return [];

    let items = selectedBill.items;

    // If items is a string (JSON), parse it
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error('Failed to parse items:', e);
        return [];
      }
    }

    return Array.isArray(items) ? items : [];
  }, [selectedBill]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const customer = (order.customer_name || '').toLowerCase();
      const orderId = String(order.id || order.order_number || '').toLowerCase();
      const amount = String(order.total_amount || order.total || '').toLowerCase();
      const search = searchTerm.toLowerCase().trim();
      return customer.includes(search) || orderId.includes(search) || amount.includes(search);
    });
  }, [orders, searchTerm]);

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

      <LinearGradient
        colors={HEADER_GRADIENT}
        className="px-6 pt-4 pb-9 rounded-b-[35px]"
      >
        <View className="flex-row items-center bg-white px-4 h-11 rounded-xl space-x-2">
          <Feather name="search" size={14} color="#64748b" />
          <TextInput
            placeholder="Search by ID, customer or amount..."
            placeholderTextColor="#64748b"
            style={{ fontSize: 11, fontWeight: '700', flex: 1, color: '#0f172a' }}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
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
          data={filteredOrders}
          contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
          keyExtractor={item => String(item.id)}
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
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[30px] max-h-[92%]">
            {/* Drag Indicator */}
            <View className="items-center py-3">
              <View className="w-10 h-1.5 bg-slate-300 rounded-full" />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              <View className="px-6">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-5">
                  <Text className="text-[18px] font-black text-slate-900">
                    Bill Details
                  </Text>

                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    className="w-9 h-9 bg-slate-100 rounded-full items-center justify-center"
                  >
                    <Feather name="x" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {selectedBill && (
                  <>
                    {/* 🔥 SUMMARY CARD */}
                    <View className="bg-orange-50 border border-orange-200 p-4 rounded-2xl mb-6">
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-[15px] font-black text-slate-900">
                          #{selectedBill.id}
                        </Text>

                        <View className="bg-green-500 px-3 py-1 rounded-full">
                          <Text className="text-[9px] font-black text-white">
                            {selectedBill.status || 'PAID'}
                          </Text>
                        </View>
                      </View>

                      <View className="space-y-2">
                        <Text className="text-[12px] font-bold text-slate-700">
                          {selectedBill.customer_name || 'Walk-in Guest'}
                        </Text>

                        <Text className="text-[11px] text-slate-500">
                          {' '}
                          {new Date(selectedBill.created_at).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* 🔥 PRODUCTS */}
                    <View className="mb-6">
                      <Text className="text-[14px] font-black text-slate-900 mb-3">
                        Products ({billItems.length})
                      </Text>

                      {billItems.length > 0 ? (
                        <View className="space-y-3">
                          {billItems.map((item: any, index: number) => (
                            <View
                              key={index}
                              className="bg-white border border-slate-200 rounded-3xl p-4 mb-3"
                              style={{
                                shadowColor: '#000',
                                shadowOpacity: 0.05,
                                shadowRadius: 10,
                                elevation: 2,
                              }}
                            >
                              {/* 🔥 HEADER ROW */}
                              <View className="flex-row justify-between items-start mb-3">
                                {/* Product Info */}
                                <View className="flex-1 pr-3">
                                  <Text className="text-[14px] font-black text-slate-900 leading-5">
                                    {item.name || `Product ${item.product_id}`}
                                  </Text>

                                  <Text className="text-[10px] text-slate-400 mt-1">
                                    ID: {item.product_id || item.id}
                                  </Text>
                                </View>

                                {/* Quantity Badge */}
                                <View className="bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                                  <Text className="text-[11px] font-black text-orange-500">
                                    Qty {item.quantity || 1}
                                  </Text>
                                </View>
                              </View>

                              {/* 🔥 PRICE SECTION */}
                              <View className="bg-slate-50 rounded-xl p-3 flex-row justify-between items-center">
                                {/* Unit Price */}
                                <View>
                                  <Text className="text-[10px] text-slate-400 mb-1">
                                    Unit Price
                                  </Text>
                                  <Text className="text-[14px] font-black text-slate-900">
                                    ₹{(item.price || 0).toLocaleString()}
                                  </Text>
                                </View>

                                {/* Divider */}
                                <View className="w-[1px] h-8 bg-slate-200" />

                                {/* Total */}
                                <View className="items-end">
                                  <Text className="text-[10px] text-slate-400 mb-1">
                                    Total
                                  </Text>
                                  <Text className="text-[15px] font-black text-orange-500">
                                    ₹
                                    {(
                                      (item.price || 0) * (item.quantity || 1)
                                    ).toLocaleString()}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View className="bg-slate-50 p-6 rounded-xl items-center border border-slate-200">
                          <Feather name="package" size={28} color="#cbd5e1" />
                          <Text className="text-[12px] font-bold text-slate-400 mt-2">
                            No products in this bill
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 🔥 TOTAL */}
                    <View className="bg-slate-900 rounded-2xl p-5 mb-6">
                      <Text className="text-[11px] text-slate-300 mb-1">
                        Total Amount
                      </Text>
                      <Text className="text-[22px] font-black text-orange-400">
                        ₹
                        {(
                          selectedBill.total_amount ||
                          selectedBill.total ||
                          0
                        ).toLocaleString()}
                      </Text>
                    </View>

                  

                    {/* 🔥 BUTTONS */}
                    <View className="flex-row gap-4">
                      <TouchableOpacity
                        onPress={() => setModalVisible(false)}
                        className="flex-1 bg-slate-100 py-5 rounded-3xl items-center"
                      >
                        <Text className="text-slate-500 font-black text-[11px] uppercase tracking-widest">
                          Close
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setReceiptModalVisible(true)}
                        className="flex-[1.5] bg-orange-500 py-5 rounded-3xl flex-row items-center justify-center space-x-2"
                      >
                        <Feather name="printer" size={16} color="white" />
                        <Text className="text-white font-black text-[11px] uppercase tracking-widest">
                          Preview Receipt
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🔥 RECEIPT PREVIEW BOTTOM SHEET */}
      <Modal visible={receiptModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-50 rounded-t-[40px] w-full max-h-[92%] overflow-hidden shadow-2xl">
            {/* Drag Indicator */}
            <View className="items-center py-5">
              <View className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </View>

            <View className="flex-row justify-between items-center px-8 pb-5">
                <Text className="text-[14px] font-black text-slate-800 uppercase tracking-[2px]">Final Receipt</Text>
                <TouchableOpacity onPress={() => setReceiptModalVisible(false)} className="bg-slate-50 w-11 h-11 rounded-full items-center justify-center border border-slate-100">
                    <Feather name="x" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                className="px-2 py-6" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* The "Paper" */}
              <View 
                className="bg-white p-3 rounded-md mb-6 mx-2">
                {/* Receipt Header */}
                <View className="items-center mb-6">
                  {businessInfo?.showLogo && businessInfo?.logoBase64 && (
                    <View className="mb-4 p-2 bg-slate-50 rounded-2xl">
                         <Image source={{ uri: `data:image/png;base64,${businessInfo.logoBase64}` }} className="w-24 h-24 rounded-xl" resizeMode="contain" />
                    </View>
                  )}
                  <Text className="text-[20px] font-black text-slate-900 text-center uppercase tracking-tighter">{businessInfo?.storeName || 'BILLING'}</Text>
                  {businessInfo?.tagline && <Text className="text-[12px] text-slate-400 font-bold text-center mt-1 px-4 italic">{businessInfo.tagline}</Text>}
                  
                  <View className="mt-4 items-center">
                    {businessInfo?.address && <Text className="text-[10px] text-slate-400 font-semibold text-center leading-4">{businessInfo.address}</Text>}
                    {businessInfo?.phone && <Text className="text-[10px] text-slate-500 font-black text-center mt-1">Ph: {businessInfo.phone}</Text>}
                  </View>
                </View>

                {/* Bill Metadata */}
                <View className="flex-row justify-between mb-4 px-1">
                    <Text className="text-[9px] font-black text-slate-300 uppercase letter-spacing-[1px]">ORD-#{selectedBill?.id}</Text>
                    <Text className="text-[9px] font-black text-slate-300 uppercase letter-spacing-[1px]">{new Date(selectedBill?.created_at).toLocaleDateString()}</Text>
                </View>

                <View className="h-[1px] border-b border-dashed border-slate-200 mb-6" />

                {/* Items Container */}
                <View className="space-y-4 mb-6">
                  {billItems.map((item: any, idx: number) => (
                    <View key={idx} className="flex-row  border-b border-dashed border-slate-200 pb-2 justify-between items-start">
                      <View className="flex-1 pr-6">
                        <Text className="text-[13px] font-black text-slate-800 leading-5">{item.name || `Product ${idx+1}`}</Text>
                        <Text className="text-[11px] font-bold text-slate-400 mt-0.5">{item.quantity} x ₹{item.price}</Text>
                      </View>
                      <Text className="text-[13px] font-black text-slate-900">₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>


                {/* Financial Summary */}
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-[16px] font-black text-slate-900 uppercase">Paid Amount</Text>
                  <Text className="text-[22px] font-black text-orange-500">₹{(selectedBill?.total_amount || selectedBill?.total || 0).toLocaleString()}</Text>
                </View>

                {/* Payment Evidence / QR */}
                {businessInfo?.showQRCode && businessInfo?.upiId && (
                  <View className="items-center mt-4 bg-slate-50 p-6 rounded-[30px] border border-slate-100">
                    <Text className="text-[10px] font-black text-slate-400 uppercase mb-5 tracking-[2px]">Verify Payment via UPI</Text>
                    <View className="bg-white p-4 rounded-3xl shadow-sm">
                        <Image
                          source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${businessInfo.upiId}&pn=${businessInfo.storeName || 'Merchant'}&am=${selectedBill?.total_amount || selectedBill?.total || 0}&cu=INR`)}` }}
                          className="w-40 h-40"
                        />
                    </View>
                    <Text className="text-[10px] font-bold text-slate-400 mt-5 bg-white px-4 py-1.5 rounded-full border border-slate-100">{businessInfo.upiId}</Text>
                  </View>
                )}

                {/* Footer Section */}
                <View className="mt-8 border-b border-dashed border-slate-200 pb-5 pt-6 items-center">
                    <Text className="text-[12px] font-black text-slate-800 text-center">{businessInfo?.footerMessage || 'Thank You! Visit Again.'}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View className="px-8 pb-12 pt-6 bg-white flex-row gap-4 border-t border-slate-100">
               <TouchableOpacity 
                 onPress={() => setReceiptModalVisible(false)} 
                 className="flex-1 bg-slate-50 border border-slate-200 py-5 rounded-[20px] items-center"
               >
                   <Text className="text-slate-500 font-black uppercase text-[12px] tracking-widest">Back</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 onPress={handlePrint} 
                 className="flex-[2] bg-orange-500 py-5 rounded-[20px] flex-row items-center justify-center space-x-3 shadow-xl shadow-orange-300"
               >
                   <Feather name="printer" size={20} color="white" />
                   <Text className="text-white font-black uppercase text-[12px] tracking-widest">Print Receipt</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Bills;
