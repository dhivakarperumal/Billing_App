import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';

const PrinterSettings = () => {
  const [settings, setSettings] = useState({
    shopName: 'My Store',
    gst: 'GSTIN123456',
    address: 'Mumbai, India',
    footer: 'Thank You! Visit Again',

    showLogo: true,
    logo: null,

    upiId: '',
    showQR: false,
    qrGenerated: false,

    fontSize: '14',
    align: 'center',
  });

  const handleChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleGenerateQR = () => {
    if (!settings.upiId) {
      alert('Enter UPI ID first');
      return;
    }
    setSettings({ ...settings, qrGenerated: true });
  };

  const handleRemoveUPI = () => {
    setSettings({
      ...settings,
      upiId: '',
      qrGenerated: false,
      showQR: false,
    });
  };

  const pickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 1 },
      response => {
        if (response.didCancel) return;
        if (response.assets?.length > 0) {
          handleChange('logo', response.assets[0].uri);
        }
      },
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-[#f8fafc]"
      contentContainerStyle={{ paddingBottom: 120 }}
    >

      {/* HEADER */}
      <View className="px-5 pt-6 mb-6">
        <Text className="text-2xl font-black text-slate-900">
          Printer Settings
        </Text>
        <Text className="text-xs text-gray-400 font-bold">
          CUSTOMIZE YOUR BILL LAYOUT
        </Text>
      </View>

      {/* ================= SHOP DETAILS ================= */}
      <View className="mx-4 bg-white rounded-3xl p-5 mb-4 shadow-sm">
        <Text className="font-black text-slate-800 mb-4">
          Shop Details
        </Text>

        <TextInput
          value={settings.shopName}
          onChangeText={t => handleChange('shopName', t)}
          placeholder="Shop Name"
          className="bg-gray-50 p-4 rounded-2xl mb-3 text-black"
        />

        <TextInput
          value={settings.gst}
          onChangeText={t => handleChange('gst', t)}
          placeholder="GST Number"
          className="bg-gray-50 p-4 rounded-2xl mb-3 text-black"
        />

        <TextInput
          value={settings.address}
          onChangeText={t => handleChange('address', t)}
          placeholder="Address"
          className="bg-gray-50 p-4 rounded-2xl mb-3 text-black"
        />

        <TextInput
          value={settings.footer}
          onChangeText={t => handleChange('footer', t)}
          placeholder="Footer Message"
          className="bg-gray-50 p-4 rounded-2xl text-black"
        />
      </View>

      {/* ================= LOGO ================= */}
      <View className="mx-4 bg-white rounded-3xl p-5 mb-4 shadow-sm">
        <Text className="font-black text-slate-800 mb-4">
          Logo Settings
        </Text>

        <TouchableOpacity
          onPress={pickImage}
          className="bg-orange-100 p-4 rounded-2xl mb-3"
        >
          <Text className="text-center font-bold text-orange-600">
            Upload Logo
          </Text>
        </TouchableOpacity>

        {settings.logo && (
          <Image
            source={{ uri: settings.logo }}
            className="w-20 h-20 mb-3 rounded-lg self-center"
          />
        )}

        <View className="flex-row justify-between items-center">
          <Text className="font-bold text-sm text-black">
            Show Logo
          </Text>
          <Switch
            value={settings.showLogo}
            onValueChange={v => handleChange('showLogo', v)}
          />
        </View>
      </View>

      {/* ================= UPI ================= */}
      <View className="mx-4 bg-white rounded-3xl p-5 mb-4 shadow-sm">
        <Text className="font-black text-slate-800 mb-4">
          Payment Settings
        </Text>

        <TextInput
          value={settings.upiId}
          onChangeText={t => handleChange('upiId', t)}
          placeholder="UPI ID"
          placeholderTextColor="#999"
          className="bg-gray-50 p-4 rounded-2xl mb-3 text-black"
        />

        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            onPress={handleGenerateQR}
            className="flex-1 bg-orange-500 p-3 rounded-xl"
          >
            <Text className="text-white text-center font-bold text-xs">
              GENERATE QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRemoveUPI}
            className="flex-1 bg-red-500 p-3 rounded-xl"
          >
            <Text className="text-white text-center font-bold text-xs">
              REMOVE
            </Text>
          </TouchableOpacity>
        </View>

        {settings.qrGenerated && settings.upiId !== '' && (
          <View className="items-center bg-gray-100 p-4 rounded-2xl mb-3">
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${settings.upiId}`,
              }}
              className="w-28 h-28"
            />
            <Text className="text-xs mt-2 text-gray-500">
              QR Preview
            </Text>
          </View>
        )}

        <View className="flex-row justify-between items-center">
          <Text className="font-bold text-sm text-black">
            Show QR
          </Text>
          <Switch
            value={settings.showQR}
            onValueChange={v => handleChange('showQR', v)}
            disabled={!settings.qrGenerated}
          />
        </View>
      </View>

      {/* ================= STYLE ================= */}
      <View className="mx-4 bg-white rounded-3xl p-5 mb-4 shadow-sm">
        <Text className="font-black text-slate-800 mb-4">
          Print Style
        </Text>

        <View className="flex-row gap-2 mb-3">
          {['12', '14', '18'].map(size => (
            <TouchableOpacity
              key={size}
              onPress={() => handleChange('fontSize', size)}
              className={`flex-1 p-3 rounded-xl ${
                settings.fontSize === size
                  ? 'bg-orange-500'
                  : 'bg-gray-200'
              }`}
            >
              <Text className="text-center font-bold text-xs text-black">
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row gap-2">
          {['left', 'center', 'right'].map(align => (
            <TouchableOpacity
              key={align}
              onPress={() => handleChange('align', align)}
              className={`flex-1 p-3 rounded-xl ${
                settings.align === align
                  ? 'bg-orange-500'
                  : 'bg-gray-200'
              }`}
            >
              <Text className="text-center font-bold text-xs text-black">
                {align.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SAVE BUTTON */}
      <TouchableOpacity className="mx-4 bg-orange-500 p-4 rounded-2xl flex-row justify-center items-center mb-6">
        <Icon name="save" size={18} color="#fff" />
        <Text className="text-white font-bold ml-2 text-xs">
          SAVE SETTINGS
        </Text>
      </TouchableOpacity>

      {/* ================= PREVIEW ================= */}
      <View className="items-center mb-10">
        <View
          style={{
            backgroundColor: '#fff',
            padding: 12,
            width: 260,
            alignItems:
              settings.align === 'left'
                ? 'flex-start'
                : settings.align === 'right'
                ? 'flex-end'
                : 'center',
          }}
        >
          {settings.showLogo && settings.logo && (
            <Image source={{ uri: settings.logo }} style={{ width: 60, height: 60 }} />
          )}

          <Text>{settings.shopName}</Text>
          <Text>{settings.address}</Text>
          <Text>{settings.gst}</Text>

          <Text>--------------------</Text>

          <Text>Item 1 x1 ₹100</Text>
          <Text>Item 2 x2 ₹200</Text>

          <Text>--------------------</Text>
          <Text>Total: ₹300</Text>

          {settings.showQR && settings.qrGenerated && settings.upiId !== '' && (
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=${settings.upiId}`,
              }}
              style={{ width: 100, height: 100 }}
            />
          )}

          <Text>{settings.footer}</Text>
        </View>
      </View>

    </ScrollView>
  );
};

export default PrinterSettings;