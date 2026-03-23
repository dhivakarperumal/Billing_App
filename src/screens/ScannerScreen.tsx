import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, StatusBar, Dimensions, Animated, Easing, Platform } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const ScannerScreen = () => {
    const navigation = useNavigation<any>();
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    
    // States
    const [isActive, setIsActive] = useState(true);
    const [scannedOnce, setScannedOnce] = useState(false);
    const [isMultiScan, setIsMultiScan] = useState(false);
    const [scannedCount, setScannedCount] = useState(0);
    const [lastScanned, setLastScanned] = useState<string>('');
    const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
    
    // Animation
    const scanAnim = useRef(new Animated.Value(0)).current;

    // Handlers
    const onCodeScanned = useCallback((codes: any[]) => {
        if (codes.length > 0 && isActive && !scannedOnce) {
            const value = String(codes[0].value).trim();
            if (value === lastScanned && isMultiScan) return;

            setScannedOnce(true);
            setLastScanned(value);
            
            if (isMultiScan) {
                setScannedCount(prev => prev + 1);
                setScannedBarcodes(prev => [...prev, value]);
                // Visual feedback only, stay in scanner
                setTimeout(() => setScannedOnce(false), 1200);
            } else {
                setIsActive(false);
                navigation.navigate('CreateBilling', { barcode: value });
                setTimeout(() => setScannedOnce(false), 2000);
            }
        }
    }, [isActive, scannedOnce, isMultiScan, lastScanned, navigation]);

    const handleFinishBatch = () => {
        setIsActive(false);
        navigation.navigate('CreateBilling', { barcodes: scannedBarcodes });
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13', 'upc-a', 'code-128', 'ean-8', 'upc-e', 'code-39'],
        onCodeScanned: onCodeScanned,
    });

    useEffect(() => {
        if (hasPermission && isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(scanAnim, { toValue: 0, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
                ])
            ).start();
        } else {
            scanAnim.stopAnimation();
        }
    }, [isActive, hasPermission]);

    useEffect(() => {
        if (!hasPermission) requestPermission();
    }, [hasPermission]);

    // Conditional Returns
    if (!hasPermission) {
        return (
            <SafeAreaView style={styles.center}>
                <View style={styles.permissionIcon}><Feather name="camera-off" size={40} color="#E11D48" /></View>
                <Text style={styles.errorTitle}>LENS BLOCKED</Text>
                <Text style={styles.errorText}>Camera access is required to scan products.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Text style={styles.primaryBtnTxt}>ALLOW CAMERA</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!device) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#f97316" size="large" />
                <Text style={styles.loadingText}>STARTING OPTICS...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                codeScanner={codeScanner}
                onError={(err) => console.log("Camera Error:", err)}
            />

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={20} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Text style={styles.headerTitle}>Lens.Scanner<Text style={{ color: '#f97316' }}>.</Text></Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => {
                            setIsMultiScan(!isMultiScan);
                            setScannedCount(0);
                            setScannedBarcodes([]);
                        }} 
                        style={[styles.multiBtn, isMultiScan && styles.multiBtnActive]}
                    >
                        <Feather name="layers" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.viewfinderContainer}>
                    <View style={styles.viewfinderFrame}>
                        <View style={[styles.corner, styles.cornerTL, isMultiScan && { borderColor: '#10b981' }]} />
                        <View style={[styles.corner, styles.cornerTR, isMultiScan && { borderColor: '#10b981' }]} />
                        <View style={[styles.corner, styles.cornerBL, isMultiScan && { borderColor: '#10b981' }]} />
                        <View style={[styles.corner, styles.cornerBR, isMultiScan && { borderColor: '#10b981' }]} />
                        
                        <Animated.View 
                            style={[
                                styles.scanLine, 
                                isMultiScan && { backgroundColor: '#10b981', shadowColor: '#10b981' },
                                { transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }] }
                            ]} 
                        />
                    </View>
                    {isMultiScan && scannedCount > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{scannedCount} PRODUCTS IN BATCH</Text>
                        </View>
                    )}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.instruction}>
                        {isMultiScan ? "Continuous Scanning Enabled" : "Align barcode inside the frame"}
                    </Text>
                    
                    <View style={styles.footerRow}>
                        <TouchableOpacity onPress={() => setIsActive(!isActive)} style={styles.actionBtn}>
                            <Feather name={isActive ? "pause" : "play"} size={18} color="white" />
                        </TouchableOpacity>

                        {isMultiScan ? (
                            <TouchableOpacity onPress={handleFinishBatch} style={styles.completeBtn}>
                                <Text style={styles.completeBtnTxt}>FINISH BATCH</Text>
                                <Feather name="check" size={18} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => setIsMultiScan(true)} style={styles.modeBtn}>
                                <Text style={styles.modeBtnTxt}>MULTI-SCAN</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={[styles.mask, styles.maskTop]} />
                <View style={[styles.mask, styles.maskBottom]} />
                <View style={[styles.mask, styles.maskLeft]} />
                <View style={[styles.mask, styles.maskRight]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    center: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingText: { marginTop: 15, fontSize: 10, color: '#f97316', fontWeight: '900', letterSpacing: 2 },
    permissionIcon: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    errorTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
    errorText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
    primaryBtn: { backgroundColor: '#0f172a', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20 },
    primaryBtnTxt: { color: 'white', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, zIndex: 100 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    titleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    viewfinderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
    viewfinderFrame: { width: 280, height: 280, borderRadius: 30, overflow: 'hidden', zIndex: 50 },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: '#f97316', borderWidth: 5 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 25 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 25 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 25 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 25 },
    scanLine: { width: '100%', height: 3, backgroundColor: '#f97316', shadowColor: '#f97316', shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
    footer: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
    instruction: { color: '#ffffffcc', fontSize: 10, fontWeight: '800', marginBottom: 25, letterSpacing: 0.5, backgroundColor: 'rgba(15,23,42,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    actionBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    modeBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 20 },
    modeBtnTxt: { color: 'white', fontWeight: '900', fontSize: 11 },
    completeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 20, gap: 10 },
    completeBtnTxt: { color: 'white', fontWeight: '900', fontSize: 11 },
    multiBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    multiBtnActive: { backgroundColor: '#10b981' },
    countBadge: { position: 'absolute', top: -50, backgroundColor: '#10b981', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 },
    countText: { color: 'white', fontSize: 9, fontWeight: '900' },
    mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)' },
    maskTop: { top: 0, left: 0, right: 0, height: (height - 280) / 2 },
    maskBottom: { bottom: 0, left: 0, right: 0, height: (height - 280) / 2 },
    maskLeft: { top: (height - 280) / 2, left: 0, width: (width - 280) / 2, height: 280 },
    maskRight: { top: (height - 280) / 2, right: 0, width: (width - 280) / 2, height: 280 }
});

export default ScannerScreen;
