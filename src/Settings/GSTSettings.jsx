import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

const GSTSettings = () => {
  const [gst, setGst] = useState('');
  const [gstType, setGstType] = useState('exclude');

  return (
    <ScrollView
      className="flex-1 bg-[#f8fafc]"
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >

      {/* 🔥 HEADER */}
      <View className="px-5 pt-6 mb-6">
        <Text className="text-2xl font-black text-slate-900">
          GST Settings
        </Text>
        <Text className="text-xs text-gray-400 font-bold tracking-widest">
          CONFIGURE GST FOR BILLING
        </Text>
      </View>

      {/* 🔥 MAIN CARD */}
      <View className="mx-4 bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">

        {/* GST INPUT */}
        <View className="mb-6">
          <Text className="text-[10px] font-black text-gray-400 tracking-[2px] mb-2">
            GST PERCENTAGE (%)
          </Text>

          <TextInput
            value={gst}
            onChangeText={setGst}
            placeholder="Enter GST (e.g. 5, 12, 18)"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            className="bg-gray-50 px-5 py-4 rounded-2xl text-black font-semibold border border-gray-100"
          />
        </View>

        {/* GST MODE */}
        <View className="mb-6">
          <Text className="text-[10px] font-black text-gray-400 tracking-[2px] mb-3">
            GST MODE
          </Text>

          <View className="flex-row gap-3">

            {/* INCLUDE */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGstType('include')}
              className={`flex-1 py-4 rounded-2xl border ${
                gstType === 'include'
                  ? 'bg-orange-500 border-orange-500 shadow-md'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text
                className={`text-center text-xs font-black tracking-widest ${
                  gstType === 'include'
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                INCLUDE GST
              </Text>
            </TouchableOpacity>

            {/* EXCLUDE */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGstType('exclude')}
              className={`flex-1 py-4 rounded-2xl border ${
                gstType === 'exclude'
                  ? 'bg-orange-500 border-orange-500 shadow-md'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Text
                className={`text-center text-xs font-black tracking-widest ${
                  gstType === 'exclude'
                    ? 'text-white'
                    : 'text-gray-500'
                }`}
              >
                EXCLUDE GST
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* INFO BOX (UX IMPROVEMENT) */}
        <View className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6">
          <Text className="text-xs text-orange-600 font-bold">
            {gstType === 'include'
              ? 'Prices will include GST'
              : 'GST will be added separately'}
          </Text>
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          activeOpacity={0.85}
          className="bg-slate-900 py-4 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.2)]"
        >
          <Text className="text-white text-center font-black text-xs tracking-[2px]">
            SAVE GST SETTINGS
          </Text>
        </TouchableOpacity>

      </View>

    </ScrollView>
  );
};

export default GSTSettings;