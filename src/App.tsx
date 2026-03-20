

import React, { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './screens/Login';
import Register from './screens/Register';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import Toast from 'react-native-toast-message';
import RootNavigator from './navigation/RootNavigator';

import "../global.css"

const AuthStack = createNativeStackNavigator();

function AppContent() {
  const { token } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

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

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <NavigationContainer>
          <AppContent />
          <Toast />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
