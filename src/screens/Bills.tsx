import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Button,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { createBill, fetchCustomers, fetchProducts, Product, Customer } from '../api';

type CartItem = {
  product: Product;
  quantity: number;
};

const Bills = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | number | null>(null);
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [customerData, productData] = await Promise.all([
        fetchCustomers(token),
        fetchProducts(token),
      ]);
      setCustomers(customerData);
      setProducts(productData);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(selectedCustomerId)),
    [customers, selectedCustomerId],
  );

  const total = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const updateQuantity = (product: Product, delta: number) => {
    setCart((current) => {
      const key = String(product.id);
      const existing = current[key];
      const nextQty = (existing?.quantity || 0) + delta;
      if (nextQty <= 0) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return {
        ...current,
        [key]: {
          product,
          quantity: nextQty,
        },
      };
    });
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Validation', 'Please select a customer for the bill.');
      return;
    }

    const items = Object.values(cart).map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    if (items.length === 0) {
      Alert.alert('Validation', 'Please add at least one product to the bill.');
      return;
    }

    setSubmitting(true);
    try {
      await createBill(
        {
          customer_id: selectedCustomerId,
          items,
        },
        token,
      );
      Alert.alert('Success', 'Bill created successfully');
      setCart({});
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading customers and products…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Bill</Text>
      <Text style={styles.description}>Select a customer, add products, then save the bill.</Text>

      <Text style={styles.sectionTitle}>1. Select Customer</Text>
      <View style={styles.scrollSection}>
        <FlatList
          horizontal
          data={customers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const selected = String(item.id) === String(selectedCustomerId);
            return (
              <TouchableOpacity
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => setSelectedCustomerId(item.id)}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.phone ? <Text style={styles.cardSubtitle}>{item.phone}</Text> : null}
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
          ListEmptyComponent={() => (
            <Text style={styles.empty}>No customers found. Add customers from the Customers tab.</Text>
          )}
        />
      </View>

      <Text style={styles.sectionTitle}>2. Add products</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const inCart = cart[String(item.id)]?.quantity ?? 0;
          return (
            <View style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
              </View>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => updateQuantity(item, -1)}
                >
                  <Text style={styles.qtyButtonText}>–</Text>
                </TouchableOpacity>
                <Text style={styles.qtyCount}>{inCart}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => updateQuantity(item, 1)}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>No products found. Add products from the Products tab.</Text>
        )}
      />

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>Selected customer:</Text>
        <Text style={styles.summaryValue}>{selectedCustomer?.name ?? 'None'}</Text>
        <Text style={styles.summaryText}>Total:</Text>
        <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
        <Button title="Create bill" onPress={handleSubmit} disabled={submitting} />
        {submitting && <ActivityIndicator style={styles.loadingIndicator} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    marginBottom: 16,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  scrollSection: {
    marginBottom: 12,
  },
  card: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f3f3f3',
    marginRight: 12,
    minWidth: 140,
  },
  cardSelected: {
    backgroundColor: '#4c8bf5',
  },
  cardTitle: {
    fontWeight: '600',
    color: '#000',
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#333',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
  },
  productPrice: {
    marginTop: 4,
    color: '#456',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  qtyCount: {
    marginHorizontal: 10,
    minWidth: 24,
    textAlign: 'center',
  },
  summaryContainer: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f4f4f4',
    marginTop: 12,
  },
  summaryText: {
    color: '#333',
    fontWeight: '600',
  },
  summaryValue: {
    marginBottom: 8,
    fontSize: 16,
  },
  loadingIndicator: {
    marginTop: 10,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default Bills;
