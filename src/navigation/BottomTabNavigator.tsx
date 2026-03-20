import React from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuth } from '../contexts/AuthContext';

import Home from '../screens/Home';
import Bills from '../screens/Bills';
import Customers from '../screens/Customers';
import Products from '../screens/Products';
import Settings from '../screens/Settings';

const Tab = createBottomTabNavigator();

const CreateBillPlaceholder = () => (
  <View style={{ flex: 1, backgroundColor: 'orange', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontWeight: 'bold' }}>NAVIGATION PLACEHOLDER</Text>
  </View>
);

const ACTIVE_COLOR = '#4c8bf5';
const INACTIVE_COLOR = '#9aa0b0';

function HeaderRight() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!user) return null;

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <View className="flex-row items-center mr-4">
      {/* 🔥 Profile Badge */}
      <View className="w-9 h-9 rounded-full bg-white justify-center items-center mr-3 shadow-md">
        <Text className="text-orange-500 font-bold text-base">{initial}</Text>
      </View>

      {/* 🔥 Logout Button (Premium Pill Style) */}
      <TouchableOpacity
        onPress={handleLogout}
        className="flex-row items-center bg-white/20 px-3 py-1.5 rounded-full"
        style={{
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
        }}
      >
        <Icon name="sign-out-alt" size={14} color="#fff" />
        <Text className="text-white text-xs ml-2 font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

/* 🔥 CUSTOM TAB BAR */
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [showQuickActions, setShowQuickActions] = React.useState(false);

  const QuickAction = ({ icon, label, onPress, color }: any) => (
    <TouchableOpacity
      onPress={() => {
        setShowQuickActions(false);
        onPress();
      }}
      className="items-center justify-center p-4 bg-white rounded-3xl mb-4 shadow-lg w-[45%]"
      style={{ elevation: 5 }}
    >
      <View className={`${color} w-12 h-12 rounded-2xl items-center justify-center mb-2`}>
        <Icon name={icon} size={20} color="white" />
      </View>
      <Text className="text-slate-800 font-black uppercase text-[10px] tracking-widest">{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Modal visible={showQuickActions} transparent animationType="fade">
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setShowQuickActions(false)} 
          className="flex-1 bg-slate-900/40 justify-center items-center p-6"
        >
          <View className="bg-gray-50/95 w-full rounded-[48px] p-8 border border-white shadow-2xl">
            <Text className="text-3xl font-black text-slate-900 tracking-tighter italic mb-8 text-center">
              quick.actions<Text className="text-rose-600">.</Text>
            </Text>
            
            <View className="flex-row flex-wrap justify-between">
              <QuickAction 
                icon="microphone" 
                label="Voice Bill" 
                color="bg-indigo-500" 
                onPress={() => Alert.alert("Coming Soon", "Voice intelligence module is being calibrated.")} 
              />
              <QuickAction 
                icon="qrcode" 
                label="Scan Item" 
                color="bg-emerald-500" 
                onPress={() => navigation.navigate('Tabs', { screen: 'CreateBill' })} 
              />
              <QuickAction 
                icon="file-invoice" 
                label="Manual Bill" 
                color="bg-orange-500" 
                onPress={() => {
                  const rootNav = navigation.getParent();
                  if (rootNav) rootNav.navigate('CreateBilling');
                  else navigation.navigate('CreateBilling');
                }} 
              />
              <QuickAction 
                icon="ellipsis-h" 
                label="More" 
                color="bg-slate-400" 
                onPress={() => Alert.alert("Extra", "Additional utilities arriving in next patch.")} 
              />
            </View>

            <TouchableOpacity 
              onPress={() => setShowQuickActions(false)}
              className="mt-6 py-5 bg-slate-900 rounded-[28px] items-center"
            >
              <Text className="text-white font-black uppercase text-[10px] tracking-widest">Close Menu</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View
        className="absolute left-4 right-4 bg-white rounded-3xl flex-row justify-between items-center px-6 py-3"
        style={{
          bottom: insets.bottom + 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 10,
        }}
      >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          if (route.name === 'CreateBill') {
            const rootNav = navigation.getParent();
            if (rootNav) {
              rootNav.navigate('CreateBilling');
            } else {
              navigation.navigate('CreateBilling');
            }
          } else if (!isFocused) {
            navigation.navigate(route.name);
          }
        };

        const iconMap: any = {
          Home: 'home',
          Bills: 'file-invoice',
          CreateBill: 'plus',
          Products: 'box',
          Settings: 'cog',
        };

        /* 🔥 CENTER FLOATING BUTTON */
        if (route.name === 'CreateBill') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => setShowQuickActions(true)}
              className="bg-orange-500 w-14 h-14 rounded-full justify-center items-center -mt-8"
              style={{
                elevation: 8,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 6,
              }}
            >
              <Icon name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center"
          >
            <Icon
              name={iconMap[route.name]}
              size={18}
              color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
              solid
            />
            <Text
              className={`text-[10px] mt-1 ${
                isFocused ? 'text-blue-500' : 'text-gray-400'
              }`}
            >
              {route.name === 'CreateBill' ? 'Bill' : route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </>
  );
}

export default function BottomTabNavigator() {
  return (
    <View className="flex-1">
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#f97316', 
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 6,
          },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerRight: () => <HeaderRight />,
        }}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Bills" component={Bills} />
        <Tab.Screen 
          name="CreateBill" 
          component={CreateBillPlaceholder} 
          options={{ title: 'Create Bill' }} 
        />
        <Tab.Screen name="Products" component={Products} />
        <Tab.Screen name="Settings" component={Settings} />
      </Tab.Navigator>
    </View>
  );
}
