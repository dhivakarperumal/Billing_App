import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';

const Settings = () => {
  const navigation = useNavigation<any>();

  const [gstEnabled, setGstEnabled] = React.useState(false);
  const [gstPercentage, setGstPercentage] = React.useState('18');
  const [gstType, setGstType] = React.useState<'inclusive' | 'exclusive'>('exclusive');
  
  const [autoPrint, setAutoPrint] = React.useState(false);
  const [afterSaveAction, setAfterSaveAction] = React.useState<'back' | 'stay'>('back');

  React.useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
        const enabled = await AsyncStorage.getItem('gst_enabled');
        const percentage = await AsyncStorage.getItem('gst_percentage');
        const type = await AsyncStorage.getItem('gst_type');
        const autoprintSetting = await AsyncStorage.getItem('auto_print');
        const saveAction = await AsyncStorage.getItem('after_save_action');
        
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
      onPress: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings<Text style={{ color: '#f97316' }}>.</Text></Text>
      </View>
      
      <ScrollView style={styles.list}>
          {/* TAX SETTINGS SECTION */}
          <Text style={styles.sectionTitle}>TAX CONFIGURATION</Text>
          
          <View style={styles.item}>
            <View style={styles.itemIcon}>
              <Feather name="percent" size={20} color="#f97316" />
            </View>
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>Enable GST</Text>
              <Text style={styles.itemSubtitle}>Apply tax to all transactions</Text>
            </View>
            <Switch 
              value={gstEnabled} 
              onValueChange={toggleGst}
              trackColor={{ false: '#e2e8f0', true: '#f97316' }}
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

          {/* BILLING PREFERENCES SECTION */}
          <View style={{ height: 10 }} />
          <Text style={styles.sectionTitle}>BILLING ACTIONS</Text>

          <View style={styles.item}>
            <View style={styles.itemIcon}>
              <Feather name="zap" size={20} color="#f97316" />
            </View>
            <View style={styles.itemMeta}>
              <Text style={styles.itemTitle}>Auto-Print Receipt</Text>
              <Text style={styles.itemSubtitle}>Automatically print after save</Text>
            </View>
            <Switch 
              value={autoPrint} 
              onValueChange={toggleAutoPrint}
              trackColor={{ false: '#e2e8f0', true: '#f97316' }}
            />
          </View>

          <View style={styles.detailsCard}>
            <Text style={[styles.inputLabel, { marginBottom: 12 }]}>After Save Action</Text>
            <View style={styles.typeSelectorRow}>
                <TouchableOpacity 
                    style={[styles.typeBtn, afterSaveAction === 'back' && styles.typeBtnActive]}
                    onPress={() => updateSaveAction('back')}
                >
                    <Text style={[styles.typeBtnText, afterSaveAction === 'back' && styles.typeBtnTextActive]}>Back to Menu</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.typeBtn, afterSaveAction === 'stay' && styles.typeBtnActive]}
                    onPress={() => updateSaveAction('stay')}
                >
                    <Text style={[styles.typeBtnText, afterSaveAction === 'stay' && styles.typeBtnTextActive]}>New Bill</Text>
                </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 20 }} />
          <Text style={styles.sectionTitle}>SYSTEM SETTINGS</Text>

          {settingsItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.item}
              onPress={item.onPress}
            >
              <View style={styles.itemIcon}>
                <Feather name={item.icon} size={20} color="#f97316" />
              </View>
              <View style={styles.itemMeta}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
       </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingBottom: 20, paddingTop: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  list: { padding: 20 },
  sectionTitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12, marginLeft: 5, textTransform: 'uppercase' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  itemMeta: { flex: 1, marginLeft: 15 },
  itemTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  itemSubtitle: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 1 },
  
  detailsCard: { backgroundColor: '#fff', padding: 18, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#475569' },
  percentageInput: { backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', width: 55, textAlign: 'center', fontWeight: '900', color: '#0f172a' },
  typeSelectorRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  typeBtnActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  typeBtnText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  typeBtnTextActive: { color: '#fff' },
});

export default Settings;