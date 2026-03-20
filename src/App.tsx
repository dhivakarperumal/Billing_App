

import React, { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './screens/Login';
import Register from './screens/Register';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import RootNavigator from './navigation/RootNavigator';

import "../global.css"

function AppContent() {
  const { token } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // If user is not logged in, show Login/Register
  if (!token) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  // User is logged in, show the main navigator
  return <RootNavigator />;
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
