import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useAuth } from '../contexts/AuthContext';
import { fetchProducts, updateProduct, Product } from '../api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';

// --- Global Cache for zero-flicker reload ---
let gStockProducts: any[] = [];

const StockItem = memo(({ item, updatingId, handleStockChange, saveProductStock }: any) => (
  <View style={styles.productCard}>
    <View style={styles.productHeader}>
      <View style={styles.imageContainer}>
        {item.image || (item.images && item.images.length > 0) ? (
          <Image source={{ uri: item.image || item.images[0] }} style={styles.productImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="box" size={30} color="#e2e8f0" />
          </View>
        )}
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        {item.name_tamil ? (
          <Text style={styles.tamilName} numberOfLines={1}>{item.name_tamil}</Text>
        ) : null}
        <Text style={styles.productCode}>CODE: {item.product_code || item.id}</Text>
      </View>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => saveProductStock(item)}
        disabled={updatingId === item.id}
      >
        {updatingId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Update</Text>
        )}
      </TouchableOpacity>
    </View>

    <View style={styles.variantsList}>
      <View style={styles.variantHeader}>
        <Text style={[styles.colLabel, { flex: 2 }]}>Variant</Text>
        <Text style={[styles.colLabel, { flex: 1, textAlign: 'center' }]}>Price</Text>
        <Text style={[styles.colLabel, { flex: 1, textAlign: 'right' }]}>Stock Count</Text>
      </View>

      {item.variants?.map((v: any, idx: number) => (
        <View key={idx} style={styles.variantRow}>
          <Text style={[styles.variantName, { flex: 2 }]}>{v.quantity} {v.unit}</Text>
          <Text style={[styles.variantPrice, { flex: 1, textAlign: 'center' }]}>₹{v.sellingPrice || v.mrp}</Text>
          <View style={[styles.stockInputContainer, { flex: 1 }]}>
            <TextInput
              style={styles.stockInput}
              value={String(v.stock ?? 0)}
              onChangeText={(val) => handleStockChange(item.id, idx, val)}
              keyboardType="numeric"
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      ))}
    </View>

    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Grand Total Stock:</Text>
      <Text style={styles.totalValue}>{item.total_stock || 0}</Text>
    </View>
  </View>
));

const StockManagement = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>(gStockProducts);
  const [loading, setLoading] = useState(gStockProducts.length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Sync with global cache
  useEffect(() => { gStockProducts = products; }, [products]);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const resp = await fetchProducts(token);
      const items = Array.isArray(resp) ? resp : (resp as any).products || [];
      setProducts(items);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData(gStockProducts.length === 0);
  }, [loadData]);

  const handleStockChange = (productId: any, variantIndex: number, newValue: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const updatedVariants = [...p.variants];
        updatedVariants[variantIndex] = { ...updatedVariants[variantIndex], stock: newValue };
        // Recalculate total_stock
        const totalStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
        return { ...p, variants: updatedVariants, total_stock: totalStock };
      }
      return p;
    }));
  };

  const saveProductStock = async (product: any) => {
    setUpdatingId(product.id);
    try {
      const payload = {
        ...product,
        variants: product.variants,
        total_stock: product.total_stock,
      };
      await updateProduct(product.id, payload, token);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `${product.name} stock updated`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update stock',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <StockItem 
      item={item} 
      updatingId={updatingId} 
      handleStockChange={handleStockChange} 
      saveProductStock={saveProductStock} 
    />
  ), [updatingId, handleStockChange, saveProductStock]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      <View 
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stock Management</Text>
          <TouchableOpacity onPress={() => loadData(true)} style={styles.refreshBtn}>
            <Feather name="refresh-cw" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products to update stock..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Fetching Inventory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Feather name="box" size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>No products found matching your search</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5ff' },

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

  // 🔵 SEARCH
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a'
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 4
  },

  // 🔵 CARD
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15
  },

  productName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e3a8a'
  },

  tamilName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: -2
  },

  productCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase'
  },

  // 🔵 BUTTON
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12
  },

  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900'
  },

  // 🔵 VARIANTS
  variantsList: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 12
  },

  variantHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    marginBottom: 8
  },

  colLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase'
  },

  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff'
  },

  variantName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e3a8a'
  },

  variantPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e3a8a'
  },

  stockInputContainer: {
    alignItems: 'flex-end'
  },

  stockInput: {
    backgroundColor: '#ffffff',
    width: 60,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: '#2563eb'
  },

  // 🔵 TOTAL
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 15,
    gap: 10
  },

  totalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase'
  },

  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563eb'
  },

  // 🔵 STATES
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300
  },

  loadingText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1
  },

  // 🔵 IMAGE
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },

  emptyText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center'
  },
});

export default StockManagement;
