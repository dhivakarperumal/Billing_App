import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const HEADER_GRADIENT = ['#0f172a', '#1e293b'];

const ReceiptSetup = () => {
    const navigation = useNavigation();
    const [storeName, setStoreName] = useState('');
    const [tagline, setTagline] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [footerMessage, setFooterMessage] = useState('Thank You! Visit Again.');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const dataStr = await AsyncStorage.getItem('business_info');
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.storeName) setStoreName(data.storeName);
                if (data.tagline) setTagline(data.tagline);
                if (data.phone) setPhone(data.phone);
                if (data.address) setAddress(data.address);
                if (data.gstNumber) setGstNumber(data.gstNumber);
                if (data.footerMessage) setFooterMessage(data.footerMessage);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const saveData = async () => {
        if (!storeName.trim()) {
            Alert.alert('Required', 'Store Name is required for receipt headers.');
            return;
        }

        try {
            const data = {
                storeName: storeName.trim(),
                tagline: tagline.trim(),
                phone: phone.trim(),
                address: address.trim(),
                gstNumber: gstNumber.trim(),
                footerMessage: footerMessage.trim() || 'Thank You! Visit Again.',
            };
            await AsyncStorage.setItem('business_info', JSON.stringify(data));
            Alert.alert('Saved', 'Receipt & Business Info saved successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to save configuration.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={HEADER_GRADIENT} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>Receipt Setup<Text style={{ color: '#f97316' }}>.</Text></Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.warningCard}>
                    <Feather name="info" size={20} color="#0ea5e9" />
                    <Text style={styles.warningText}>
                        This information will be printed on the header and footer of your thermal receipts.
                    </Text>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Store Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Super Mart"
                        value={storeName}
                        onChangeText={setStoreName}
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Tagline (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Quality you can trust"
                        value={tagline}
                        onChangeText={setTagline}
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Store Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. +91 9876543210"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Store Address</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g. 123 Main Street, City"
                        value={address}
                        onChangeText={setAddress}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>GST Number (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        value={gstNumber}
                        onChangeText={setGstNumber}
                        autoCapitalize="characters"
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Footer Message</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Thank You! Visit Again."
                        value={footerMessage}
                        onChangeText={setFooterMessage}
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={saveData}>
                    <Text style={styles.saveBtnTxt}>SAVE RECEIPT PRINTER SETUP</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    content: { padding: 20 },
    warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: '#f0f9ff', borderRadius: 16, borderWidth: 1, borderColor: '#bae6fd', marginBottom: 25 },
    warningText: { flex: 1, color: '#0369a1', fontSize: 12, fontWeight: '700', lineHeight: 18 },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    input: { backgroundColor: '#fff', height: 50, borderRadius: 14, paddingHorizontal: 15, fontSize: 14, fontWeight: '700', color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
    textArea: { height: 90, paddingTop: 15, textAlignVertical: 'top' },
    saveBtn: { backgroundColor: '#f97316', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
    saveBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});

export default ReceiptSetup;
