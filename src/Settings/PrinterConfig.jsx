import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import BackButton from '../screens/BackButton';

const PrinterConfig = () => {
  const [printer, setPrinter] = useState({
    name: 'Thermal Printer',
    type: 'thermal',
    paperSize: '80mm',
    autoPrint: true,
  });

  const handleChange = (key, value) => {
    setPrinter({ ...printer, [key]: value });
  };

  const handleSave = () => {
    console.log('Saved:', printer);
    alert('Printer settings saved successfully!');
  };

  return (
    <ScrollView className="flex-1 bg-[#f8fafc]">

      {/* 🔥 HEADER */}
      <BackButton title="Printer Configuration" />

      {/* 🔥 MAIN CARD */}
      <View className="mx-4 mt-6 bg-white rounded-[32px] p-6 
        shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-gray-100">

        {/* ICON HEADER */}
        <View className="flex-row items-center mb-8">
          <View className="w-16 h-16 bg-orange-100 rounded-[20px] items-center justify-center mr-4
            shadow-inner">
            <Icon name="printer" size={26} color="#f97316" />
          </View>

          <View>
            <Text className="text-lg font-black text-slate-900">
              Printer Setup
            </Text>
            <Text className="text-[10px] text-gray-400 font-bold tracking-[2px]">
              CONFIGURE YOUR DEVICE
            </Text>
          </View>
        </View>

        {/* 🔹 FORM */}

        {/* Printer Name */}
        <View className="mb-5">
          <Text className="text-[10px] font-black text-gray-400 mb-2 tracking-[2px]">
            PRINTER NAME
          </Text>
          <TextInput
            value={printer.name}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="Enter printer name"
            placeholderTextColor="#9ca3af"
            className="bg-[#f9fafb] border border-gray-100 rounded-2xl px-5 py-4 
            font-semibold text-slate-900 shadow-sm"
          />
        </View>

        {/* Printer Type */}
        <View className="mb-5">
          <Text className="text-[10px] font-black text-gray-400 mb-2 tracking-[2px]">
            PRINTER TYPE
          </Text>
          <View className="flex-row gap-3">
            {['thermal', 'inkjet', 'laser'].map((type) => {
              const active = printer.type === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleChange('type', type)}
                  activeOpacity={0.8}
                  className={`flex-1 py-4 rounded-2xl border ${
                    active
                      ? 'bg-orange-500 border-orange-500 shadow-md'
                      : 'bg-[#f9fafb] border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-center font-black text-xs tracking-wide ${
                      active ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {type.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Paper Size */}
        <View className="mb-5">
          <Text className="text-[10px] font-black text-gray-400 mb-2 tracking-[2px]">
            PAPER SIZE
          </Text>
          <View className="flex-row gap-3">
            {['80mm', '58mm'].map((size) => {
              const active = printer.paperSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  onPress={() => handleChange('paperSize', size)}
                  activeOpacity={0.8}
                  className={`flex-1 py-4 rounded-2xl border ${
                    active
                      ? 'bg-orange-500 border-orange-500 shadow-md'
                      : 'bg-[#f9fafb] border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-center font-black text-xs tracking-wide ${
                      active ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Auto Print */}
        <View className="flex-row items-center justify-between bg-[#f9fafb] 
          border border-gray-100 rounded-2xl px-5 py-5 mb-7">
          <Text className="text-[11px] font-black text-gray-400 tracking-[2px]">
            AUTO PRINT
          </Text>
          <Switch
            value={printer.autoPrint}
            onValueChange={(value) => handleChange('autoPrint', value)}
            trackColor={{ false: '#e5e7eb', true: '#fb923c' }}
            thumbColor="#fff"
          />
        </View>

        {/* 🔥 BUTTONS */}
        <View className="flex-row gap-4">

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.85}
            className="flex-1 bg-orange-500 py-4 rounded-2xl flex-row items-center justify-center
            shadow-[0_10px_25px_rgba(249,115,22,0.35)]"
          >
            <Icon name="save" size={18} color="#fff" />
            <Text className="text-white font-black ml-2 text-xs tracking-[2px]">
              SAVE SETTINGS
            </Text>
          </TouchableOpacity>

          {/* Test */}
          <TouchableOpacity
            activeOpacity={0.85}
            className="flex-1 bg-white border border-gray-200 py-4 rounded-2xl flex-row items-center justify-center"
          >
            <Icon name="check-circle" size={18} color="#6b7280" />
            <Text className="text-gray-500 font-black ml-2 text-xs tracking-[2px]">
              TEST PRINT
            </Text>
          </TouchableOpacity>

        </View>
      </View>

    </ScrollView>
  );
};

export default PrinterConfig;