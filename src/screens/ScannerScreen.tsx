import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, StatusBar, Dimensions, Animated, Easing, Platform } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const ScannerScreen = () => {
    const navigation = useNavigation<any>();
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    const [isActive, setIsActive] = useState(true);
    const [scannedOnce, setScannedOnce] = useState(false);
    
    // Animation for scanning line
    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isActive && hasPermission) {
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

    const onCodeScanned = useCallback((codes: any[]) => {
        if (codes.length > 0 && isActive && !scannedOnce) {
            setScannedOnce(true);
            const value = codes[0].value;
            console.log("Scanned Barcode:", value);
            
            // Navigate back immediately with results
            setIsActive(false);
            navigation.navigate('CreateBilling', { barcode: String(value).trim() });
            
            // Allow re-scanning after a delay if they come back
            setTimeout(() => {
                setScannedOnce(false);
                setIsActive(true);
            }, 2000);
        }
    }, [isActive, scannedOnce, navigation]);

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13', 'upc-a', 'code-128', 'ean-8', 'upc-e'],
        onCodeScanned: onCodeScanned,
    });

    if (!hasPermission) {
        return (
            <SafeAreaView style={styles.center}>
                <View style={styles.permissionIcon}><Feather name="camera-off" size={40} color="#E11D48" /></View>
                <Text style={styles.errorTitle}>LENS BLOCKED</Text>
                <Text style={styles.errorText}>Inventory authentication requires camera access to scan assets.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Text style={styles.primaryBtnTxt}>REQUEST ACCESS</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!device) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#E11D48" size="large" />
                <Text style={styles.loadingText}>CALIBRATING OPTICS...</Text>
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
                pixelFormat="yuv"
                video={false}
                photo={false}
                onError={(error) => {
                    console.error("Camera Error Prop:", error);
                    Alert.alert("Optical Engine Error", "Failed to initialize camera session. Please ensure no other app is using the camera.");
                }}
            />

            {/* Premium Overlay UI */}
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={20} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleWrap}>
                        <Text style={styles.headerTitle}>Lens.Scanner<Text style={{ color: '#E11D48' }}>.</Text></Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {/* Viewfinder Frame */}
                <View style={styles.viewfinderContainer}>
                    <View style={styles.viewfinderFrame}>
                        {/* Corners */}
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                        
                        {/* Scanning Line */}
                        <Animated.View 
                            style={[
                                styles.scanLine, 
                                { transform: [{ translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }] }
                            ]} 
                        />
                    </View>
                </View>

                {/* Footer Controls */}
                <View style={styles.footer}>
                    <Text style={styles.instruction}>Align barcode inside the matrix frame</Text>
                    <TouchableOpacity 
                        onPress={() => setIsActive(!isActive)}
                        style={[styles.actionBtn, !isActive && { backgroundColor: '#E11D48' }]}
                    >
                        <Feather name={isActive ? "pause" : "play"} size={18} color="white" />
                        <Text style={styles.actionTxt}>{isActive ? "Pause Terminal" : "Resume Lens"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Dark Mask Sections */}
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
    loadingText: { marginTop: 15, fontSize: 10, color: '#E11D48', fontWeight: '900', letterSpacing: 2 },
    permissionIcon: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    errorTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
    errorText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
    primaryBtn: { backgroundColor: '#0f172a', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20 },
    primaryBtnTxt: { color: 'white', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    
    /* OVERLAY */
    overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, zIndex: 100 },
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
    scanLine: { width: '100%', height: 3, backgroundColor: 'rgba(249, 115, 22, 0.8)', borderWidth: 1, shadowColor: '#f97316', shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
    
    footer: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
    instruction: { color: '#ffffffcc', fontSize: 11, fontWeight: '800', marginBottom: 25, letterSpacing: 0.5, backgroundColor: 'rgba(15,23,42,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 20, gap: 12 },
    actionTxt: { color: 'white', fontWeight: '900', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },

    /* MASK */
    mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)' },
    maskTop: { top: 0, left: 0, right: 0, height: (height - 280) / 2 },
    maskBottom: { bottom: 0, left: 0, right: 0, height: (height - 280) / 2 },
    maskLeft: { top: (height - 280) / 2, left: 0, width: (width - 280) / 2, height: 280 },
    maskRight: { top: (height - 280) / 2, right: 0, width: (width - 280) / 2, height: 280 }
});

export default ScannerScreen;
