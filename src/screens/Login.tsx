import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  onSwitchToRegister: () => void;
};

const Login = ({ onSwitchToRegister }: Props) => {
  const { signIn, loading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter your username/email and password.');
      return;
    }
    await signIn(identifier.trim(), password.trim());
  };

  return (
    <View className="flex-1 justify-center p-5 bg-gray-900">

      <View className="bg-white rounded-2xl p-6 shadow-lg">

        {/* Title */}
        <Text className="text-3xl font-bold text-blue-500 text-center mb-2">
          Welcome Back
        </Text>

        <Text className="text-gray-500 text-center mb-6">
          Sign in to explore our premium collection
        </Text>

        {/* Form */}
        <View className="gap-2">

          {/* Email */}
          <Text className="text-gray-700 font-medium mt-2">
            Email or Username
          </Text>

          <TextInput
            className="border border-gray-200 rounded-lg p-4 text-base text-black bg-white"
            placeholder="Email or Username"
            placeholderTextColor="#9ca3af"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />

          {/* Password */}
          <Text className="text-gray-700 font-medium mt-3">
            Password
          </Text>

          <View className="flex-row items-center border border-gray-200 rounded-lg bg-white">
            <TextInput
              className="flex-1 p-4 text-base text-black"
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              className="p-4"
              onPress={() => setShowPassword(!showPassword)}
            >
              <Icon
                name={showPassword ? 'eye-slash' : 'eye'}
                size={18}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className={`bg-blue-500 p-4 rounded-lg items-center mt-5 ${
              loading ? 'opacity-70' : ''
            }`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Login
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-[1px] bg-gray-200" />
            <Text className="mx-3 text-gray-400 font-medium">OR</Text>
            <View className="flex-1 h-[1px] bg-gray-200" />
          </View>

          {/* Footer */}
          <Text className="text-center text-gray-500 mt-4">
            Don't have an account?{' '}
            <Text
              className="text-blue-500 font-semibold"
              onPress={onSwitchToRegister}
            >
              Sign Up
            </Text>
          </Text>

        </View>
      </View>
    </View>
  );
};

export default Login;