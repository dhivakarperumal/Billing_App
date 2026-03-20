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
  StatusBar,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchProducts, 
  createProduct, 
  createCategory, 
  Product 
} from '../api';

const Products = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  
  // Data State - Always initialize as empty array
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isFABExpanded, setIsFABExpanded] = useState(false);
  const [isProductModalVisible, setProductModalVisible] = useState(false);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);

  // Form States
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp: any = await fetchProducts(token);
      console.log('API Products Response:', JSON.stringify(resp).substring(0, 200));

      let items = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp && Array.isArray(resp.data)) {
        items = resp.data;
      } else if (resp && Array.isArray(resp.products)) {
        items = resp.products;
      } else if (resp && Array.isArray(resp.items)) {
        items = resp.items;
      }

      setProducts(items);
    } catch (error: any) {
      console.error('Fetch error:', error);
      Alert.alert('Sync failed', error?.message || 'Check your connection.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Replaced handleCreateProduct with navigation to AddProduct screen

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

  const filteredProducts = getSafeProducts().filter((p: Product) => {
    const name = (p.name || '').toLowerCase();
    const code = (p.product_code || String(p.id) || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

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
            <TouchableOpacity 
              onPress={() => navigation.navigate('AddProduct', { id: item.id })}
              className="bg-white p-5 rounded-[32px] mb-4 border border-gray-100 shadow-sm flex-row items-center justify-between overflow-hidden"
            >
                <View className="flex-row items-center space-x-4">
                  <View className="w-14 h-14 bg-rose-50 rounded-2xl items-center justify-center overflow-hidden">
                    {item.image || item.images?.[0] ? (
                      <Image 
                        source={{ uri: item.image || item.images?.[0] }} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name="box" size={24} color="#E11D48" />
                    )}
                  </View>
                  <View>
                    <Text className="text-sm font-black text-slate-800 tracking-tight">{item.name}</Text>
                    <View className="flex-row flex-wrap items-center gap-1.5 mt-1">
                      <Text className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase">PRD-{item.id}</Text>
                      {item.category && (
                        <Text className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{item.category}</Text>
                      )}
                      {(item.subcategory || item.subCategory) && (
                        <Text className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">{item.subcategory || item.subCategory}</Text>
                      )}
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
              onPress={() => { navigation.navigate('AddCategory'); setIsFABExpanded(false); }}
              className="flex-row items-center bg-white border border-gray-100 py-3 px-5 rounded-2xl shadow-xl"
            >
              <Text className="text-[10px] font-black text-slate-800 uppercase tracking-widest mr-3">New Category</Text>
              <Feather name="tag" size={16} color="#E11D48" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => { navigation.navigate('AddProduct'); setIsFABExpanded(false); }}
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
      {/* ADD PRODUCT MODAL REMOVED - Using full screen instead */}

      {/* ADD CATEGORY MODAL REMOVED - Using full screen instead */}

    </SafeAreaView>
  );
};

export default Products;
