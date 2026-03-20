import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import AddProduct from '../screens/AddProduct';
import AddCategory from '../screens/AddCategory';

import CreateBilling from '../screens/CreateBilling';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={BottomTabNavigator} />
      <Stack.Screen name="AddProduct" component={AddProduct} />
      <Stack.Screen name="AddCategory" component={AddCategory} />
      <Stack.Screen name="CreateBilling" component={CreateBilling} />
    </Stack.Navigator>
  );
}
