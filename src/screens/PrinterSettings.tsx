import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
  ScrollView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothManager } from 'react-native-bluetooth-escpos-printer';

const HEADER_GRADIENT = ['#0f172a', '#1e293b'];

interface BluetoothDevice {
  name: string;
  address: string;
}

const PrinterSettings = () => {
  const navigation = useNavigation();
  const [printerType, setPrinterType] = useState<'bluetooth' | 'wifi' | 'usb'>('bluetooth');
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  
  // WiFi states
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState('9100');

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem('printer_config');
      if (saved) {
        const config = JSON.parse(saved);
        setPrinterType(config.type);
        if (config.type === 'bluetooth' && config.address) {
          // Verify if it's still connected or just show as configured
          setConnectedDevice({ name: config.name || 'Saved Printer', address: config.address });
        } else if (config.type === 'wifi') {
          setIpAddress(config.ip);
          setPort(config.port);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version as number;
      console.log('Android API Level:', apiLevel);

      if (apiLevel >= 31) {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        
        console.log('Requesting API 31+ permissions...');
        const result = await PermissionsAndroid.requestMultiple(permissions);
        
        const allGranted = 
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        
        console.log('Permission Results:', result);
        return allGranted;
      } else {
        console.log('Requesting legacy permissions...');
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        
        const allGranted = 
          result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
          result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
          
        return allGranted;
      }
    }
    return true;
  };

  const scanDevices = async () => {
    let hasPermission = false;
    try {
      hasPermission = await requestPermissions();
    } catch (err) {
      console.error('Permission request error:', err);
    }

    if (!hasPermission) {
      Alert.alert(
        'Permission Required', 
        'Bluetooth and Location permissions are necessary for device discovery. Please enable them in App Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Platform.OS === 'android' ? PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) : null },
          { text: 'Try again', onPress: () => scanDevices() }
        ]
      );
      return;
    }

    const isEnabled = await BluetoothManager.isBluetoothEnabled();
    if (!isEnabled) {
      Alert.alert('Bluetooth Disabled', 'Please turn on Bluetooth to scan for printers.');
      return;
    }

    setLoading(true);
    setDevices([]); 
    try {
      console.log('Starting Bluetooth scan...');
      const results = await BluetoothManager.scanDevices();
      console.log('Scan results received:', results);
      
      const devicesList = typeof results === 'string' ? JSON.parse(results) : results;
      const found = devicesList.found || [];
      const paired = devicesList.paired || [];
      
      // Combine and filter unique devices
      const all = [...paired, ...found].map((d: any) => ({
          name: d.name || 'Unknown Device',
          address: d.address
      }));
      
      // Remove duplicates by address
      const unique = all.filter((v, i, a) => a.findIndex(t => t.address === v.address) === i);
      setDevices(unique);
    } catch (e: any) {
      Alert.alert('Scan Failed', e.message || 'Error scanning for devices');
    } finally {
      setLoading(false);
    }
  };

  const connectDevice = async (device: BluetoothDevice) => {
    setLoading(true);
    try {
      await BluetoothManager.connect(device.address);
      setConnectedDevice(device);
      
      // Save config
      const config = {
        type: 'bluetooth',
        name: device.name,
        address: device.address
      };
      await AsyncStorage.setItem('printer_config', JSON.stringify(config));
      
      Alert.alert('Success', `Connected to ${device.name}`);
    } catch (e: any) {
      Alert.alert('Connection Error', e.message || 'Could not connect to printer');
    } finally {
      setLoading(false);
    }
  };

  const saveWiFiConfig = async () => {
    if (!ipAddress || !port) {
      Alert.alert('Invalid Input', 'Please enter IP Address and Port');
      return;
    }
    
    try {
      const config = {
        type: 'wifi',
        ip: ipAddress,
        port: port
      };
      await AsyncStorage.setItem('printer_config', JSON.stringify(config));
      Alert.alert('Success', 'WiFi Printer configuration saved');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={HEADER_GRADIENT} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Printer Setup</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Select Connection Type</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeBtn, printerType === 'bluetooth' && styles.typeBtnActive]}
            onPress={() => setPrinterType('bluetooth')}
          >
            <Feather name="bluetooth" size={20} color={printerType === 'bluetooth' ? '#fff' : '#64748b'} />
            <Text style={[styles.typeText, printerType === 'bluetooth' && styles.typeTextActive]}>Bluetooth</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, printerType === 'wifi' && styles.typeBtnActive]}
            onPress={() => setPrinterType('wifi')}
          >
            <Feather name="wifi" size={20} color={printerType === 'wifi' ? '#fff' : '#64748b'} />
            <Text style={[styles.typeText, printerType === 'wifi' && styles.typeTextActive]}>WiFi/IP</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, printerType === 'usb' && styles.typeBtnActive]}
            onPress={() => setPrinterType('usb')}
          >
            <Feather name="usb" size={20} color={printerType === 'usb' ? '#fff' : '#64748b'} />
            <Text style={[styles.typeText, printerType === 'usb' && styles.typeTextActive]}>USB</Text>
          </TouchableOpacity>
        </View>

        {printerType === 'bluetooth' && (
          <View style={styles.btPanel}>
            {connectedDevice ? (
              <View style={styles.connectedCard}>
                <View style={styles.connectedInfo}>
                  <Feather name="check-circle" size={24} color="#10b981" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.connectedName}>{connectedDevice.name}</Text>
                    <Text style={styles.connectedAddr}>{connectedDevice.address}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => setConnectedDevice(null)}
                  style={styles.disconnectBtn}
                >
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.scanHeader}>
              <Text style={styles.subTitle}>Available Devices</Text>
              <TouchableOpacity onPress={scanDevices} disabled={loading} style={styles.scanBtn}>
                {loading ? <ActivityIndicator size="small" color="#f97316" /> : <Text style={styles.scanBtnText}>Scan</Text>}
              </TouchableOpacity>
            </View>

            {devices.length > 0 ? (
              <View style={styles.listContainer}>
                {devices.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.deviceItem}
                    onPress={() => connectDevice(item)}
                  >
                    <View style={styles.deviceIcon}>
                      <Feather name="printer" size={18} color="#64748b" />
                    </View>
                    <View style={styles.deviceMeta}>
                      <Text style={styles.deviceName}>{item.name}</Text>
                      <Text style={styles.deviceAddr}>{item.address}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="search" size={40} color="#e2e8f0" />
                <Text style={styles.emptyText}>No devices found. Tap Scan to search.</Text>
              </View>
            )}
          </View>
        )}

        {printerType === 'wifi' && (
          <View style={styles.wifiPanel}>
            <Text style={styles.subTitle}>Network Configuration</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Printer IP Address</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 192.168.1.100"
                value={ipAddress}
                onChangeText={setIpAddress}
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Port</Text>
              <TextInput 
                style={styles.input}
                placeholder="Default: 9100"
                value={port}
                onChangeText={setPort}
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveWiFiConfig}>
              <Text style={styles.saveBtnText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        )}

        {printerType === 'usb' && (
          <View style={styles.emptyState}>
            <Feather name="tool" size={40} color="#e2e8f0" />
            <Text style={styles.emptyText}>USB support currently undergoing maintenance.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: Platform.OS === 'ios' ? 10 : 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 15 },
  typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  typeBtn: { flex: 1, paddingVertical: 15, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 8 },
  typeBtnActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  typeText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  typeTextActive: { color: '#fff' },
  btPanel: {},
  subTitle: { fontSize: 14, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  scanBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f97316' },
  scanBtnText: { color: '#f97316', fontSize: 13, fontWeight: '900' },
  connectedCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  connectedInfo: { flexDirection: 'row', alignItems: 'center' },
  connectedName: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  connectedAddr: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  disconnectBtn: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15, alignItems: 'center' },
  disconnectText: { color: '#ef4444', fontSize: 13, fontWeight: '900' },
  listContainer: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  deviceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  deviceMeta: { flex: 1, marginLeft: 15 },
  deviceName: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  deviceAddr: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  emptyState: { paddingVertical: 50, alignItems: 'center', gap: 15 },
  emptyText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  wifiPanel: { backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', height: 50, borderRadius: 15, paddingHorizontal: 15, fontSize: 14, fontWeight: '700', color: '#0f172a', borderWidth: 1, borderColor: '#f1f5f9' },
  saveBtn: { backgroundColor: '#0f172a', height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' }
});

export default PrinterSettings;
