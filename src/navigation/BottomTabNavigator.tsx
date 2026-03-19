import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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

const ACTIVE_COLOR = '#4c8bf5';
const INACTIVE_COLOR = '#9aa0b0';
const BAR_BG = '#ffffff';

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
    <View style={styles.headerRightContainer}>
      <View style={styles.profileBadge}>
        <Text style={styles.profileInitial}>{initial}</Text>
      </View>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Icon name="sign-out-alt" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function BottomTabNavigator() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: ACTIVE_COLOR },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          headerRight: () => <HeaderRight />,
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: {
            backgroundColor: BAR_BG,
            borderTopWidth: 1,
            borderTopColor: '#e8eaf0',
            paddingBottom: safeAreaInsets.bottom,
            height: 60 + safeAreaInsets.bottom,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 4,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={Home}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" size={size} color={color} solid />
            ),
          }}
        />
        <Tab.Screen
          name="Bills"
          component={Bills}
          options={{
            title: 'Bills',
            tabBarIcon: ({ color, size }) => (
              <Icon name="file-invoice" size={size} color={color} solid />
            ),
          }}
        />
        <Tab.Screen
          name="Customers"
          component={Customers}
          options={{
            title: 'Customers',
            tabBarIcon: ({ color, size }) => (
              <Icon name="users" size={size} color={color} solid />
            ),
          }}
        />
        <Tab.Screen
          name="Products"
          component={Products}
          options={{
            title: 'Products',
            tabBarIcon: ({ color, size }) => (
              <Icon name="box" size={size} color={color} solid />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={Settings}
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Icon name="cog" size={size} color={color} solid />
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  profileBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitial: {
    color: ACTIVE_COLOR,
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    padding: 6,
  },
});
