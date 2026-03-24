import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
    StatusBar, Dimensions, Animated, Easing, Modal
} from 'react-native';
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
    const [isMultiScan, setIsMultiScan] = useState(false);
    const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);

    // Custom popup state
    const [popup, setPopup] = useState<{ visible: boolean; barcode: string; count: number }>({
        visible: false, barcode: '', count: 0
    });
    const popupAnim = useRef(new Animated.Value(0)).current;

    // Refs to avoid stale closures
    const lastScanRef = useRef<{ value: string; time: number }>({ value: '', time: 0 });
    const isMultiScanRef = useRef(isMultiScan);
    const isActiveRef = useRef(isActive);
    const barcodesRef = useRef<string[]>([]);

    useEffect(() => { isMultiScanRef.current = isMultiScan; }, [isMultiScan]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
    useEffect(() => { barcodesRef.current = scannedBarcodes; }, [scannedBarcodes]);

    // Scan line animation
    const scanAnim = useRef(new Animated.Value(0)).current;
    const scanLoop = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (hasPermission && isActive) {
            scanLoop.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(scanAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(scanAnim, { toValue: 0, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
                ])
            );
            scanLoop.current.start();
        } else {
            scanLoop.current?.stop();
        }
    }, [isActive, hasPermission]);

    useEffect(() => {
        if (!hasPermission) requestPermission();
    }, [hasPermission]);

    // Show custom popup with animation
    const showPopup = (barcode: string, count: number) => {
        setPopup({ visible: true, barcode, count });
        popupAnim.setValue(0);
        Animated.spring(popupAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 8,
        }).start();
    };

    const dismissPopup = (resumeCamera: boolean) => {
        Animated.timing(popupAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => {
            setPopup({ visible: false, barcode: '', count: 0 });
            if (resumeCamera) {
                isActiveRef.current = true;
                setIsActive(true);
            }
        });
    };

    const onCodeScanned = useCallback((codes: any[]) => {
        if (codes.length === 0 || !isActiveRef.current) return;
        const value = String(codes[0].value).trim();
        const now = Date.now();
        if (value === lastScanRef.current.value && now - lastScanRef.current.time < 1500) return;
        lastScanRef.current = { value, time: now };

        // Pause camera & show popup
        isActiveRef.current = false;
        setIsActive(false);

        setScannedBarcodes(prev => {
            const updated = [...prev, value];
            barcodesRef.current = updated;
            showPopup(value, updated.length);
            return updated;
        });
    }, []);

    const handleFinishBatch = () => {
        dismissPopup(false);
        navigation.navigate('CreateBilling', { barcodes: barcodesRef.current });
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13', 'upc-a', 'code-128', 'ean-8', 'upc-e', 'code-39'],
        onCodeScanned,
    });

    const scannedCount = scannedBarcodes.length;

    // ─── Permission screen ──────────────────────────────────────
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                        <Feather name="arrow-left" size={20} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Text style={styles.headerTitle}>Lens.Scanner<Text style={{ color: '#f97316' }}>.</Text></Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => { setIsMultiScan(!isMultiScan); setScannedBarcodes([]); }}
                        style={[styles.headerBtn, isMultiScan && styles.headerBtnActive]}
                    >
                        <Feather name="layers" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Viewfinder */}
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
                    {scannedCount > 0 && (
                        <View style={[styles.countBadge, isMultiScan && { backgroundColor: '#10b981' }]}>
                            <Feather name="package" size={12} color="white" />
                            <Text style={styles.countText}>{scannedCount} IN BATCH</Text>
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.instruction}>
                        {scannedCount > 0
                            ? `${scannedCount} item(s) scanned`
                            : isMultiScan ? 'Multi-Scan Active' : 'Align barcode inside the frame'}
                    </Text>
                    <View style={styles.footerRow}>
                        <TouchableOpacity onPress={() => { setIsActive(!isActive); isActiveRef.current = !isActiveRef.current; }} style={styles.actionBtn}>
                            <Feather name={isActive ? "pause" : "play"} size={18} color="white" />
                        </TouchableOpacity>
                        {scannedCount > 0 ? (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('CreateBilling', { barcodes: scannedBarcodes })}
                                style={styles.completeBtn}
                            >
                                <Text style={styles.completeBtnTxt}>ADD {scannedCount} TO BILL</Text>
                                <Feather name="check" size={18} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => setIsMultiScan(!isMultiScan)}
                                style={[styles.modeBtn, isMultiScan && { backgroundColor: '#10b981' }]}
                            >
                                <Text style={styles.modeBtnTxt}>{isMultiScan ? '🟢 MULTI-SCAN ON' : 'MULTI-SCAN'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Dark masks */}
                <View style={[styles.mask, styles.maskTop]} />
                <View style={[styles.mask, styles.maskBottom]} />
                <View style={[styles.mask, styles.maskLeft]} />
                <View style={[styles.mask, styles.maskRight]} />
            </View>

            {/* ─── Custom Scan Result Popup ─── */}
            <Modal transparent visible={popup.visible} animationType="none">
                <View style={styles.popupOverlay}>
                    <Animated.View style={[
                        styles.popupCard,
                        {
                            opacity: popupAnim,
                            transform: [{
                                scale: popupAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
                            }]
                        }
                    ]}>
                        {/* Icon */}
                        <View style={styles.popupIconWrap}>
                            <View style={styles.popupIconCircle}>
                                <Feather name="check" size={30} color="#10b981" />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.popupTitle}>Product Scanned!</Text>
                        <Text style={styles.popupSubtitle}>
                            {isMultiScan ? `Batch · ${popup.count} item(s) collected` : 'Barcode captured successfully'}
                        </Text>

                        {/* Barcode pill */}
                        <View style={styles.barcodePill}>
                            <Feather name="maximize" size={12} color="#f97316" />
                            <Text style={styles.barcodeText} numberOfLines={1}>{popup.barcode}</Text>
                        </View>

                        {/* Batch count indicator */}
                        {popup.count > 1 && (
                            <View style={styles.batchRow}>
                                {Array.from({ length: Math.min(popup.count, 5) }).map((_, i) => (
                                    <View key={i} style={[styles.batchDot, i === popup.count - 1 && styles.batchDotActive]} />
                                ))}
                                {popup.count > 5 && <Text style={styles.batchMore}>+{popup.count - 5}</Text>}
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.popupActions}>
                            <TouchableOpacity
                                style={styles.popupBtnSecondary}
                                onPress={() => dismissPopup(true)}
                            >
                                <Feather name="camera" size={14} color="#f97316" />
                                <Text style={styles.popupBtnSecondaryTxt}>Scan Next</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.popupBtnPrimary}
                                onPress={handleFinishBatch}
                            >
                                <Feather name="shopping-cart" size={14} color="white" />
                                <Text style={styles.popupBtnPrimaryTxt}>
                                    {isMultiScan ? 'Finish Batch' : 'Add to Bill'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
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
    headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerBtnActive: { backgroundColor: '#10b981' },
    titleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

    viewfinderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
    viewfinderFrame: { width: 280, height: 280, borderRadius: 30, overflow: 'hidden', zIndex: 50 },
    corner: { position: 'absolute', width: 45, height: 45, borderColor: '#f97316', borderWidth: 5 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 25 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 25 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 25 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 25 },
    scanLine: { width: '100%', height: 3, backgroundColor: '#f97316', shadowColor: '#f97316', shadowOpacity: 1, shadowRadius: 10, elevation: 5 },

    countBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    countText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    footer: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
    instruction: { color: '#ffffffcc', fontSize: 10, fontWeight: '800', marginBottom: 20, letterSpacing: 0.5, backgroundColor: 'rgba(15,23,42,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    actionBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    modeBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 20 },
    modeBtnTxt: { color: 'white', fontWeight: '900', fontSize: 11 },
    completeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 20, gap: 10 },
    completeBtnTxt: { color: 'white', fontWeight: '900', fontSize: 11 },

    mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
    maskTop: { top: 0, left: 0, right: 0, height: (height - 280) / 2 },
    maskBottom: { bottom: 0, left: 0, right: 0, height: (height - 280) / 2 },
    maskLeft: { top: (height - 280) / 2, left: 0, width: (width - 280) / 2, height: 280 },
    maskRight: { top: (height - 280) / 2, right: 0, width: (width - 280) / 2, height: 280 },

    // ─── Custom Popup ──────────────────────────────────────────
    popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
    popupCard: {
        width: width - 40,
        backgroundColor: '#0f172a',
        borderRadius: 32,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
    },
    popupIconWrap: { marginBottom: 16 },
    popupIconCircle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: 'rgba(16,185,129,0.15)',
        borderWidth: 2, borderColor: '#10b981',
        alignItems: 'center', justifyContent: 'center',
    },
    popupTitle: { fontSize: 20, fontWeight: '900', color: 'white', marginBottom: 6 },
    popupSubtitle: { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 20, letterSpacing: 0.5 },
    barcodePill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(249,115,22,0.12)',
        borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 14, marginBottom: 16, maxWidth: '100%',
    },
    barcodeText: { fontSize: 13, fontWeight: '900', color: '#f97316', flex: 1 },
    batchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
    batchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
    batchDotActive: { backgroundColor: '#10b981', width: 20, borderRadius: 4 },
    batchMore: { fontSize: 10, color: '#64748b', fontWeight: '800' },
    popupActions: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 },
    popupBtnSecondary: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 15, borderRadius: 16,
        backgroundColor: 'rgba(249,115,22,0.12)',
        borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
    },
    popupBtnSecondaryTxt: { color: '#f97316', fontWeight: '900', fontSize: 12 },
    popupBtnPrimary: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 15, borderRadius: 16,
        backgroundColor: '#10b981',
    },
    popupBtnPrimaryTxt: { color: 'white', fontWeight: '900', fontSize: 12 },
});

export default ScannerScreen;
