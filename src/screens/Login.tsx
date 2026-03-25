import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useAuth } from "../contexts/AuthContext";
import { ImageBackground } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const Login = ({ onSwitchToRegister }) => {
  const { signIn, loading } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Error", "Enter credentials");
      return;
    }
    await signIn(identifier, password);
  };

return (
  <KeyboardAwareScrollView
    className="flex-1 bg-white"
    contentContainerStyle={{ flexGrow: 1 }}
    enableOnAndroid={true}
    extraScrollHeight={120}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    <StatusBar barStyle="light-content" />

    {/* IMAGE HEADER */}
    <ImageBackground
      source={require("../assets/billing-bg.jpg")}
      className="h-[50%] justify-center items-center px-6"
      resizeMode="cover"
    >
      <View className="absolute inset-0 bg-blue-900/70" />

      <View className="w-20 h-20 bg-blue-500 rounded-full justify-center items-center mb-4">
        <Icon name="wallet" size={26} color="#fff" />
      </View>

      <Text className="text-blue-200 text-base mb-2 text-center">
        Q-Techx Billing
      </Text>

      <Text className="text-white text-4xl font-extrabold text-center leading-tight">
        Manage Your{"\n"}Business Smartly
      </Text>

      <Text className="text-blue-100 text-base text-center mt-3 px-4">
        Track invoices, payments and grow your business effortlessly.
      </Text>
    </ImageBackground>

    {/* FORM */}
    <View className="flex-1 bg-white rounded-t-[30px] px-6 pt-6 pb-10">

      <Text className="text-gray-400 text-center mb-6">
        Sign in to continue
      </Text>

      {/* Email */}
      <Text className="text-gray-500 mb-1">Email Address</Text>
      <TextInput
        className="border-b border-blue-200 pb-2 mb-5 text-black"
        value={identifier}
        onChangeText={setIdentifier}
      />

      {/* Password */}
      <Text className="text-gray-500 mb-1">Password</Text>
      <View className="border-b border-blue-200 flex-row items-center">
        <TextInput
          className="flex-1 pb-2 text-black"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Icon
            name={showPassword ? "eye-slash" : "eye"}
            size={16}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-gray-400 text-sm">
          Remember me
        </Text>

        <Text className="text-blue-600 text-sm">
          Forgot Password?
        </Text>
      </View>

      {/* Button */}
      <TouchableOpacity
        className={`bg-blue-600 py-4 rounded-xl items-center mt-8 ${
          loading ? "opacity-70" : ""
        }`}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-base">
            LOGIN
          </Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
      <Text className="text-center text-gray-400 mt-6">
        Don’t have an account?{" "}
        <Text
          className="text-blue-600 font-semibold"
          onPress={onSwitchToRegister}
        >
          SIGN UP
        </Text>
      </Text>

    </View>
  </KeyboardAwareScrollView>
);
};

export default Login;