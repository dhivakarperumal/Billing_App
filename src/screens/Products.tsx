import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  StyleSheet,
  Platform
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      <LinearGradient colors={HEADER_GRADIENT} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Inventory<Text style={{ color: '#f97316' }}>.</Text></Text>
            <Text style={styles.headerSubtitle}>GLOBAL ASSET CONTROL</Text>
          </View>
          <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
             <Feather name="refresh-cw" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="#64748b" />
          <TextInput
            placeholder="Search assets or product codes..."
            placeholderTextColor="#64748b"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#f97316" size="large" />
          <Text style={styles.loadingText}>SYNCING VAULT...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('AddProduct', { id: item.id })}
              style={styles.card}
              activeOpacity={0.8}
            >
                <View style={styles.cardMain}>
                  <View style={styles.imageBox}>
                    {item.image || item.images?.[0] ? (
                      <Image source={{ uri: item.image || item.images?.[0] }} style={styles.productImg} resizeMode="cover" />
                    ) : (
                      <Feather name="box" size={24} color="#f97316" />
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.badgeRow}>
                      <Text style={styles.idBadge}>ID-{item.id}</Text>
                      {item.category && <Text style={styles.categoryBadge}>{item.category}</Text>}
                    </View>
                  </View>
                </View>
                <View style={styles.rightInfo}>
                  <Text style={styles.priceText}>₹{(item.price || 0).toLocaleString()}</Text>
                  <View style={styles.stockBadge}>
                    <Text style={styles.stockLabel}>{item.total_stock || 0} UNIT</Text>
                  </View>
                </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Feather name="package" size={40} color="#e5e7eb" />
              <Text style={styles.emptyText}>NO ASSETS FOUND IN VAULT</Text>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <View style={styles.fabContainer}>
        {isFABExpanded && (
          <View style={styles.fabActions}>
            <TouchableOpacity 
              onPress={() => { navigation.navigate('AddCategory'); setIsFABExpanded(false); }}
              style={styles.fabActionBtn}
            >
              <Text style={styles.fabActionLabel}>New Category</Text>
              <View style={styles.fabActionIcon}><Feather name="tag" size={14} color="#fff" /></View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => { navigation.navigate('AddProduct'); setIsFABExpanded(false); }}
              style={styles.fabActionBtn}
            >
              <Text style={styles.fabActionLabel}>List Product</Text>
              <View style={styles.fabActionIcon}><Feather name="box" size={14} color="#fff" /></View>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity 
          onPress={() => setIsFABExpanded(!isFABExpanded)}
          style={[styles.mainFab, isFABExpanded && styles.fabClose]}
          activeOpacity={0.9}
        >
          <Feather name={isFABExpanded ? 'x' : 'plus'} size={28} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 35, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 9, color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },
  refreshBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 15, height: 48 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 13, fontWeight: '700', color: '#0f172a' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
  listContent: { padding: 20, paddingBottom: 120 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', elevation: 2 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  imageBox: { width: 64, height: 64, backgroundColor: '#f8fafc', borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImg: { width: '100%', height: '100%' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  idBadge: { fontSize: 8, fontWeight: '900', color: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  categoryBadge: { fontSize: 8, fontWeight: '900', color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rightInfo: { alignItems: 'flex-end', justifyContent: 'center' },
  priceText: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  stockBadge: { marginTop: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stockLabel: { fontSize: 8, fontWeight: '900', color: '#22c55e' },
  fabContainer: { position: 'absolute', bottom: 30, right: 24, alignItems: 'flex-end' },
  mainFab: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  fabClose: { backgroundColor: '#E11D48' },
  fabActions: { marginBottom: 15, gap: 10 },
  fabActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, elevation: 4, shadowOpacity: 0.1, shadowRadius: 5 },
  fabActionLabel: { fontSize: 9, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, marginRight: 10 },
  fabActionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', paddingVertical: 80 },
  emptyText: { marginTop: 15, fontSize: 9, fontWeight: '900', color: '#e2e8f0', letterSpacing: 1.5 }
});

export default Products;
