import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { fetchProducts, Product } from '../api';

const HEADER_GRADIENT = ['#2563eb', '#1d4ed8'];

const Products = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFABOpen, setIsFABOpen] = useState(false);

  // Animation refs
  const fabAnim      = useRef(new Animated.Value(0)).current;
  const anim1        = useRef(new Animated.Value(0)).current;
  const anim2        = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openFAB = () => {
    setIsFABOpen(true);
    Animated.parallel([
      Animated.spring(fabAnim,      { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(backdropAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.sequence([
        Animated.delay(40),
        Animated.spring(anim2, { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }),
      ]),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(anim1, { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }),
      ]),
    ]).start();
  };

  const closeFAB = () => {
    Animated.parallel([
      Animated.spring(fabAnim,      { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(backdropAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(anim1,        { toValue: 0, useNativeDriver: true, tension: 70, friction: 8 }),
      Animated.spring(anim2,        { toValue: 0, useNativeDriver: true, tension: 70, friction: 8 }),
    ]).start(() => setIsFABOpen(false));
  };

  const toggleFAB = () => (isFABOpen ? closeFAB() : openFAB());

  const navigateTo = (screen: string) => {
    closeFAB();
    setTimeout(() => navigation.navigate(screen), 200);
  };

  const fabRotate    = fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const makeSubStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      { scale: anim },
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
    ],
  });

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp: any = await fetchProducts(token);
      const items = Array.isArray(resp) ? resp : resp?.products || resp?.data || [];
      setProducts(items);
    } catch (error: any) {
      console.error('Fetch error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = products.filter((p: Product) => {
    const name   = (p.name || '').toLowerCase();
    const code   = (p.product_code || String(p.id) || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* HEADER */}
      <LinearGradient colors={HEADER_GRADIENT} className="px-6 pt-4 pb-8 rounded-b-[35px]">
        <View className="flex-row items-center bg-white rounded-xl px-4 h-12">
          <Feather name="search" size={15} color="#64748b" />
          <TextInput
            placeholder="Search products or codes..."
            placeholderTextColor="#64748b"
            className="flex-1 ml-2 text-[13px] font-bold text-slate-900"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Feather name="x" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* LIST */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#2563eb" size="large" />
          <Text className="mt-3 text-[10px] font-black text-slate-400 tracking-widest">
            SYNCING VAULT...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddProduct', { id: item.id })}
              activeOpacity={0.85}
              className="bg-white w-[48%] mb-4 rounded-2xl p-3 border border-slate-100"
              style={{ elevation: 2 }}
            >
              <View className="h-28 bg-slate-100 rounded-xl items-center justify-center overflow-hidden mb-3">
                {item.image || item.images?.[0] ? (
                  <Image
                    source={{ uri: item.image || item.images?.[0] }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="box" size={24} color="#2563eb" />
                )}
              </View>

              <Text className="text-[12px] font-black text-slate-900" numberOfLines={1}>
                {item.name}
              </Text>

              <View className="flex-row flex-wrap mt-1 gap-1">
                <Text className="text-[8px] font-black text-blue-500 bg-blue-100 px-2 py-[2px] rounded-md">
                  ID-{item.id}
                </Text>
                {item.category && (
                  <Text className="text-[8px] font-black text-slate-500 bg-slate-100 px-2 py-[2px] rounded-md">
                    {item.category}
                  </Text>
                )}
              </View>

              <Text className="mt-2 text-[14px] font-black text-slate-900">
                ₹{Number(
                  item.offer_price ||
                  item.price ||
                  item.variants?.[0]?.sellingPrice ||
                  item.variants?.[0]?.mrp ||
                  0
                ).toLocaleString('en-IN')}
              </Text>

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

      {/* ─── SPEED-DIAL FAB ──────────────────────────────────── */}

      {/* Dimmed backdrop */}
      {isFABOpen && (
        <Animated.View
          pointerEvents="auto"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'rgba(15,23,42,0.4)' },
            { opacity: backdropAnim },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={closeFAB}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      <View style={styles.fabContainer} pointerEvents="box-none">
        {/* Sub — Add Category */}
        <Animated.View style={[styles.fabRow, makeSubStyle(anim1)]}>
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Add Category</Text>
          </View>
          <TouchableOpacity
            style={[styles.fabMini, { backgroundColor: '#2563eb' }]}
            onPress={() => navigateTo('AddCategory')}
            activeOpacity={0.85}
          >
            <Feather name="tag" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Sub — Add Product */}
        <Animated.View style={[styles.fabRow, makeSubStyle(anim2)]}>
          <View style={styles.fabLabel}>
            <Text style={styles.fabLabelText}>Add Product</Text>
          </View>
          <TouchableOpacity
            style={[styles.fabMini, { backgroundColor: '#2563eb' }]}
            onPress={() => navigateTo('AddProduct')}
            activeOpacity={0.85}
          >
            <Feather name="box" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity onPress={toggleFAB} style={styles.fabMain} activeOpacity={0.9}>
          <Animated.View style={{ transform: [{ rotate: fabRotate }] }}>
            <Feather name="plus" size={28} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 95,
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
  },
  fabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabLabel: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  fabLabelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1e293b',
  },
  fabMini: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabMain: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});

export default Products;