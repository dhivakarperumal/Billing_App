import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import AddProduct from '../screens/AddProduct';
import AddCategory from '../screens/AddCategory';

import CreateBilling from '../screens/CreateBilling';
import ScannerScreen from '../screens/ScannerScreen';
import PrinterSettings from '../screens/PrinterSettings';
import DiagnosticsScreen from '../screens/Diagnostics';
import ReceiptSetup from '../screens/ReceiptSetup';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={BottomTabNavigator} />
      <Stack.Screen name="AddProduct" component={AddProduct} />
      <Stack.Screen name="AddCategory" component={AddCategory} />
      <Stack.Screen name="CreateBilling" component={CreateBilling} />
      <Stack.Screen name="ScannerScreen" component={ScannerScreen} />
      <Stack.Screen name="PrinterSettings" component={PrinterSettings} />
      <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
      <Stack.Screen name="ReceiptSetup" component={ReceiptSetup} />
    </Stack.Navigator>
  );
}
