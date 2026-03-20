import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  return (
    <View className="flex-1 justify-center items-center p-5 bg-white">
      
      <Text className="text-2xl font-bold mb-5 text-center">
        Welcome{user?.name ? `, ${user.name}` : ''}!
      </Text>

      <Text className="text-base text-gray-500 text-center mb-6">
        Use the tabs to manage customers, products, and bills.
      </Text>

      <View className="w-full gap-3 mb-6">
        <Button title="Create New Bill" onPress={() => navigation.navigate('Bills' as never)} />
        <Button title="Customers" onPress={() => navigation.navigate('Customers' as never)} />
        <Button title="Products" onPress={() => navigation.navigate('Products' as never)} />
      </View>

      <Text className="text-sm text-gray-400 text-center">
        Tip: Add customers and products first, then build your bill from the Bills tab.
      </Text>

    </View>
  );
};

export default Home;