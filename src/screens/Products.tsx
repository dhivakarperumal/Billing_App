import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchProducts, 
  createProduct, 
  createCategory, 
  Product 
} from '../api';

const Products = () => {
  const { token } = useAuth();
  
  // Data State - Always initialize as empty array
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isFABExpanded, setIsFABExpanded] = useState(false);
  const [isProductModalVisible, setProductModalVisible] = useState(false);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);

  // Form States
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data: any = await fetchProducts(token);
      // Robust check: ensure we always have an array
      if (Array.isArray(data)) {
        setProducts(data);
      } else if (data && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to sync inventory');
      setProducts([]); // Fallback to empty on error
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProduct = async () => {
    if (!newName.trim() || !newPrice.trim()) {
      return Alert.alert('Essentials missing!', 'Name and price are required.');
    }
    setSaving(true);
    try {
      await createProduct({ 
        name: newName.trim(), 
        price: Number(newPrice) 
      }, token);
      setProductModalVisible(false);
      setNewName('');
      setNewPrice('');
      loadData();
      Alert.alert('Success', 'Inventory updated live!');
    } catch (error: any) {
      Alert.alert('Process failed', error?.message || 'Check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    try {
      await createCategory({ name: newCategory.trim() }, token);
      setCategoryModalVisible(false);
      setNewCategory('');
      Alert.alert('Success', 'New category added to vault.');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  // Safe filter logic
  const getSafeProducts = () => {
    return Array.isArray(products) ? products : [];
  };

  const filteredProducts = getSafeProducts().filter(p => 
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatCard = ({ label, value, colorClass }: any) => (
    <View className={`p-4 rounded-3xl ${colorClass} flex-1 shadow-sm`}>
      <Text className="text-[10px] font-black text-black/40 uppercase tracking-widest">{label}</Text>
      <Text className="text-xl font-black text-slate-900 mt-1">{value || 0}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View className="px-6 pt-6 pb-4 bg-white shadow-sm rounded-b-[40px]">
        <View className="flex-row items-center justify-between mb-6">
          <View>
             <Text className="text-3xl font-black italic text-slate-900 lowercase leading-tight">
               inventory<Text className="text-rose-600">.</Text>
             </Text>
             <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Vault Control</Text>
          </View>
          <TouchableOpacity className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
             <Feather name="filter" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <View className="absolute left-4 top-1/2 -mt-2.5 z-10">
            <Feather name="search" size={16} color="#cbd5e1" />
          </View>
          <TextInput
            placeholder="Search by name or code..."
            placeholderTextColor="#cbd5e1"
            className="bg-gray-50/50 border border-gray-100 px-12 py-3 rounded-2xl font-bold text-slate-800 text-xs"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-3 mt-6 mb-2">
            <StatCard label="Total" value={getSafeProducts().length} colorClass="bg-rose-50" />
            <StatCard label="Active" value={getSafeProducts().filter(p => (p.price || 0) > 0).length} colorClass="bg-emerald-50" />
            <StatCard label="Warning" value="02" colorClass="bg-amber-50" />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#E11D48" size="large" />
          <Text className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Vault...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity className="bg-white p-5 rounded-[32px] mb-4 border border-gray-100 shadow-sm flex-row items-center justify-between overflow-hidden">
                <View className="flex-row items-center space-x-4">
                  <View className="w-14 h-14 bg-rose-50 rounded-2xl items-center justify-center">
                    <Feather name="box" size={24} color="#E11D48" />
                  </View>
                  <View>
                    <Text className="text-sm font-black text-slate-800 tracking-tight">{item.name}</Text>
                    <View className="flex-row items-center space-x-2 mt-1">
                      <Text className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase">PRD-{item.id}</Text>
                      <Text className="text-[9px] font-bold text-gray-300 uppercase italic">Active Listing</Text>
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-black text-slate-900 tracking-tighter">
                    ₹{(item.price || 0).toLocaleString()}
                  </Text>
                </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View className="items-center py-20">
              <Feather name="package" size={40} color="#e5e7eb" />
              <Text className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">No Items in Vault</Text>
            </View>
          )}
        />
      )}

      {/* --- FLOATING ACTION BUTTON (FAB) --- */}
      <View className="absolute bottom-8 right-8 items-end z-50">
        {isFABExpanded && (
          <View className="mb-4 space-y-3 items-end">
            <TouchableOpacity 
              onPress={() => { setCategoryModalVisible(true); setIsFABExpanded(false); }}
              className="flex-row items-center bg-white border border-gray-100 py-3 px-5 rounded-2xl shadow-xl"
            >
              <Text className="text-[10px] font-black text-slate-800 uppercase tracking-widest mr-3">New Category</Text>
              <Feather name="tag" size={16} color="#E11D48" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => { setProductModalVisible(true); setIsFABExpanded(false); }}
              className="flex-row items-center bg-white border border-gray-100 py-3 px-5 rounded-2xl shadow-xl"
            >
              <Text className="text-[10px] font-black text-slate-800 uppercase tracking-widest mr-3">List Product</Text>
              <Feather name="plus-square" size={16} color="#E11D48" />
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity 
          onPress={() => setIsFABExpanded(!isFABExpanded)}
          style={{ elevation: 15 }}
          className={`w-16 h-16 rounded-[24px] items-center justify-center shadow-2xl transition-all ${isFABExpanded ? 'bg-slate-900' : 'bg-rose-600'}`}
        >
          <Feather name={isFABExpanded ? 'x' : 'plus'} size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* ADD PRODUCT MODAL */}
      <Modal visible={isProductModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
           <View className="bg-white rounded-t-[50px] p-8 pb-12 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-2xl font-black italic text-slate-900 uppercase">List Product</Text>
                <TouchableOpacity onPress={() => setProductModalVisible(false)} className="p-2">
                  <Feather name="x" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              <View className="space-y-4">
                 <View>
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Product Identity</Text>
                    <TextInput 
                      className="bg-gray-50 p-5 rounded-2xl font-bold text-slate-800"
                      placeholder="e.g. Traditional Wedding Silk"
                      value={newName}
                      onChangeText={setNewName}
                    />
                 </View>
                 <View>
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Price Component (₹)</Text>
                    <TextInput 
                      className="bg-gray-50 p-5 rounded-2xl font-bold text-slate-800"
                      placeholder="2999"
                      keyboardType="numeric"
                      value={newPrice}
                      onChangeText={setNewPrice}
                    />
                 </View>

                 <TouchableOpacity 
                   onPress={handleCreateProduct}
                   disabled={saving}
                   className="bg-rose-600 p-6 rounded-3xl items-center mt-4 shadow-xl shadow-rose-200"
                 >
                    {saving ? <ActivityIndicator color="white" /> : (
                      <Text className="text-white font-black uppercase tracking-widest">Sync to Cloud</Text>
                    )}
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

      {/* ADD CATEGORY MODAL */}
      <Modal visible={isCategoryModalVisible} animationType="fade" transparent>
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setCategoryModalVisible(false)}
          className="flex-1 justify-center px-6 bg-black/60"
        >
           <View className="bg-white rounded-[40px] p-8 shadow-2xl overflow-hidden" onStartShouldSetResponder={() => true}>
              <Text className="text-xl font-black text-slate-900 uppercase italic">Add Category</Text>
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-6">Inventory Taxonomies</Text>
              
              <TextInput 
                className="bg-gray-50 p-5 rounded-2xl font-bold text-slate-800 mb-6"
                placeholder="Category Name"
                value={newCategory}
                onChangeText={setNewCategory}
                autoFocus
              />

              <TouchableOpacity 
                onPress={handleCreateCategory}
                className="bg-slate-900 p-5 rounded-2xl items-center"
              >
                <Text className="text-white font-black uppercase tracking-widest text-xs">Register Category</Text>
              </TouchableOpacity>
           </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

export default Products;
