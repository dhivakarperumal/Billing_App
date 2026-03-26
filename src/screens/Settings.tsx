import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { fetchOrders } from '../api';

// ─── Main Component ──────────────────────────────────────────────────────────
const Settings = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  // floating tab bar: 70px height + 12px margin + safe area bottom
  const tabBarHeight = 70 + 12 + Math.max(insets.bottom, 12);

  // GST
  const [gstEnabled, setGstEnabled] = React.useState(false);
  const [gstPercentage, setGstPercentage] = React.useState('18');
  const [gstType, setGstType] = React.useState<'inclusive' | 'exclusive'>('exclusive');

  // Print / Save
  const [autoPrint, setAutoPrint] = React.useState(false);
  const [afterSaveAction, setAfterSaveAction] = React.useState<'back' | 'stay'>('back');

  React.useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const enabled      = await AsyncStorage.getItem('gst_enabled');
      const percentage   = await AsyncStorage.getItem('gst_percentage');
      const type         = await AsyncStorage.getItem('gst_type');
      const autoprintSetting = await AsyncStorage.getItem('auto_print');
      const saveAction   = await AsyncStorage.getItem('after_save_action');

      setGstEnabled(enabled === 'true');
      if (percentage) setGstPercentage(percentage);
      if (type) setGstType(type as any);
      setAutoPrint(autoprintSetting === 'true');
      if (saveAction) setAfterSaveAction(saveAction as any);
    } catch (e) {}
  };

  const toggleGst = (value: boolean) => {
    setGstEnabled(value);
    AsyncStorage.setItem('gst_enabled', String(value));
  };
  const updatePercentage = (value: string) => {
    setGstPercentage(value);
    AsyncStorage.setItem('gst_percentage', value);
  };
  const updateType = (type: 'inclusive' | 'exclusive') => {
    setGstType(type);
    AsyncStorage.setItem('gst_type', type);
  };
  const toggleAutoPrint = (value: boolean) => {
    setAutoPrint(value);
    AsyncStorage.setItem('auto_print', String(value));
  };
  const updateSaveAction = (action: 'back' | 'stay') => {
    setAfterSaveAction(action);
    AsyncStorage.setItem('after_save_action', action);
  };

  const settingsItems = [
    {
      title: 'Printer Setup',
      subtitle: 'Configure Bluetooth/WiFi printers',
      icon: 'printer',
      onPress: () => navigation.navigate('PrinterSettings'),
    },
    {
      title: 'Business Info',
      subtitle: 'Manage your store details',
      icon: 'briefcase',
      onPress: () => navigation.navigate('ReceiptSetup' as any),
    },
    {
      title: 'Add New Stock',
      subtitle: 'Add to existing variant quantities',
      icon: 'plus-circle',
      onPress: () => navigation.navigate('AddStock'),
    },
    {
      title: 'Stock Management',
      subtitle: 'Update inventory for all variants',
      icon: 'box',
      onPress: () => navigation.navigate('StockManagement'),
    },
    {
      title: 'Reports',
      subtitle: 'View and export billing history',
      icon: 'file-text',
      onPress: () => navigation.navigate('Reports'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── TAX SETTINGS ── */}
        <Text style={styles.sectionTitle}>TAX CONFIGURATION</Text>

        <View style={styles.item}>
          <View style={styles.itemIcon}>
            <Feather name="percent" size={20} color="#2563eb" />
          </View>
          <View style={styles.itemMeta}>
            <Text style={styles.itemTitle}>Enable GST</Text>
            <Text style={styles.itemSubtitle}>Apply tax to all transactions</Text>
          </View>
          <Switch
            value={gstEnabled}
            onValueChange={toggleGst}
            trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
          />
        </View>

        {gstEnabled && (
          <View style={styles.detailsCard}>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>GST Percentage (%)</Text>
              <TextInput
                style={styles.percentageInput}
                value={gstPercentage}
                onChangeText={updatePercentage}
                keyboardType="numeric"
                placeholder="18"
              />
            </View>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeBtn, gstType === 'exclusive' && styles.typeBtnActive]}
                onPress={() => updateType('exclusive')}
              >
                <Text style={[styles.typeBtnText, gstType === 'exclusive' && styles.typeBtnTextActive]}>Exclusive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, gstType === 'inclusive' && styles.typeBtnActive]}
                onPress={() => updateType('inclusive')}
              >
                <Text style={[styles.typeBtnText, gstType === 'inclusive' && styles.typeBtnTextActive]}>Inclusive</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── SYSTEM SETTINGS ── */}
        <View style={{ height: 20 }} />
        <Text style={styles.sectionTitle}>SYSTEM SETTINGS</Text>

        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.item}
            onPress={item.onPress}
          >
            <View style={styles.itemIcon}>
              <Feather name={item.icon} size={20} color="#2563eb" />
            </View>
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        ))}

       

        {/* ── DIAGNOSTICS ── */}
        <View style={{ height: 10 }} />
        <TouchableOpacity
          style={[styles.item, { borderColor: '#e2e8f0', borderStyle: 'dashed', backgroundColor: '#fdf2f8' }]}
          onPress={() => navigation.navigate('Diagnostics')}
        >
          <View style={[styles.itemIcon, { backgroundColor: '#fce7f3' }]}>
            <Feather name="activity" size={20} color="#db2777" />
          </View>
          <View style={styles.itemMeta}>
            <Text style={[styles.itemTitle, { color: '#db2777' }]}>System Diagnostics</Text>
            <Text style={styles.itemSubtitle}>Test Camera, GPS & Bluetooth</Text>
          </View>
          <Feather name="zap" size={16} color="#db2777" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5ff', // light blue background
  },

  list: {
    flex: 1,
  },

  listContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // 🔵 SECTION TITLE
  sectionTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 5,
    textTransform: 'uppercase',
  },

  // 🔵 CARD ITEM
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff', // blue border
  },

  // 🔵 ICON BOX
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff', // light blue
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemMeta: {
    flex: 1,
    marginLeft: 15,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e3a8a', // dark blue text
  },

  itemSubtitle: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 1,
  },

  // 🔵 DETAILS CARD
  detailsCard: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    gap: 12,
  },

  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },

  percentageInput: {
    backgroundColor: '#f1f5ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    width: 55,
    textAlign: 'center',
    fontWeight: '900',
    color: '#1e3a8a',
  },

  // 🔵 TYPE BUTTONS
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },

  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5ff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },

  typeBtnActive: {
    backgroundColor: '#2563eb', // primary blue
    borderColor: '#2563eb',
  },

  typeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },

  typeBtnTextActive: {
    color: '#ffffff',
  },

  // 🔵 REPORT PANEL
  reportPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    marginBottom: 10,
    overflow: 'hidden',
  },

  filterRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },

  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },

  chipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },

  chipTextActive: {
    color: '#ffffff',
  },

  // 🔵 SUMMARY BAR
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },

  summaryItem: {
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#bfdbfe',
  },

  // 🔵 EMPTY STATE
  reportCenter: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },

  reportHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },

  // 🔵 TRANSACTION ROW
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e7ff',
  },

  txIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  txMeta: {
    flex: 1,
    marginLeft: 10,
  },

  txCustomer: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  txDate: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },

  txAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e3a8a',
  },
});

export default Settings;