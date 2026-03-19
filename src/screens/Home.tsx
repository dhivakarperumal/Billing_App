import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome{user?.name ? `, ${user.name}` : ''}!</Text>
      <Text style={styles.subtitle}>Use the tabs to manage customers, products, and bills.</Text>

      <View style={styles.buttons}>
        <Button title="Create New Bill" onPress={() => navigation.navigate('Bills' as never)} />
        <Button title="Customers" onPress={() => navigation.navigate('Customers' as never)} />
        <Button title="Products" onPress={() => navigation.navigate('Products' as never)} />
      </View>

      <Text style={styles.tip}>
        Tip: Add customers and products first, then build your bill from the Bills tab.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default Home;