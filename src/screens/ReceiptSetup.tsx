import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Feather from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Switch, Image } from 'react-native';
import Toast from 'react-native-toast-message';

const HEADER_GRADIENT = ['#2563eb', '#3b82f6'];

const ReceiptSetup = () => {
    const navigation = useNavigation();
    const [storeName, setStoreName] = useState('');
    const [tagline, setTagline] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [gstNumber, setGstNumber] = useState('');
    const [footerMessage, setFooterMessage] = useState('Thank You! Visit Again.');
    const [showLogo, setShowLogo] = useState(false);
    const [logoBase64, setLogoBase64] = useState('');
    const [upiId, setUpiId] = useState('');
    const [showQRCode, setShowQRCode] = useState(false);

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
                if (data.showLogo !== undefined) setShowLogo(data.showLogo);
                if (data.logoBase64) setLogoBase64(data.logoBase64);
                if (data.upiId) setUpiId(data.upiId);
                if (data.showQRCode !== undefined) setShowQRCode(data.showQRCode);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectLogo = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            includeBase64: true,
            maxWidth: 300,
            maxHeight: 300,
        });

        if (result.assets && result.assets[0].base64) {
            setLogoBase64(result.assets[0].base64);
            setShowLogo(true);
        }
    };

    const saveData = async () => {
        if (!storeName.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Required',
                text2: 'Store Name is required for receipt headers.'
            });
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
                showLogo,
                logoBase64,
                upiId: upiId.trim(),
                showQRCode,
            };
            await AsyncStorage.setItem('business_info', JSON.stringify(data));
            Toast.show({
                type: 'success',
                text1: 'Saved',
                text2: 'Receipt & Business Info saved successfully. Check the preview below!'
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to save configuration.'
            });
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

                {/* Logo Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Branding & logo</Text>
                </View>

                <View style={styles.switchRow}>
                    <View>
                        <Text style={styles.switchLabel}>Print Logo on Receipt</Text>
                        <Text style={styles.switchSubLabel}>Show your business logo at the top</Text>
                    </View>
                    <Switch
                        value={showLogo}
                        onValueChange={setShowLogo}
                        trackColor={{ false: "#cbd5e1", true: "#fdba74" }}
                        thumbColor={showLogo ? "#f97316" : "#f4f4f5"}
                    />
                </View>

                {showLogo && (
                    <View style={styles.logoContainer}>
                        {logoBase64 ? (
                            <Image source={{ uri: `data:image/png;base64,${logoBase64}` }} style={styles.logoPreview} />
                        ) : (
                            <View style={styles.logoPlaceholder}>
                                <Feather name="image" size={30} color="#cbd5e1" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.uploadBtn} onPress={handleSelectLogo}>
                            <Feather name="upload" size={16} color="#fff" />
                            <Text style={styles.uploadBtnTxt}>{logoBase64 ? 'Change Logo' : 'Upload Logo'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* UPI Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Payments & QR Code</Text>
                </View>

                <View style={[styles.formGroup, { marginTop: 10 }]}>
                    <Text style={styles.label}>UPI ID for Payments</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. merchant@upi"
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.switchRow}>
                    <View>
                        <Text style={styles.switchLabel}>Generate Payment QR</Text>
                        <Text style={styles.switchSubLabel}>Print a UPI QR code at the bottom</Text>
                    </View>
                    <Switch
                        value={showQRCode}
                        onValueChange={setShowQRCode}
                        trackColor={{ false: "#cbd5e1", true: "#fdba74" }}
                        thumbColor={showQRCode ? "#f97316" : "#f4f4f5"}
                    />
                </View>

                {showQRCode && upiId !== '' && (
                    <View style={styles.qrContainer}>
                        <Image
                            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${storeName}&am=10.00&cu=INR`)}` }}
                            style={styles.qrPreview}
                        />
                        <Text style={styles.qrLabel}>UPI Payment QR Preview</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={saveData}>
                    <Text style={styles.saveBtnTxt}>SAVE RECEIPT PRINTER SETUP</Text>
                </TouchableOpacity>

                {/* Receipt Preview Section */}
                <View style={[styles.sectionHeader, { marginTop: 40 }]}>
                    <Text style={styles.sectionTitle}>Digital Receipt Preview</Text>
                </View>

                <View style={styles.previewContainer}>
                    <View style={styles.receiptPaper}>
                        {/* Header */}
                        <View style={styles.previewHeader}>
                            {showLogo && logoBase64 && (
                                <Image source={{ uri: `data:image/png;base64,${logoBase64}` }} style={styles.previewLogo} />
                            )}
                            <Text style={styles.previewStoreName}>{storeName || 'YOUR STORE NAME'}</Text>
                            {tagline ? <Text style={styles.previewTagline}>{tagline}</Text> : null}
                            {address ? <Text style={styles.previewAddress}>{address}</Text> : null}
                            {phone ? <Text style={styles.previewAddress}>Ph: {phone}</Text> : null}
                            {gstNumber ? <Text style={styles.previewAddress}>GSTIN: {gstNumber}</Text> : null}
                        </View>

                        <View style={styles.receiptDivider} />

                        {/* Sample Items */}
                        <View style={styles.previewBody}>
                            <View style={styles.previewRow}>
                                <Text style={styles.previewItem}>Sample Item 1</Text>
                                <Text style={styles.previewPrice}>₹100.00</Text>
                            </View>
                            <View style={styles.previewRow}>
                                <Text style={styles.previewItem}>Sample Item 2</Text>
                                <Text style={styles.previewPrice}>₹250.00</Text>
                            </View>
                        </View>

                        <View style={styles.receiptDivider} />

                        {/* Total */}
                        <View style={styles.previewTotalRow}>
                            <Text style={styles.previewTotalLabel}>TOTAL</Text>
                            <Text style={styles.previewTotalValue}>₹350.00</Text>
                        </View>

                        <View style={styles.receiptDivider} />

                        {/* Payment QR */}
                        {showQRCode && upiId !== '' && (
                            <View style={styles.previewQRSection}>
                                <Text style={styles.previewQRText}>Scan to Pay</Text>
                                <Image
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${storeName}&am=350.00&cu=INR`)}` }}
                                    style={styles.previewQRImage}
                                />
                                <Text style={styles.previewUPI}>{upiId}</Text>
                            </View>
                        )}

                        {/* Footer */}
                        <View style={styles.previewFooter}>
                            <Text style={styles.previewFooterMsg}>{footerMessage}</Text>
                            <Text style={styles.previewWatermark}>Generated by BillApp</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5ff' },

    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },

    headerRow: { flexDirection: 'row', alignItems: 'center' },

    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },

    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900'
    },

    content: { padding: 20 },

    // 🔵 INFO CARD
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 15,
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        marginBottom: 25
    },

    warningText: {
        flex: 1,
        color: '#1e3a8a',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 18
    },

    formGroup: { marginBottom: 20 },

    label: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8
    },

    // 🔵 INPUT
    input: {
        backgroundColor: '#ffffff',
        height: 50,
        borderRadius: 14,
        paddingHorizontal: 15,
        fontSize: 14,
        fontWeight: '700',
        color: '#1e3a8a',
        borderWidth: 1,
        borderColor: '#bfdbfe'
    },

    textArea: {
        height: 90,
        paddingTop: 15,
        textAlignVertical: 'top'
    },

    // 🔵 SAVE BUTTON
    saveBtn: {
        backgroundColor: '#2563eb',
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        shadowColor: '#2563eb',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5
    },

    saveBtnTxt: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1
    },

    // 🔵 SECTION
    sectionHeader: {
        marginTop: 30,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e7ff',
        paddingBottom: 8
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#2563eb',
        textTransform: 'uppercase',
        letterSpacing: 1
    },

    // 🔵 SWITCH CARD
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e7ff'
    },

    switchLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1e3a8a'
    },

    switchSubLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 2
    },

    // 🔵 LOGO
    logoContainer: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e7ff',
        marginBottom: 20
    },

    logoPreview: {
        width: 100,
        height: 100,
        borderRadius: 12,
        marginBottom: 15,
        resizeMode: 'contain'
    },

    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#f1f5ff',
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#bfdbfe'
    },

    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10
    },

    uploadBtnTxt: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800'
    },

    // 🔵 QR
    qrContainer: {
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 16,
        borderStyle: 'dotted',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        marginBottom: 20
    },

    qrPreview: {
        width: 140,
        height: 140,
        marginBottom: 10
    },

    qrLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase'
    },

    // 🔵 PREVIEW
    previewContainer: {
        alignItems: 'center',
        marginTop: 10
    },

    receiptPaper: {
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: 300,
        padding: 20,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e0e7ff',
        shadowColor: '#2563eb',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },

    previewHeader: {
        alignItems: 'center',
        marginBottom: 15
    },

    previewLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 10,
        resizeMode: 'contain'
    },

    previewStoreName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1e3a8a',
        textAlign: 'center'
    },

    previewTagline: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        textAlign: 'center',
        marginTop: 2
    },

    previewAddress: {
        fontSize: 9,
        fontWeight: '600',
        color: '#64748b',
        textAlign: 'center',
        marginTop: 2
    },

    receiptDivider: {
        height: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e7ff',
        borderStyle: 'dashed',
        marginVertical: 12
    },

    previewBody: { gap: 8 },

    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },

    previewItem: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1e3a8a'
    },

    previewPrice: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1e3a8a'
    },

    previewTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },

    previewTotalLabel: {
        fontSize: 13,
        fontWeight: '900',
        color: '#1e3a8a'
    },

    previewTotalValue: {
        fontSize: 15,
        fontWeight: '900',
        color: '#2563eb' // 🔵 changed from orange
    },

    previewQRSection: {
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 10
    },

    previewQRText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        marginBottom: 8,
        textTransform: 'uppercase'
    },

    previewQRImage: {
        width: 100,
        height: 100
    },

    previewUPI: {
        fontSize: 8,
        color: '#94a3b8',
        marginTop: 5
    },

    previewFooter: {
        alignItems: 'center',
        marginTop: 15
    },

    previewFooterMsg: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1e3a8a',
        textAlign: 'center'
    },

    previewWatermark: {
        fontSize: 8,
        fontWeight: '600',
        color: '#c7d2fe',
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
});

export default ReceiptSetup;
