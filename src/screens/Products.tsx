import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { fetchProducts, Product } from '../api';

const HEADER_GRADIENT = ['#0f172a', '#1e293b'];

const Products = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFABExpanded, setIsFABExpanded] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp: any = await fetchProducts(token);
      let items = Array.isArray(resp) ? resp : resp?.products || resp?.data || [];
      setProducts(items);
    } catch (error: any) {
      console.error('Fetch error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter((p: Product) => {
    const name = (p.name || '').toLowerCase();
    const code = (p.product_code || String(p.id) || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* HEADER */}
      <LinearGradient colors={HEADER_GRADIENT} className="px-6 pt-4 pb-8 rounded-b-[35px]">
        <View className="flex-row items-center bg-white rounded-xl px-4 h-12">
          <Feather name="search" size={15} color="#64748b" />
          <TextInput
            placeholder="Search assets or product codes..."
            placeholderTextColor="#64748b"
            className="flex-1 ml-2 text-[13px] font-bold text-slate-900"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </LinearGradient>

      {/* LOADING */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#f97316" size="large" />
          <Text className="mt-3 text-[10px] font-black text-slate-400 tracking-widest">
            SYNCING VAULT...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          numColumns={2} // ✅ GRID
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddProduct', { id: item.id })}
              activeOpacity={0.85}
              className="bg-white w-[48%] mb-4 rounded-2xl p-3 border border-slate-100"
            >
              {/* IMAGE */}
              <View className="h-28 bg-slate-100 rounded-xl items-center justify-center overflow-hidden mb-3">
                {item.image || item.images?.[0] ? (
                  <Image
                    source={{ uri: item.image || item.images?.[0] }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="box" size={24} color="#f97316" />
                )}
              </View>

              {/* NAME */}
              <Text className="text-[12px] font-black text-slate-900" numberOfLines={1}>
                {item.name}
              </Text>

              {/* BADGES */}
              <View className="flex-row flex-wrap mt-1 gap-1">
                <Text className="text-[8px] font-black text-orange-500 bg-orange-100 px-2 py-[2px] rounded-md">
                  ID-{item.id}
                </Text>
                {item.category && (
                  <Text className="text-[8px] font-black text-slate-500 bg-slate-100 px-2 py-[2px] rounded-md">
                    {item.category}
                  </Text>
                )}
              </View>

              {/* PRICE */}
              <Text className="mt-2 text-[14px] font-black text-slate-900">
                ₹{Number(
                  item.offer_price ||
                  item.price ||
                  item.variants?.[0]?.sellingPrice ||
                  item.variants?.[0]?.mrp ||
                  0
                ).toLocaleString('en-IN')}
              </Text>

              {/* STOCK */}
              <View className="mt-1 bg-green-50 self-start px-2 py-[2px] rounded-md">
                <Text className="text-[8px] font-black text-green-600">
                  {item.total_stock || 0} UNIT
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View className="items-center py-20">
              <Feather name="package" size={40} color="#e5e7eb" />
              <Text className="mt-3 text-[10px] font-black text-slate-300 tracking-widest">
                NO ASSETS FOUND IN VAULT
              </Text>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <View className="absolute bottom-8 right-6 items-end">
        {isFABExpanded && (
          <View className="mb-3 gap-2">
            <TouchableOpacity
              onPress={() => { navigation.navigate('AddCategory'); setIsFABExpanded(false); }}
              className="flex-row items-center bg-white px-4 py-2 rounded-xl"
            >
              <Text className="text-[9px] font-black text-slate-900 mr-2">New Category</Text>
              <View className="bg-slate-900 w-8 h-8 rounded-lg items-center justify-center">
                <Feather name="tag" size={14} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { navigation.navigate('AddProduct'); setIsFABExpanded(false); }}
              className="flex-row items-center bg-white px-4 py-2 rounded-xl"
            >
              <Text className="text-[9px] font-black text-slate-900 mr-2">List Product</Text>
              <View className="bg-slate-900 w-8 h-8 rounded-lg items-center justify-center">
                <Feather name="box" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setIsFABExpanded(!isFABExpanded)}
          className={`w-14 h-14 rounded-full items-center justify-center ${
            isFABExpanded ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          <Feather name={isFABExpanded ? 'x' : 'plus'} size={26} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Products;