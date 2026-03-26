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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { createCustomer, fetchCustomers, Customer } from '../api';
import Toast from 'react-native-toast-message';

const Customers = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const loadCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchCustomers(token);
      setCustomers(data);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Failed to load customers'
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation',
        text2: 'Customer name is required.'
      });
      return;
    }

    setCreating(true);
    try {
      const newCustomer = await createCustomer(
        {
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
        token,
      );
      setCustomers((curr) => [newCustomer, ...curr]);
      setName('');
      setEmail('');
      setPhone('');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Failed to create customer',
      });
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: Customer }) => {
    return (
      <View style={styles.item}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.phone ? <Text style={styles.itemSub}>{item.phone}</Text> : null}
        {item.email ? <Text style={styles.itemSub}>{item.email}</Text> : null}
      </View>
    );
  };

  const keyExtractor = useMemo(() => (item: Customer) => String(item.id), []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Customers</Text>
      <Text style={styles.description}>Create and view customers linked to your bills.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Email (optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Button title="Add customer" onPress={handleCreate} disabled={creating} />
        {creating && <ActivityIndicator style={styles.loading} />}
      </View>

      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={customers}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={() => (
              <Text style={styles.empty}>No customers yet. Add one above.</Text>
            )}
          />
        )}
      </View>
    </SafeAreaView>
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

export default Customers;
