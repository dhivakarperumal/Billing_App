import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';

const settingsOptions = [
  {
    title: 'Printer Configuration',
    subtitle: 'SETUP AND MANAGE BILLING PRINTER',
    icon: 'printer',
    screen: 'PrinterConfig',
  },
  {
    title: 'Printer Settings',
    subtitle: 'CUSTOMIZE INVOICE PRINT LAYOUT & BEHAVIOR',
    icon: 'settings',
    screen: 'PrinterSettings',
  },
  {
    title: 'GST Settings',
    subtitle: 'CONFIGURE GST FOR BILLING',
    icon: 'database',
    screen: 'GSTSettings',
  },
];

const Settings = () => {
  const navigation = useNavigation();

  return (
    <ScrollView className="flex-1 bg-slate-50 px-4 pt-6">

      {/* Header */}
      <Text className="text-2xl font-extrabold text-slate-900 mb-6">
        Settings
      </Text>

      {/* Cards */}
      {settingsOptions.map((item, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(item.screen)}
          className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 
          shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex-row items-center justify-between"
        >
          {/* Left Content */}
          <View className="flex-row items-center flex-1">

            {/* Icon Box */}
            <View className="w-14 h-14 rounded-2xl bg-orange-100 items-center justify-center mr-4">
              <Icon name={item.icon} size={22} color="#f97316" />
            </View>

            {/* Text */}
            <View className="flex-1">
              <Text className="text-[16px] font-extrabold text-slate-900 mb-1">
                {item.title}
              </Text>
              <Text className="text-[10px] font-bold text-gray-400 tracking-widest">
                {item.subtitle}
              </Text>
            </View>
          </View>

          {/* Arrow */}
          <Icon name="chevron-right" size={22} color="#f97316" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default Settings;