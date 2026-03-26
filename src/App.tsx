

import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme, Platform, NativeModules, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './screens/Login';
import Register from './screens/Register';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import RootNavigator from './navigation/RootNavigator';
import Toast from 'react-native-toast-message';

import "../global.css"

const AuthStack = createNativeStackNavigator();

function AppContent() {
  const { token, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const { StatusBarManager } = NativeModules;

      // Force light background feeling
      StatusBar.setBarStyle('dark-content'); // black icons
      StatusBar.setBackgroundColor('#ffffff'); // white bg
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        showRegister ? (
          <AuthStack.Screen name="Register">
            {props => <Register {...props} onSwitchToLogin={() => setShowRegister(false)} />}
          </AuthStack.Screen>
        ) : (
          <AuthStack.Screen name="Login">
            {props => <Login {...props} onSwitchToRegister={() => setShowRegister(true)} />}
          </AuthStack.Screen>
        )
      ) : (
        <AuthStack.Screen name="Root" component={RootNavigator} />
      )}
    </AuthStack.Navigator>
  );
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';


  const toastConfig = {
    success: ({ text1, text2 }) => (
      <View
        style={{
          width: '90%',
          backgroundColor: '#ffffff', // 🤍 WHITE BG
          padding: 14,
          borderRadius: 12,
          alignSelf: 'center',
          marginTop: 10,
          borderWidth: 1,
          borderColor: '#22c55e', // 🟢 green border
        }}
      >
        <Text style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 16 }}>
          {text1}
        </Text>

        {text2 ? (
          <Text style={{ color: '#15803d', marginTop: 4 }}>
            {text2}
          </Text>
        ) : null}
      </View>
    ),

    error: ({ text1, text2 }) => (
      <View
        style={{
          width: '90%',
          backgroundColor: '#ffffff', // 🤍 WHITE BG
          padding: 14,
          borderRadius: 12,
          alignSelf: 'center',
          marginTop: 10,
          borderWidth: 1,
          borderColor: '#2563eb', // 🔵 blue border (nice look)
        }}
      >
        <Text style={{ color: '#2563eb', fontWeight: 'bold', fontSize: 16 }}>
          {text1}
        </Text>

        {text2 ? (
          <Text style={{ color: '#1e3a8a', marginTop: 4 }}>
            {text2}
          </Text>
        ) : null}
      </View>
    ),
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AuthProvider>
        <NavigationContainer>
          <AppContent />
          <Toast config={toastConfig} />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
