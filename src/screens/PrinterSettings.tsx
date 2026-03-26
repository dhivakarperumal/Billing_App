import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothManager } from 'react-native-bluetooth-escpos-printer';

const HEADER_GRADIENT = ['#2563eb', '#3b82f6'];

type DeviceType = 'printer' | 'phone' | 'tablet' | 'headset' | 'laptop' | 'speaker' | 'watch' | 'other';

interface BTDevice {
  name: string;
  address: string;
  paired?: boolean;
  deviceType?: DeviceType;
}

// Detect device type from name
const detectDeviceType = (name: string): DeviceType => {
  const n = (name || '').toLowerCase();
  if (/printer|pos|xp-|rpp|mtp|btp|thermal|escpos|receipt/.test(n)) return 'printer';
  if (/iphone|android|samsung|galaxy|pixel|oneplus|xiaomi|redmi|oppo|vivo|realme|phone|mobile/.test(n)) return 'phone';
  if (/ipad|tab|tablet/.test(n)) return 'tablet';
  if (/airpods|earbuds|headset|headphone|buds|earpods|jbl|sony wh|wh-|wf-|jabra/.test(n)) return 'headset';
  if (/macbook|laptop|notebook|thinkpad|dell|hp|lenovo|asus|acer/.test(n)) return 'laptop';
  if (/speaker|soundbar|bose|marshall|harman|anker/.test(n)) return 'speaker';
  if (/watch|band|fitness|fitbit|garmin|mi band/.test(n)) return 'watch';
  return 'other';
};

const deviceTypeIcon = (type: DeviceType): string => {
  switch (type) {
    case 'printer': return 'printer';
    case 'phone': return 'smartphone';
    case 'tablet': return 'tablet';
    case 'headset': return 'headphones';
    case 'laptop': return 'monitor';
    case 'speaker': return 'volume-2';
    case 'watch': return 'watch';
    default: return 'bluetooth';
  }
};

const deviceTypeLabel = (type: DeviceType): string => {
  switch (type) {
    case 'printer': return 'Printer';
    case 'phone': return 'Mobile';
    case 'tablet': return 'Tablet';
    case 'headset': return 'Headset';
    case 'laptop': return 'Computer';
    case 'speaker': return 'Speaker';
    case 'watch': return 'Wearable';
    default: return 'Device';
  }
};

const deviceTypeColor = (type: DeviceType): string => {
  switch (type) {
    case 'printer': return '#f97316';
    case 'phone': return '#6366f1';
    case 'tablet': return '#0ea5e9';
    case 'headset': return '#10b981';
    case 'laptop': return '#64748b';
    case 'speaker': return '#ec4899';
    case 'watch': return '#f59e0b';
    default: return '#94a3b8';
  }
};

