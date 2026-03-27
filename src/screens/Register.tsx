import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ImageBackground,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useAuth } from "../contexts/AuthContext";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Register = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
  const { signUp, loading } = useAuth();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleRegister = async () => {
    const name = form.username.trim();
    const email = form.email.trim();
    const password = form.password.trim();

    if (!name || !email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'All fields required',
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    await signUp(name, email, password);
    setTimeout(() => {
      onSwitchToLogin();
    }, 1000);
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

      {/* HEADER SAME AS LOGIN */}
      <ImageBackground
        source={require("../assets/billing-bg.jpg")}
        style={{ paddingTop: insets.top + 20 }}
        className="h-[40%] justify-center items-center px-6"
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-blue-900/70" />

        <View className="w-20 h-20 bg-blue-500 rounded-full justify-center items-center mb-4">
          <Icon name="user-plus" size={26} color="#fff" />
        </View>

        <Text className="text-blue-200 text-base mb-2 text-center">
          Q-Techx Billing
        </Text>

        <Text className="text-white text-4xl font-extrabold text-center leading-tight">
          Create Your{"\n"}Account
        </Text>

        <Text className="text-blue-100 text-base text-center mt-3 px-4">
          Start managing your business smarter today.
        </Text>
      </ImageBackground>

      {/* FORM */}
      <View className="flex-1 bg-white rounded-t-[30px] px-6 pt-6 pb-10">

        <Text className="text-gray-400 text-center mb-6">
          Sign up to continue
        </Text>

        {/* Username */}
        <Text className="text-gray-500 mb-1">Username</Text>
        <TextInput
          className="border-b border-blue-200 pb-2 mb-5 text-black"
          value={form.username}
          onChangeText={(val) => handleChange("username", val)}
        />

        {/* Email */}
        <Text className="text-gray-500 mb-1">Email</Text>
        <TextInput
          className="border-b border-blue-200 pb-2 mb-5 text-black"
          value={form.email}
          onChangeText={(val) => handleChange("email", val)}
        />

        {/* Password */}
        <Text className="text-gray-500 mb-1">Password</Text>
        <View className="border-b border-blue-200 flex-row items-center mb-5">
          <TextInput
            className="flex-1 pb-2 text-black"
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(val) => handleChange("password", val)}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon
              name={showPassword ? "eye-slash" : "eye"}
              size={16}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <Text className="text-gray-500 mb-1">Confirm Password</Text>
        <View className="border-b border-blue-200 flex-row items-center">
          <TextInput
            className="flex-1 pb-2 text-black"
            secureTextEntry={!showConfirmPassword}
            value={form.confirmPassword}
            onChangeText={(val) =>
              handleChange("confirmPassword", val)
            }
          />
          <TouchableOpacity
            onPress={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
          >
            <Icon
              name={showConfirmPassword ? "eye-slash" : "eye"}
              size={16}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          className={`bg-blue-600 py-4 rounded-xl items-center mt-8 ${loading ? "opacity-70" : ""
            }`}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">
              REGISTER
            </Text>
          )}
        </TouchableOpacity>

        {/* FOOTER */}
        <Text className="text-center text-gray-400 mt-6">
          Already have an account?{" "}
          <Text
            className="text-blue-600 font-semibold"
            onPress={onSwitchToLogin}
          >
            LOGIN
          </Text>
        </Text>

      </View>
    </KeyboardAwareScrollView>
  );
};

export default Register;