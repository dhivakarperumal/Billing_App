import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import BarcodeMask from 'react-native-barcode-mask';
import { SafeAreaView } from 'react-native-safe-area-context';

const ScannerContent = ({ requestPermission, hasPermission, navigation }: any) => {
  const device = useCameraDevice('back');
  const [active, setActive] = useState(true);

  const onCodeScanned = useCallback((codes: any[]) => {
    if (codes.length > 0 && active) {
      const value = codes[0].value;
      setActive(false);
      navigation.navigate('CreateBilling', { barcode: value });
      setTimeout(() => setActive(true), 1500);
    }
  }, [active, navigation]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'upc-a', 'code-128'],
    onCodeScanned: onCodeScanned,
  });

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.center}>
        <Feather name="camera-off" size={48} color="#94a3b8" />
        <Text style={styles.errorText}>Camera access denied.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Access</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (device === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E11D48" />
        <Text style={styles.loadingText}>Searching for Lens...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={active}
        codeScanner={codeScanner}
      />
      <BarcodeMask 
        edgeColor="#E11D48" 
        showAnimatedLine={true} 
        width={280} 
        height={280} 
      />

      {/* Overlay UI */}
       <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Product</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.instruction}>Align the barcode or QR code within the frame</Text>
        <TouchableOpacity onPress={() => setActive(!active)} style={styles.toggleButton}>
           <Feather name={active ? "pause" : "play"} size={20} color="white" />
           <Text style={styles.toggleText}>{active ? "Pause Scanner" : "Resume Scanner"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ScannerScreen = () => {
  const navigation = useNavigation<any>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [nativeModuleReady, setNativeModuleReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Small delay or check for the internal Proxy
       try {
          await requestPermission();
          setNativeModuleReady(true);
       } catch (e) {
          console.error("Native Module Fail:", e);
       }
    })();
  }, [requestPermission]);

  if (!nativeModuleReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E11D48" />
        <Text style={styles.loadingText}>Calibrating Vision Module...</Text>
        <Text style={styles.errorText}>If this takes too long, please rebuild the app.</Text>
      </View>
    );
  }

  return <ScannerContent 
            hasPermission={hasPermission} 
            requestPermission={requestPermission} 
            navigation={navigation} 
          />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  instruction: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 10,
  },
  toggleText: {
    color: 'white',
    fontWeight: '900',
    marginLeft: 10,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorText: {
     marginTop: 12,
     color: '#64748b',
     fontSize: 14,
     fontWeight: 'bold',
     marginBottom: 20
  },
  loadingText: {
     marginTop: 12,
     color: '#E11D48',
     fontSize: 10,
     fontWeight: 'black',
     letterSpacing: 2,
     textTransform: 'uppercase'
  },
  button: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ScannerScreen;