const PrinterSettings = () => {
  const navigation = useNavigation();
  const [printerType, setPrinterType] = useState<'bluetooth' | 'wifi' | 'usb'>('bluetooth');
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  const [pairedDevices, setPairedDevices] = useState<BTDevice[]>([]);
  const [availableDevices, setAvailableDevices] = useState<BTDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BTDevice | null>(null);

  // Device action menu
  const [menuDevice, setMenuDevice] = useState<BTDevice | null>(null);
  const menuAnim = useRef(new Animated.Value(0)).current;

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
          setConnectedDevice({ name: config.name || 'Saved Printer', address: config.address });
        } else if (config.type === 'wifi') {
          setIpAddress(config.ip || '');
          setPort(config.port || '9100');
        }
      }
    } catch (e) { }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const apiLevel = Platform.Version as number;
    const perms = apiLevel >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

    const results = await PermissionsAndroid.requestMultiple(perms);
    return Object.values(results).some(v => v === PermissionsAndroid.RESULTS.GRANTED);
  };

  const scanDevices = async () => {
    const hasPermission = await requestPermissions().catch(() => false);
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Bluetooth and Location permissions are needed to scan devices.');
      return;
    }

    const isEnabled = await BluetoothManager.isBluetoothEnabled().catch(() => false);
    if (!isEnabled) {
      Alert.alert('Bluetooth Off', 'Please turn on Bluetooth and try again.');
      return;
    }

    setScanning(true);
    setPairedDevices([]);
    setAvailableDevices([]);

    try {
      const results = await BluetoothManager.scanDevices();
      const devicesList = typeof results === 'string' ? JSON.parse(results) : results;

      const rawPaired: any[] = devicesList.paired || [];
      const rawFound: any[] = devicesList.found || [];

      // Map ALL paired devices (phones, tablets, printers, etc.)
      const paired: BTDevice[] = rawPaired.map((d: any) => ({
        name: d.name || 'Unknown Device',
        address: d.address,
        paired: true,
        deviceType: detectDeviceType(d.name || ''),
      }));

      // Map ALL found/available devices not already in paired list
      const pairedAddresses = new Set(paired.map(d => d.address));
      const available: BTDevice[] = rawFound
        .filter((d: any) => !pairedAddresses.has(d.address))
        .map((d: any) => ({
          name: d.name || 'Unknown Device',
          address: d.address,
          paired: false,
          deviceType: detectDeviceType(d.name || ''),
        }));

      setPairedDevices(paired);
      setAvailableDevices(available);
    } catch (e: any) {
      Alert.alert('Scan Failed', e.message || 'Error scanning for Bluetooth devices.');
    } finally {
      setScanning(false);
    }
  };

  const openDeviceMenu = (device: BTDevice) => {
    setMenuDevice(device);
    menuAnim.setValue(0);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setMenuDevice(null);
    });
  };

  const connectDevice = async (device: BTDevice) => {
    closeMenu();
    setConnecting(device.address);
    try {
      await BluetoothManager.connect(device.address);
      setConnectedDevice(device);
      await AsyncStorage.setItem('printer_config', JSON.stringify({ type: 'bluetooth', name: device.name, address: device.address }));
      Alert.alert('✅ Connected', `Now using "${device.name}" as printer.`);
    } catch (e: any) {
      Alert.alert('Connection Error', e.message || 'Could not connect to this device.');
    } finally {
      setConnecting(null);
    }
  };

  const pairDevice = async (device: BTDevice) => {
    closeMenu();
    setConnecting(device.address);
    try {
      // Pairing is done via connecting in BluetoothManager which triggers bond creation
      await BluetoothManager.connect(device.address);
      // Move to paired list
      setAvailableDevices(prev => prev.filter(d => d.address !== device.address));
      setPairedDevices(prev => [...prev, { ...device, paired: true }]);
      setConnectedDevice(device);
      await AsyncStorage.setItem('printer_config', JSON.stringify({ type: 'bluetooth', name: device.name, address: device.address }));
      Alert.alert('✅ Paired', `"${device.name}" has been paired and connected.`);
    } catch (e: any) {
      Alert.alert('Pairing Error', e.message || 'Could not pair with this device.');
    } finally {
      setConnecting(null);
    }
  };

  const unpairDevice = async (device: BTDevice) => {
    closeMenu();
    Alert.alert(
      'Unpair Device',
      `Remove "${device.name}" from paired devices?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            try {
              await (BluetoothManager as any).unpaire(device.address);
              setPairedDevices(prev => prev.filter(d => d.address !== device.address));
              setAvailableDevices(prev => [...prev, { ...device, paired: false }]);
              if (connectedDevice?.address === device.address) setConnectedDevice(null);
              Alert.alert('Unpaired', `"${device.name}" has been removed.`);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not unpair device.');
            }
          }
        }
      ]
    );
  };

  const disconnectCurrent = async () => {
    setConnectedDevice(null);
    await AsyncStorage.removeItem('printer_config');
  };

  const saveWiFiConfig = async () => {
    if (!ipAddress) { Alert.alert('Invalid', 'Enter a valid IP address.'); return; }
    await AsyncStorage.setItem('printer_config', JSON.stringify({ type: 'wifi', ip: ipAddress, port }));
    Alert.alert('Saved', 'WiFi printer configuration saved successfully.');
  };

  // ─── Device Row Component ───────────────────────────────────────
  const DeviceRow = ({ device, badgeLabel, badgeColor, onPress }: {
    device: BTDevice;
    badgeLabel: string;
    badgeColor: string;
    onPress: () => void;
  }) => {
    const isConnecting = connecting === device.address;
    const isConnected = connectedDevice?.address === device.address;
    const dtype = device.deviceType || 'other';
    const iconName = deviceTypeIcon(dtype);
    const typeColor = deviceTypeColor(dtype);
    const typeLabel = deviceTypeLabel(dtype);

    return (
      <TouchableOpacity style={styles.deviceRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.deviceIconWrap, { backgroundColor: typeColor + '18' }]}>
          {isConnecting
            ? <ActivityIndicator size="small" color="#f97316" />
            : <Feather name={iconName as any} size={18} color={isConnected ? '#10b981' : typeColor} />
          }
        </View>
        <View style={styles.deviceMeta}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={[styles.deviceTypeLabel, { color: typeColor }]}>{typeLabel}</Text>
            <Text style={styles.deviceAddr}>· {device.address}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isConnected && (
            <View style={styles.connectedDot}><Text style={styles.connectedDotTxt}>ACTIVE</Text></View>
          )}
          <View style={[styles.badge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
            <Text style={[styles.badgeTxt, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
          <Feather name="more-vertical" size={16} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={HEADER_GRADIENT} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Printer Setup<Text style={{ color: '#f97316' }}>.</Text></Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          {([['bluetooth', 'Bluetooth'], ['wifi', 'WiFi/IP'], ['usb', 'USB']] as const).map(([type, label]) => (
            <TouchableOpacity key={type} onPress={() => setPrinterType(type)} style={[styles.tab, printerType === type && styles.tabActive]}>
              <Feather name={type === 'bluetooth' ? 'bluetooth' : type === 'wifi' ? 'wifi' : 'hard-drive'} size={14} color={printerType === type ? '#fff' : '#94a3b8'} />
              <Text style={[styles.tabTxt, printerType === type && styles.tabTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ─── BLUETOOTH ─────────────────────────────────────── */}
        {printerType === 'bluetooth' && (
          <>
            {/* Connected Device Banner */}
            {connectedDevice && (
              <View style={styles.connectedBanner}>
                <View style={styles.connectedBannerLeft}>
                  <View style={styles.greenDotWrap}><View style={styles.greenDot} /></View>
                  <View>
                    <Text style={styles.connectedBannerName}>{connectedDevice.name}</Text>
                    <Text style={styles.connectedBannerAddr}>{connectedDevice.address}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={disconnectCurrent} style={styles.disconnectBtn}>
                  <Feather name="x" size={14} color="#ef4444" />
                  <Text style={styles.disconnectTxt}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scan Button */}
            <TouchableOpacity
              onPress={scanDevices}
              disabled={scanning}
              style={[
                styles.scanBtn,
                scanning && { opacity: 0.6 }
              ]}
            >
              <View style={styles.scanBtnInner}>
                {scanning ? (
                  <ActivityIndicator color="#2563eb" size="small" />
                ) : (
                  <Feather name="radio" size={18} color="#2563eb" />
                )}
                <Text style={styles.scanBtnTxt}>
                  {scanning ? 'Scanning for devices…' : 'Scan Nearby Devices'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Paired Devices */}
            {pairedDevices.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="link" size={14} color="#10b981" />
                  <Text style={[styles.sectionTitle, { color: '#10b981' }]}>Paired Devices</Text>
                  <View style={styles.sectionCount}><Text style={styles.sectionCountTxt}>{pairedDevices.length}</Text></View>
                </View>
                <View style={styles.deviceList}>
                  {pairedDevices.map((d, i) => (
                    <DeviceRow
                      key={d.address}
                      device={d}
                      badgeLabel="PAIRED"
                      badgeColor="#10b981"
                      onPress={() => openDeviceMenu(d)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Available Devices */}
            {availableDevices.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="wifi" size={14} color="#f97316" />
                  <Text style={[styles.sectionTitle, { color: '#f97316' }]}>Available Devices</Text>
                  <View style={[styles.sectionCount, { backgroundColor: '#fff7ed' }]}><Text style={[styles.sectionCountTxt, { color: '#f97316' }]}>{availableDevices.length}</Text></View>
                </View>
                <View style={styles.deviceList}>
                  {availableDevices.map((d) => (
                    <DeviceRow
                      key={d.address}
                      device={d}
                      badgeLabel="AVAILABLE"
                      badgeColor="#f97316"
                      onPress={() => openDeviceMenu(d)}
                    />
                  ))}
                </View>
              </View>
            )}

            {!scanning && pairedDevices.length === 0 && availableDevices.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="bluetooth" size={44} color="#e2e8f0" />
                <Text style={styles.emptyTitle}>No Devices Found</Text>
                <Text style={styles.emptySubtitle}>Make sure your printer is on and in range, then tap Scan.</Text>
              </View>
            )}
          </>
        )}

        {/* ─── WIFI ─────────────────────────────────────────── */}
        {printerType === 'wifi' && (
          <View style={styles.wifiPanel}>
            <View style={styles.wifiHeader}>
              <Feather name="wifi" size={20} color="#f97316" />
              <Text style={styles.wifiTitle}>Network Configuration</Text>
            </View>
            <Text style={styles.inputLabel}>Printer IP Address</Text>
            <TextInput style={styles.input} placeholder="e.g. 192.168.1.100" value={ipAddress} onChangeText={setIpAddress} keyboardType="numeric" placeholderTextColor="#94a3b8" />
            <Text style={styles.inputLabel}>Port</Text>
            <TextInput style={styles.input} placeholder="Default: 9100" value={port} onChangeText={setPort} keyboardType="numeric" placeholderTextColor="#94a3b8" />
            <TouchableOpacity style={styles.saveBtn} onPress={saveWiFiConfig}>
              <Text style={styles.saveBtnTxt}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── USB ──────────── */}
        {printerType === 'usb' && (
          <View style={styles.emptyState}>
            <Feather name="tool" size={44} color="#e2e8f0" />
            <Text style={styles.emptyTitle}>USB Printer</Text>
            <Text style={styles.emptySubtitle}>USB support is coming soon. Connect via Bluetooth or WiFi for now.</Text>
          </View>
        )}
      </ScrollView>

      {/* ─── Device Action Menu Modal ─────────────────────────── */}
      <Modal visible={!!menuDevice} transparent animationType="fade" onRequestClose={closeMenu}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={closeMenu}>

          <Animated.View
            style={[
              styles.menuCard,
              {
                transform: [{
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }]
              }
            ]}
          >

            {/* HANDLE BAR */}
            <View style={styles.handleBar} />

            {/* DEVICE INFO */}
            <View style={styles.menuHeader}>
              <View style={styles.menuDeviceIcon}>
                <Feather name="printer" size={22} color="#2563eb" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.menuDeviceName}>{menuDevice?.name}</Text>
                <Text style={styles.menuDeviceAddr}>{menuDevice?.address}</Text>
              </View>

              {menuDevice?.paired && (
                <View style={styles.pairedBadge}>
                  <Text style={styles.pairedBadgeTxt}>PAIRED</Text>
                </View>
              )}
            </View>

            {/* ACTIONS */}
            <View style={styles.menuActionsWrap}>

              {/* CONNECT */}
              <TouchableOpacity style={styles.menuAction} onPress={() => menuDevice && connectDevice(menuDevice)}>
                <View style={[styles.menuActionIcon, { backgroundColor: '#eff6ff' }]}>
                  <Feather name="zap" size={18} color="#2563eb" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.menuActionTitle}>Connect & Use</Text>
                  <Text style={styles.menuActionSub}>Set as active printer</Text>
                </View>

                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </TouchableOpacity>

              {/* PAIR */}
              {!menuDevice?.paired && (
                <TouchableOpacity style={styles.menuAction} onPress={() => menuDevice && pairDevice(menuDevice)}>
                  <View style={[styles.menuActionIcon, { backgroundColor: '#ecfdf5' }]}>
                    <Feather name="link" size={18} color="#10b981" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuActionTitle}>Pair Device</Text>
                    <Text style={styles.menuActionSub}>Add to paired list</Text>
                  </View>

                  <Feather name="chevron-right" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {/* UNPAIR */}
              {menuDevice?.paired && (
                <TouchableOpacity style={styles.menuAction} onPress={() => menuDevice && unpairDevice(menuDevice)}>
                  <View style={[styles.menuActionIcon, { backgroundColor: '#fef2f2' }]}>
                    <Feather name="link-2" size={18} color="#ef4444" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuActionTitle, { color: '#ef4444' }]}>Unpair Device</Text>
                    <Text style={styles.menuActionSub}>Remove from paired</Text>
                  </View>

                  <Feather name="chevron-right" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}

            </View>

            {/* CANCEL */}
            <TouchableOpacity style={styles.menuCancelBtn} onPress={closeMenu}>
              <Text style={styles.menuCancelTxt}>Cancel</Text>
            </TouchableOpacity>

          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5ff',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },

  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },

  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  tabActive: {
    backgroundColor: '#2563eb',
  },

  tabTxt: {
    color: '#cbd5f5',
    fontSize: 11,
    fontWeight: '800',
  },

  tabTxtActive: {
    color: '#fff',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // 🔵 CONNECTED CARD
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },

  connectedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  greenDotWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },

  connectedBannerName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  connectedBannerAddr: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },

  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },

  disconnectTxt: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '900',
  },

  // 🔵 SCAN BUTTON
  scanBtn: {
    borderRadius: 18,
    marginBottom: 24,
  },

  scanBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,

    backgroundColor: '#ffffff', // 🔥 white bg
    borderWidth: 1.5,
    borderColor: '#2563eb',     // 🔵 blue border
    borderRadius: 18,
  },

  scanBtnTxt: {
    color: '#2563eb', // 🔵 blue text
    fontSize: 14,
    fontWeight: '900',
  },

  // 🔵 SECTION
  section: {
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
    color: '#2563eb',
  },

  sectionCount: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  sectionCountTxt: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '900',
  },

  deviceList: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },

  // 🔵 DEVICE ROW
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5ff',
  },

  deviceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  deviceMeta: {
    flex: 1,
  },

  deviceName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  deviceTypeLabel: {
    fontSize: 10,
    fontWeight: '800',
  },

  deviceAddr: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },

  connectedDot: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },

  connectedDotTxt: {
    color: '#2563eb',
    fontSize: 8,
    fontWeight: '900',
  },

  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },

  badgeTxt: {
    fontSize: 8,
    fontWeight: '900',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#64748b',
  },

  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // 🔵 WIFI PANEL
  wifiPanel: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },

  wifiTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  input: {
    backgroundColor: '#f1f5ff',
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
    color: '#1e3a8a',
  },

  saveBtn: {
    backgroundColor: '#2563eb',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtnTxt: {
    color: '#fff',
    fontWeight: '900',
  },

  // 🔵 MODAL
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },

  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
  },

  menuDeviceIcon: {
    backgroundColor: '#eff6ff',
  },

  menuDeviceName: {
    color: '#1e3a8a',
  },

  menuActionIcon: {
    backgroundColor: '#eff6ff',
  },

  menuActionTitle: {
    color: '#1e3a8a',
  },

  menuCancelTxt: {
    color: '#64748b',
  },

  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: '#cbd5f5',
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },

  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },

  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  menuDeviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuDeviceName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  menuDeviceAddr: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },

  pairedBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  pairedBadgeTxt: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '900',
  },

  menuActionsWrap: {
    paddingHorizontal: 10,
  },

  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },

  menuActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuActionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  menuActionSub: {
    fontSize: 11,
    color: '#64748b',
  },

  menuCancelBtn: {
    marginTop: 10,
    padding: 16,
    alignItems: 'center',
  },

  menuCancelTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
  },
});

export default PrinterSettings;
