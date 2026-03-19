import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { createProduct, fetchProducts, Product } from '../api';

const Products = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchProducts(token);
      setProducts(data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCreate = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Validation', 'Product name and price are required.');
      return;
    }

    const parsedPrice = Number(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Validation', 'Price must be a valid number.');
      return;
    }

    setCreating(true);
    try {
      const newProduct = await createProduct(
        {
          name: name.trim(),
          price: parsedPrice,
        },
        token,
      );
      setProducts((curr) => [newProduct, ...curr]);
      setName('');
      setPrice('');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: Product }) => {
    return (
      <View style={styles.item}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSub}>₹{item.price?.toFixed(2)}</Text>
      </View>
    );
  };

  const keyExtractor = useMemo(() => (item: Product) => String(item.id), []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      <Text style={styles.description}>Add or browse products that can be added to bills.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Product name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Price"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        <Button title="Add product" onPress={handleCreate} disabled={creating} />
        {creating && <ActivityIndicator style={styles.loading} />}
      </View>

      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={products}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={() => (
              <Text style={styles.empty}>No products yet. Add one above.</Text>
            )}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  form: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  listContainer: {
    flex: 1,
  },
  item: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSub: {
    color: '#555',
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
  },
  loading: {
    marginTop: 12,
  },
});

export default Products;
