import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';

const BackButton = ({ title }) => {
  const navigation = useNavigation();

  return (
    <View className="flex-row items-center px-4 pt-5 pb-3 bg-white">

      {/* Back Icon */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
      >
        <Icon name="arrow-left" size={20} color="#111" />
      </TouchableOpacity>

      {/* Title */}
      {title && (
        <Text className="ml-4 text-lg font-black text-slate-900">
          {title}
        </Text>
      )}
    </View>
  );
};

export default BackButton;