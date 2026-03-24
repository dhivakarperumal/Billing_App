import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useAuth } from '../contexts/AuthContext';
import { fetchProducts, updateProduct, Product } from '../api';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const StockManagement = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetchProducts(token);
      const items = Array.isArray(resp) ? resp : (resp as any).products || [];
      setProducts(items);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
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
      Alert.alert('Success', `${product.name} stock updated!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update stock');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCode}>ID: {item.product_code || item.id}</Text>
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
                value={String(v.stock || 0)}
                onChangeText={(val) => handleStockChange(item.id, idx, val)}
                keyboardType="numeric"
                selectTextOnFocus
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Management</Text>
        <TouchableOpacity onPress={loadData}>
          <Feather name="refresh-cw" size={20} color="#64748b" />
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  productHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  productName: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  productCode: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 2, textTransform: 'uppercase' },
  saveBtn: { backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  variantsList: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 12 },
  variantHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 8 },
  colLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  variantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  variantName: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  variantPrice: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  stockInputContainer: { alignItems: 'flex-end' },
  stockInput: { 
    backgroundColor: '#fff', 
    width: 60, 
    height: 36, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    textAlign: 'center', 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#f97316' 
  },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15, gap: 10 },
  totalLabel: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 300 },
  loadingText: { marginTop: 12, fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 14, fontWeight: '700', color: '#94a3b8', textAlign: 'center' },
});

export default StockManagement;
