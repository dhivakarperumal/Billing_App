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
  StatusBar,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useAuth } from '../contexts/AuthContext';
import { fetchProducts, updateProduct } from '../api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const AddStock = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [addingValues, setAddingValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  // Auto-select when barcode is scanned
  useEffect(() => {
    const scannedBarcode = route.params?.barcode;
    if (scannedBarcode && products.length > 0) {
      const found = products.find(p =>
        String(p.product_code).toLowerCase() === String(scannedBarcode).toLowerCase() ||
        String(p.barcode).toLowerCase() === String(scannedBarcode).toLowerCase()
      );
      if (found) {
        handleSelectProduct(found);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Not Found',
          text2: 'Product with this barcode not found',
        });
        // Clear params to prevent persistent alert
        navigation.setParams({ barcode: undefined });
      }
    }
  }, [route.params?.barcode, products]);

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

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchTerm(''); // Clear search
    // Initialize adding values
    const init: Record<number, string> = {};
    product.variants?.forEach((_: any, i: number) => {
      init[i] = '';
    });
    setAddingValues(init);
  };

  const handleAddingChange = (idx: number, val: string) => {
    setAddingValues(prev => ({ ...prev, [idx]: val }));
  };

  const handleUpdate = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const updatedVariants = selectedProduct.variants.map((v: any, i: number) => {
        const added = Number(addingValues[i]) || 0;
        const old = Number(v.stock) || 0;
        return { ...v, stock: String(old + added) };
      });

      const totalStock = updatedVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);

      // Merge with existing product data to prevent losing other details
      const payload = {
        ...selectedProduct,
        variants: updatedVariants,
        total_stock: totalStock
      };

      await updateProduct(selectedProduct.id, payload, token);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Stock updated successfully!',
      });

      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Update failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Text style={styles.headerTitle}>Add New Stock</Text>
          <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.resetBtn}>
            <Feather name="rotate-ccw" size={20} color={selectedProduct ? "#ffffff" : "rgba(255,255,255,0.4)"} />
          </TouchableOpacity>
        </View>
      </View>

      {!selectedProduct ? (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Name or Barcode..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => navigation.navigate('ScannerScreen', { target: 'AddStock' })}
            >
              <Feather name="maximize" size={18} color="#2563eb" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 100 }} />
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.productItem} onPress={() => handleSelectProduct(item)}>
                  <View style={styles.itemIcon}>
                    <Feather name="box" size={20} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    <Text style={styles.itemSubtitle}>ID: {item.product_code || item.id}  · Total: {item.total_stock || 0}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      ) : (
        <ScrollView style={styles.selectedWrapper} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedName}>{selectedProduct.name}</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.selectedCode}>PRODUCT ID: {selectedProduct.product_code || selectedProduct.id}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Stock Update (Additive)</Text>

          {selectedProduct.variants?.map((v: any, i: number) => {
            const added = Number(addingValues[i]) || 0;
            const current = Number(v.stock) || 0;
            return (
              <View key={i} style={styles.variantCard}>
                <View style={styles.variantInfo}>
                  <Text style={styles.variantName}>{v.quantity} {v.unit}</Text>
                  <Text style={styles.currentStock}>Current: {current}</Text>
                </View>

                <View style={styles.mathContainer}>
                  <Text style={styles.mathText}>{current}</Text>
                  <Feather name="plus" size={14} color="#94a3b8" />
                  <TextInput
                    style={styles.addInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={addingValues[i]}
                    onChangeText={val => handleAddingChange(i, val)}
                    autoFocus={i === 0}
                  />
                  <Text style={styles.mathEquals}>=</Text>
                  <Text style={styles.newTotal}>{current + added}</Text>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.updateBtn, saving && { opacity: 0.7 }]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={styles.updateBtnText}>Confirm Additive Update</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
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

  resetBtn: {
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

  scanBtn: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10
  },

  // 🔵 LIST
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40
  },

  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff'
  },

  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e3a8a'
  },

  itemSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase'
  },

  // 🔵 SELECTED
  selectedWrapper: {
    flex: 1,
    padding: 20
  },

  selectedHeader: {
    marginBottom: 24,
    alignItems: 'center'
  },

  selectedName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e3a8a',
    textAlign: 'center'
  },

  codeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8
  },

  selectedCode: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 1
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
    textAlign: 'center'
  },

  // 🔵 VARIANT CARD
  variantCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff'
  },

  variantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },

  variantName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1e3a8a'
  },

  currentStock: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  },

  // 🔵 MATH BOX
  mathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 14,
    gap: 10
  },

  mathText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    width: 40,
    textAlign: 'center'
  },

  addInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: '#2563eb'
  },

  mathEquals: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8'
  },

  newTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e3a8a',
    width: 60,
    textAlign: 'center'
  },

  // 🔵 BUTTON
  updateBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 10
  },

  updateBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900'
  },
});

export default AddStock;
