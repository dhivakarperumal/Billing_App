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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useAuth } from "../contexts/AuthContext";
import Toast from "react-native-toast-message";

const Register = ({ onSwitchToLogin }) => {
  const { signUp, loading } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value });
  };

  const handleRegister = async () => {
    const name = form.username.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const password = form.password.trim();

    if (!name || !email || !password || !phone) {
      Alert.alert("Error", "All fields required");
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    await signUp(name, email, password, phone);

    Toast.show({
      type: "success",
      text1: "Registration Successful",
    });

    onSwitchToLogin();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* IMAGE HEADER */}
      <ImageBackground
        source={require("../assets/billing-bg.jpg")}
        className="h-[30%] justify-center items-center px-6"
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-blue-900/70" />

        <View className="w-20 h-20 bg-blue-500 rounded-full justify-center items-center mb-4">
          <Icon name="user-plus" size={26} color="#fff" />
        </View>

        <Text className="text-blue-200 text-base mb-2 text-center">
          Q-Techx Billing
        </Text>

        {/* <Text className="text-white text-3xl font-extrabold text-center">
          Create Your{"\n"}Account
        </Text> */}

        <Text className="text-blue-100 text-base text-center mt-3 px-4">
          Start managing your business with ease.
        </Text>
      </ImageBackground>

      {/* FORM */}
<ScrollView className="flex-1 bg-white rounded-t-[30px] px-6 pt-6">

  <Text className="text-gray-400 text-center mb-6">
    Register to continue
  </Text>

  {/* Username */}
  <Text className="text-gray-500 mb-1">Username</Text>
  <TextInput
    className="border-b border-blue-200 pb-2 mb-5 text-black"
    placeholder="Enter username"
    value={form.username}
    onChangeText={(val) => handleChange("username", val)}
  />

  {/* Email */}
  <Text className="text-gray-500 mb-1">Email Address</Text>
  <TextInput
    className="border-b border-blue-200 pb-2 mb-5 text-black"
    placeholder="Enter email"
    value={form.email}
    onChangeText={(val) => handleChange("email", val)}
  />

  {/* Phone */}
  <Text className="text-gray-500 mb-1">Phone Number</Text>
  <TextInput
    className="border-b border-blue-200 pb-2 mb-5 text-black"
    placeholder="Enter phone number"
    keyboardType="phone-pad"
    value={form.phone}
    onChangeText={(val) => handleChange("phone", val)}
  />

  {/* Password */}
  <Text className="text-gray-500 mb-1">Password</Text>
  <View className="border-b border-blue-200 flex-row items-center mb-5">
    <TextInput
      className="flex-1 pb-2 text-black"
      placeholder="Password"
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
  <View className="border-b border-blue-200 flex-row items-center mb-5">
    <TextInput
      className="flex-1 pb-2 text-black"
      placeholder="Confirm password"
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

  {/* Button (same as login) */}
  <TouchableOpacity
    className={`bg-blue-600 py-4 rounded-xl items-center mt-6 ${
      loading ? "opacity-70" : ""
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

  {/* Footer */}
  <Text className="text-center text-gray-400 mt-6 mb-6">
    Already have an account?{" "}
    <Text
      className="text-blue-600 font-semibold"
      onPress={onSwitchToLogin}
    >
      LOGIN
    </Text>
  </Text>

</ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;