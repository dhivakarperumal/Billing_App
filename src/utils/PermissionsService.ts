import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * Universal Permission Handler
 * Requests Camera, Location, Bluetooth, and Storage permissions
 */
export const requestAppPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ];

    // For Android 13+ (API 33), storage permissions have changed 
    if (Platform.Version >= 33) {
      // In API 33+, READ_EXTERNAL_STORAGE is deprecated for granular media permissions
      // However, for simplicity and user request, we'll try to request what's applicable
    }

    const granted = await PermissionsAndroid.requestMultiple(permissions);

    const allGranted = Object.values(granted).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      console.log('Some permissions were denied:', granted);
      // Optional: Inform user that some features might not work
    }

    return granted;
  } catch (err) {
    console.warn('Permission Request Error:', err);
    return null;
  }
};

/**
 * Check if a specific permission is granted
 */
export const checkPermission = async (permission: any) => {
    return await PermissionsAndroid.check(permission);
};
