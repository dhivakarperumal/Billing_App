import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

import Home from '../screens/Home';
import Bills from '../screens/Bills';
import Customers from '../screens/Customers';
import Products from '../screens/Products';
import Settings from '../screens/Settings';

const Tab = createBottomTabNavigator();

const CreateBillPlaceholder = () => (
  <View style={{ flex: 1, backgroundColor: '#f8f9fa' }} />
);

// ─── Constants ──────────────────────────────────────────
const PRIMARY_GRADIENT = ['#f97316', '#ea580c']; // Orange
const HEADER_GRADIENT = ['#0f172a', '#1e293b']; // Dark Blueish
const ACTIVE_COLOR = '#f97316';
const INACTIVE_COLOR = '#94a3b8';

// ─── Header Components ─────────────────────────────────
function HeaderBackground() {
  return (
    <LinearGradient
      colors={HEADER_GRADIENT}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    />
  );
}

function HeaderRight({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = React.useState(false);

  const handleLogout = () => {
    setShowMenu(false);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!user) return null;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.headerRightContainer}>
      {/* Avatar Click */}
      <TouchableOpacity
        onPress={() => setShowMenu(prev => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </TouchableOpacity>

      {/* Dropdown */}
      {showMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              Alert.alert('Profile', 'Profile screen coming soon');
            }}
          >
            <Icon name="user" size={14} color="#0f172a" />
            <Text style={styles.dropdownText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              navigation.navigate('Settings');
            }}
          >
            <Icon name="cog" size={14} color="#0f172a" />
            <Text style={styles.dropdownText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
            <Icon name="sign-out-alt" size={14} color="#ef4444" />
            <Text style={[styles.dropdownText, { color: '#ef4444' }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Custom Tab Bar (Floating Island Style) ──────────────
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [showQuickActions, setShowQuickActions] = React.useState(false);

  const iconMap: Record<string, string> = {
    Home: 'grip-horizontal',
    Bills: 'receipt',
    CreateBill: 'plus',
    Products: 'boxes',
    Settings: 'sliders-h',
  };

  const labelMap: Record<string, string> = {
    Home: 'Dash',
    Bills: 'Bills',
    CreateBill: 'New',
    Products: 'Items',
    Settings: 'Menu',
  };

  const QuickBtn = ({ icon, label, colors, onPress }: any) => (
    <TouchableOpacity
      onPress={() => {
        setShowQuickActions(false);
        onPress();
      }}
      style={styles.qaItem}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={colors}
        style={styles.qaIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon name={icon} size={22} color="#fff" />
      </LinearGradient>
      <Text style={styles.qaLabelText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* QUICK ACTIONS MODAL-LIKE OVERLAY */}
      {showQuickActions && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowQuickActions(false)}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalPill} />
            <Text style={styles.modalTitle}>
              Quick Actions<Text style={{ color: ACTIVE_COLOR }}>.</Text>
            </Text>

            <View style={styles.qaGrid}>
              <QuickBtn
                icon="microphone-alt"
                label="Voice Bill"
                colors={['#6366f1', '#4f46e5']}
                onPress={() => navigation.navigate('CreateBilling')}
              />
              <QuickBtn
                icon="expand"
                label="Quick Scan"
                colors={['#10b981', '#059669']}
                onPress={() => navigation.navigate('ScannerScreen')}
              />
              <QuickBtn
                icon="file-signature"
                label="Manual"
                colors={['#f59e0b', '#d97706']}
                onPress={() => navigation.navigate('CreateBilling')}
              />
              <QuickBtn
                icon="ellipsis-h"
                label="Reports"
                colors={['#64748b', '#475569']}
                onPress={() =>
                  Alert.alert(
                    'Coming Soon',
                    'Detailed reports feature arriving soon.',
                  )
                }
              />
            </View>

            <TouchableOpacity
              onPress={() => setShowQuickActions(false)}
              style={styles.modalCloseBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseTxt}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FLOATING TAB BAR ISLAND */}
      <View
        style={[styles.tabBarWrapper, { bottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.tabBarIsland}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];

            const onPress = () => {
              if (route.name === 'CreateBill') {
                setShowQuickActions(true);
              } else if (!isFocused) {
                navigation.navigate(route.name);
              }
            };

            // CENTER FAB
            if (route.name === 'CreateBill') {
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  style={styles.fabOuter}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={PRIMARY_GRADIENT}
                    style={styles.fabInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon name="plus" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <View style={styles.tabIconBox}>
                  <Icon
                    name={iconMap[route.name]}
                    size={isFocused ? 18 : 17}
                    color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
                    solid={isFocused}
                  />
                  {isFocused && <View style={styles.activeDot} />}
                </View>
                <Text
                  style={[
                    styles.tabLabelText,
                    isFocused && styles.tabLabelActive,
                  ]}
                >
                  {labelMap[route.name]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

// ─── Navigator Configuration ────────────────────────────
export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerBackground: () => <HeaderBackground />,
        headerTintColor: '#fff',
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 18,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        headerRight: ({ navigation }) => (
          <HeaderRight navigation={navigation} />
        ),
        headerStyle: {
          height: Platform.OS === 'ios' ? 110 : 80,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="Bills"
        component={Bills}
        options={{ title: 'Billing' }}
      />
      <Tab.Screen
        name="CreateBill"
        component={CreateBillPlaceholder}
        options={{ title: 'Create' }}
      />
      <Tab.Screen
        name="Products"
        component={Products}
        options={{ title: 'Inventory' }}
      />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  /* HEADER */
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 8,
  },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    gap: 4,
  },
  logoutText: {
    color: '#fb7185',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  /* TAB BAR */
  tabBarWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
  },
  tabBarIsland: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 28,
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
    marginTop: 2,
  },
  tabLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: INACTIVE_COLOR,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: ACTIVE_COLOR,
  },

  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    width: 140,
    borderWidth: 1,
    borderColor: '#e2e8f0',

    ...Platform.select({
      android: { elevation: 10 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },

  dropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* FAB */
  fabOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff', // outer ring color if needed
    marginTop: -35,
    padding: 4,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: ACTIVE_COLOR,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
    }),
  },
  fabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* MODAL / QUICK ACTIONS */
  modalOverlay: {
    zIndex: 1000,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalPill: {
    width: 40,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  qaItem: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  qaIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qaLabelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
