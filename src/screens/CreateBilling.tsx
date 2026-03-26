import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    FlatList, Modal, ActivityIndicator,
    StatusBar, Dimensions, Platform, Image,
    PermissionsAndroid, StyleSheet, NativeModules, DeviceEventEmitter, Animated, Easing
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { fetchProducts, fetchCategories, createBill, Product, Category, BillPayload } from "../api";
import LinearGradient from 'react-native-linear-gradient';
import { printReceipt, PrintData } from "../utils/printer";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { tanglishMatchesTamil } from '../utils/transliterate';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────
const PRIMARY_GRADIENT = ['#2563eb', '#1d4ed8']; // blue
const HEADER_GRADIENT = ['#2563eb', '#1d4ed8']; // blue header
const ACCENT_COLOR = '#2563eb'; // main blue

const CreateBilling = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { token } = useAuth();
    const insets = useSafeAreaInsets();

    const [selectedVariant, setSelectedVariant] = useState<any>(null);

    // Data States
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // UI States
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showCart, setShowCart] = useState(false);
    const [showPostSavePreview, setShowPostSavePreview] = useState(false);
    const [savedPrintData, setSavedPrintData] = useState<PrintData | null>(null);
    const [businessInfo, setBusinessInfo] = useState<any>(null);


    // Form State
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [cart, setCart] = useState<any[]>([]);

    // Tax Config
    const [gstEnabled, setGstEnabled] = useState(false);
    const [gstPercentage, setGstPercentage] = useState(18);
    const [gstType, setGstType] = useState<'inclusive' | 'exclusive'>('exclusive');

    useEffect(() => {
        const loadTaxConfig = async () => {
            try {
                const enabled = await AsyncStorage.getItem('gst_enabled');
                const percentage = await AsyncStorage.getItem('gst_percentage');
                const type = await AsyncStorage.getItem('gst_type');

                setGstEnabled(enabled === 'true');
                if (percentage) setGstPercentage(Number(percentage));
                if (type) setGstType(type as any);
            } catch (e) { }
        };
        const loadBusinessInfo = async () => {
            try {
                const data = await AsyncStorage.getItem('business_info');
                if (data) setBusinessInfo(JSON.parse(data));
            } catch (e) { }
        };
        loadTaxConfig();
        loadBusinessInfo();
    }, []);

    const finalizeUI = async () => {
        try {
            const afterA = await AsyncStorage.getItem('after_save_action') || 'stay';
            if (afterA === 'back') {
                navigation.goBack();
            } else {
                setCart([]);
                setCustomerName("");
                setCustomerPhone("");
                setShowPostSavePreview(false);
            }
        } catch (e) {
            navigation.goBack();
        }
    };

    // ─── Calculations ──────────────────────────────────────────
    const { subtotal, gstAmount, cartTotal } = useMemo(() => {
        const rawSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (!gstEnabled) {
            return { subtotal: rawSum, gstAmount: 0, cartTotal: rawSum };
        }

        if (gstType === 'exclusive') {
            const tax = rawSum * (gstPercentage / 100);
            return { subtotal: rawSum, gstAmount: tax, cartTotal: rawSum + tax };
        } else {
            // Inclusive
            const sub = rawSum / (1 + gstPercentage / 100);
            const tax = rawSum - sub;
            return { subtotal: sub, gstAmount: tax, cartTotal: rawSum };
        }
    }, [cart, gstEnabled, gstPercentage, gstType]);

    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const [voiceLang, setVoiceLang] = useState<'en' | 'ta' | 'tgl'>('en');
    const voiceLangRef = useRef<'en' | 'ta' | 'tgl'>('en');
    useEffect(() => { voiceLangRef.current = voiceLang; }, [voiceLang]);

    const cycleVoiceLang = () => {
        setVoiceLang(prev => prev === 'en' ? 'ta' : prev === 'ta' ? 'tgl' : 'en');
    };

    // ─── Voice Search ──────────────────────────────────────────
    const [isListening, setIsListening] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
    const micAnim = useRef(new Animated.Value(1)).current;
    const micPulse = useRef<Animated.CompositeAnimation | null>(null);

    const startMicPulse = () => {
        micPulse.current = Animated.loop(
            Animated.sequence([
                Animated.timing(micAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
                Animated.timing(micAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
            ])
        );
        micPulse.current.start();
    };

    const stopMicPulse = () => {
        micPulse.current?.stop();
        micAnim.setValue(1);
    };

    const matchVoiceToProduct = (text: string, productList: Product[]) => {
        const q = text.toLowerCase().trim();
        // Exact match: English name, Tamil name, Tanglish name, or Tamil→Tanglish
        let found = productList.find(p =>
            (p.name || '').toLowerCase() === q ||
            (p.name_tamil || '').toLowerCase() === q ||
            (p.name_tanglish || '').toLowerCase() === q ||
            tanglishMatchesTamil(q, p.name_tamil || '')
        );
        // Partial match
        if (!found) {
            found = productList.find(p =>
                (p.name || '').toLowerCase().includes(q) ||
                (p.name_tamil || '').toLowerCase().includes(q) ||
                (p.name_tanglish || '').toLowerCase().includes(q) ||
                tanglishMatchesTamil(q, p.name_tamil || '')
            );
        }
        // Word-level match
        if (!found) {
            const words = q.split(' ').filter(w => w.length > 1);
            found = productList.find(p => words.some(w =>
                (p.name || '').toLowerCase().includes(w) ||
                (p.name_tamil || '').toLowerCase().includes(w) ||
                (p.name_tanglish || '').toLowerCase().includes(w) ||
                tanglishMatchesTamil(w, p.name_tamil || '')
            ));
        }
        return found;
    };

    useEffect(() => {
        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                processVoiceResult(e.value[0]);
            }
        };
        Voice.onSpeechError = (e: SpeechErrorEvent) => {
            console.log('Voice Error: ', e.error);
            setIsListening(false);
            stopMicPulse();
            const errMsg = voiceLang === 'ta' ? 'குரல் பிழை. மீண்டும் முயல்க.' : 'Voice error. Try again.';
            setVoiceStatus(errMsg);
            setTimeout(() => setVoiceStatus(''), 2000);
        };
        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, [voiceLang]);

    const startVoiceSearch = async () => {
        // Request mic permission
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                { title: 'Mic Permission', message: 'Speak to search products', buttonPositive: 'Allow' }
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                Toast.show({
                    type: 'error',
                    text1: 'Permission Denied',
                    text2: 'Microphone access is required',
                });
                return;
            }
        }

        setIsListening(true);
        const listeningMsg = voiceLang === 'ta' ? 'கவனிக்கிறேன்...' : 'Listening...';
        setVoiceStatus(listeningMsg);
        startMicPulse();

        try {
            // Tanglish uses English speech recognition since it's Tamil spoken in English
            const locale = voiceLang === 'ta' ? 'ta-IN' : 'en-IN';
            await Voice.start(locale);
        } catch (e) {
            console.log('Voice Start Fail: ', e);
            setIsListening(false);
            stopMicPulse();
            const failMsg = voiceLang === 'ta' ? 'குரல் தொடங்கவில்லை' : 'Could not start voice';
            setVoiceStatus(failMsg);
            setTimeout(() => setVoiceStatus(''), 2500);
        }
    };

    const stopVoiceSearch = async () => {
        setIsListening(false);
        stopMicPulse();
        try { await Voice.stop(); } catch (e) { }
    };

    const processVoiceResult = (text: string) => {
        // Stop listening immediately after getting a result
        stopVoiceSearch();

        const q = text.toLowerCase().trim();
        const heardMsg = voiceLang === 'ta' ? `கேட்கப்பட்டது: "${text}"` : `Heard: "${text}"`;
        setVoiceStatus(heardMsg);
        const matched = matchVoiceToProduct(text, products);

        if (matched) {
            setProductSearchTerm(matched.name); // Filter the list to show current products

            setTimeout(() => {
                const foundMsg = voiceLang === 'ta' ? `${matched.name} கண்டறியப்பட்டது!` : `Found: ${matched.name}`;
                setVoiceStatus(foundMsg);

                // If product has variants, show variety picker (current products details)
                if (matched.variants && matched.variants.length > 0) {
                    handleProductPress(matched);
                } else {
                    addToCartDirectly(matched);
                }

                setTimeout(() => setVoiceStatus(''), 3000);
            }, 600);
        } else {
            setProductSearchTerm(text);
            const noMatchMsg = voiceLang === 'ta' ? `"${text}" - பொருத்தம் இல்லை` : `"${text}" - No match`;
            setVoiceStatus(noMatchMsg);
            setTimeout(() => setVoiceStatus(''), 4000);
        }
    };

    const addToCartDirectly = (product: Product) => {
        const variant = product.variants?.[0];
        const itemId = variant ? `${product.id}-${variant.quantity}-${variant.unit}` : String(product.id);
        const price = variant
            ? Number(variant.sellingPrice || variant.mrp || 0)
            : Number(product.offer_price || product.price || 0);
        const name = variant ? `${product.name} (${variant.quantity}${variant.unit})` : product.name;

        setCart(prev => {
            const exists = prev.find(item => item.id === itemId);
            if (exists) return prev.map(item => item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, {
                id: itemId,
                product_id: product.id,
                name,
                price,
                quantity: 1,
                image: product.image || product.images?.[0] || null
            }];
        });
    };

    // ─── Barcode & Helpers ─────────────────────────────────────
    const findProductByBarcode = (code: string) => {
        const bc = String(code).toLowerCase().trim();
        return products.find(p =>
            String(p.product_code || "").toLowerCase() === bc ||
            String((p as any).barcode || "").toLowerCase() === bc
        );
    };

    const addCustomUpiItem = (url: string) => {
        try {
            // Use regex for UPI extraction to avoid URL API issues in React Native
            if (url.includes('am=')) {
                const amountMatch = url.match(/[?&]am=([0-9.]+)/);
                const nameMatch = url.match(/[?&]pn=([^&]+)/);

                if (amountMatch && amountMatch[1]) {
                    const price = parseFloat(amountMatch[1]);
                    const name = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' ')) : 'QR Payment';
                    const itemId = `upi-${Date.now()}`;

                    setCart(prev => [...prev, {
                        id: itemId,
                        product_id: 0,
                        name: `QR: ${name}`,
                        price: price,
                        quantity: 1,
                        image: null
                    }]);
                    return true;
                }
            }
        } catch (e) {
            console.log("UPI Parse Error:", e);
        }
        return false;
    };

    useEffect(() => {
        if (products.length > 0) {
            if (route.params?.barcode) {
                const code = route.params.barcode;
                if (code.startsWith('upi://') || code.includes('am=')) {
                    if (addCustomUpiItem(code)) {
                        navigation.setParams({ barcode: null });
                        return;
                    }
                }
                const product = findProductByBarcode(code);
                if (product) {
                    handleProductPress(product);
                } else {
                    Toast.show({
                        type: 'error',
                        text1: 'Not Found',
                        text2: `Barcode ${code} not found`,
                    });
                }
                navigation.setParams({ barcode: null });
            } else if (route.params?.barcodes && Array.isArray(route.params.barcodes)) {
                const notFound: string[] = [];
                route.params.barcodes.forEach((code: string) => {
                    if (code.startsWith('upi://') || code.includes('am=')) {
                        if (addCustomUpiItem(code)) return;
                    }
                    const product = findProductByBarcode(code);
                    if (product) {
                        addToCartDirectly(product);
                    } else {
                        notFound.push(code);
                    }
                });
                if (notFound.length > 0) {
                    Toast.show({
                        type: 'error',
                        text1: 'Some Not Found',
                        text2: `${notFound.length} items not found`,
                    });
                }
                navigation.setParams({ barcodes: null });
            }
        }
    }, [route.params?.barcode, route.params?.barcodes, products]);

    // Data Loading
    useEffect(() => {
        const loadInitialData = async () => {
            if (!token) return;
            try {
                const [pResp, cResp]: any = await Promise.all([
                    fetchProducts(token).catch(() => []),
                    fetchCategories(token).catch(() => [])
                ]);
                let pItems = Array.isArray(pResp) ? pResp : (pResp.products || pResp.data || pResp.items || []);
                setProducts(pItems);
                let cItems = Array.isArray(cResp) ? cResp : (cResp.categories || cResp.data || cResp.items || []);
                setCategories(cItems);
            } catch (err) { } finally { setLoading(false); }
        };
        loadInitialData();
    }, [token]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchCat = selectedCategory === "All" || p.category === selectedCategory;
            const term = (productSearchTerm || "").toLowerCase();
            if (!term) return matchCat;
            const pName = (p.name || "").toLowerCase();
            const pTamil = (p.name_tamil || "").toLowerCase();
            const pTanglish = (p.name_tanglish || "").toLowerCase();
            const pCode = (p.product_code || String(p.id || "")).toLowerCase();
            // Also auto-transliterate Tamil script to handle Tanglish search
            const tamilAsRoman = tanglishMatchesTamil(term, p.name_tamil || '');
            return matchCat && (
                pName.includes(term) ||
                pTamil.includes(term) ||
                pTanglish.includes(term) ||
                pCode.includes(term) ||
                tamilAsRoman
            );
        });
    }, [products, selectedCategory, productSearchTerm, voiceLang]);

    const [customQty, setCustomQty] = useState('1');

    const handleProductPress = (product: Product) => {
        setCustomQty('1');
        setSelectedProduct(product);

        // ✅ default select first variant
        if (product?.variants && product.variants.length > 0) {
            setSelectedVariant(product.variants[0]);
        } else {
            setSelectedVariant(null);
        }

        setShowVariantModal(true);
    };

    const addToCart = (product, variant) => {
        if (!product) return;
        const qty = Number(customQty) || 1;
        const itemId = variant ? `${product.id}-${variant.quantity}-${variant.unit}` : String(product.id);
        const price = variant ? Number(variant.sellingPrice || variant.mrp || 0) : Number(product.offer_price || product.price || 0);
        const name = variant ? `${product.name} (${variant.quantity}${variant.unit})` : product.name;

        setCart(prev => {
            const exists = prev.find(item => item.id === itemId);
            if (exists) return prev.map(item => item.id === itemId ? { ...item, quantity: item.quantity + qty } : item);
            return [...prev, {
                id: itemId,
                product_id: product.id,
                name: name,
                price: price,
                quantity: qty,
                image: product.image || product.images?.[0] || null
            }];
        });
        setShowVariantModal(false);
        setCustomQty('1');
    };

    const handleFinalizeBill = async () => {
        if (!customerName || !customerPhone) return Toast.show({
            type: 'error',
            text1: 'Missing Info',
            text2: 'Enter name & phone number',
        });
        if (cart.length === 0) return Toast.show({
            type: 'error',
            text1: 'Cart Empty',
            text2: 'Add items first',
        });

        setSaving(true);
        try {
            const payload: BillPayload = {
                customer_name: customerName,
                customer_phone: customerPhone,
                total_amount: cartTotal,
                items: cart.map(i => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, price: i.price }))
            };
            const response: any = await createBill(payload, token);
            const billId = response?.id || Date.now();

            // Load Post-Save Preferences
            const autoP = await AsyncStorage.getItem('auto_print') === 'true';
            const afterA = await AsyncStorage.getItem('after_save_action') || 'back';

            const printData: PrintData = {
                customerName,
                customerPhone,
                items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                totalAmount: Number(cartTotal.toFixed(2)),
                subtotal: Number(subtotal.toFixed(2)),
                gstAmount: Number(gstAmount.toFixed(2)),
                billId: billId,
                date: new Date().toLocaleDateString()
            };

            if (autoP) {
                await printReceipt(printData);
                finalizeUI();
            } else {
                setSavedPrintData(printData);
                setShowPostSavePreview(true);
            }
        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Upload Failed',
                text2: err?.message || 'Check network connection',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={ACCENT_COLOR} size="large" />
                <Text style={styles.loadingText}>INITIALIZING TERMINAL...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            <LinearGradient colors={HEADER_GRADIENT} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
                        <Feather name="arrow-left" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.headerTitle}>BILLING<Text style={{ color: '#f97316' }}></Text></Text>
                    </View>
                </View>

                <View style={styles.searchBarContainer}>
                    <Feather name="search" size={16} color="#94a3b8" />
                    <TextInput
                        placeholder={voiceLang === 'ta' ? "சரக்குகளைத் தேடுங்கள்..." : voiceLang === 'tgl' ? "Tanglish la thedi..." : "Search Inventory..."}
                        style={styles.searchInput}
                        placeholderTextColor="#475569"
                        value={productSearchTerm}
                        onChangeText={setProductSearchTerm}
                    />

                    {/* Language Toggle */}
                    <TouchableOpacity
                        onPress={cycleVoiceLang}
                        style={{
                            paddingHorizontal: 10, paddingVertical: 4, marginRight: 5, borderRadius: 8,
                            backgroundColor: voiceLang === 'ta' ? '#e11d48' : voiceLang === 'tgl' ? '#7c3aed' : '#f1f5f9'
                        }}
                    >
                        <Text style={{ fontSize: 9, fontWeight: '900', color: voiceLang !== 'en' ? '#fff' : '#475569' }}>
                            {voiceLang === 'ta' ? 'TAM' : voiceLang === 'tgl' ? 'TGL' : 'ENG'}
                        </Text>
                    </TouchableOpacity>

                    {/* Voice Button */}
                    <TouchableOpacity onPress={startVoiceSearch} style={styles.voiceBtn} disabled={isListening}>
                        <Animated.View style={{ transform: [{ scale: micAnim }] }}>
                            <Feather name="mic" size={16} color={isListening ? '#ef4444' : '#10b981'} />
                        </Animated.View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('ScannerScreen')} style={styles.inlineScanner}>
                        <Feather name="maximize" size={16} color="#f97316" />
                    </TouchableOpacity>
                </View>

                {/* Voice Status Bar */}
                {voiceStatus !== '' && (
                    <View style={styles.voiceStatusBar}>
                        <Feather name={isListening ? 'mic' : 'check-circle'} size={12} color={isListening ? '#ef4444' : '#10b981'} />
                        <Text style={styles.voiceStatusTxt}>{voiceStatus}</Text>
                    </View>
                )}

                <View style={styles.customerFormRow}>
                    <View style={styles.miniInputContainer}>
                        <Feather name="user" size={12} color="#64748b" />
                        <TextInput placeholder="Full Name" style={styles.miniInput} placeholderTextColor="#475569" value={customerName} onChangeText={setCustomerName} />
                    </View>
                    <View style={styles.miniInputContainer}>
                        <Feather name="phone" size={12} color="#64748b" />
                        <TextInput placeholder="Number" keyboardType="phone-pad" style={styles.miniInput} placeholderTextColor="#475569" value={customerPhone} onChangeText={setCustomerPhone} />
                    </View>
                </View>
            </LinearGradient>

            <FlatList
                data={filteredProducts}
                numColumns={2}
                contentContainerStyle={{
                    padding: 12,
                    paddingBottom: insets.bottom + 120, // 🔥 FIX
                }}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleProductPress(item)} style={styles.card}>

                        <View style={styles.imageContainer}>
                            {item.image || item.images?.[0] ? (
                                <Image source={{ uri: item.image || item.images?.[0] }} style={styles.productImg} />
                            ) : (
                                <Feather name="package" size={24} color="#cbd5e1" />
                            )}

                            {/* ✅ ADD BUTTON */}
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => handleProductPress(item)}  // opens qty popup
                            >
                                <Feather name="plus" size={16} color="#fff" />
                            </TouchableOpacity>

                        </View>

                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                        </Text>

                        <View style={styles.itemFooter}>
                            <Text style={styles.itemPrice}>
                                ₹{Number(item.offer_price || item.price || 0)}
                            </Text>

                            <View style={styles.stockBadge}>
                                <Text style={styles.stockText}>{item.total_stock || 0} U</Text>
                            </View>
                        </View>

                    </TouchableOpacity>
                )}
            />

            {cart.length > 0 && (
                <View style={[
                    styles.footerBar,
                    {
                        bottom: insets.bottom + 10,   // 🔥 FIX
                    }
                ]}>
                    <TouchableOpacity onPress={() => setShowCart(true)} style={styles.cartBtn}>
                        <View style={styles.cartIconWrapper}><Feather name="shopping-cart" size={18} color="#fff" /></View>
                        <View style={styles.cartInfo}>
                            <Text style={styles.cartVal}>₹{cartTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                            <Text style={styles.cartCount}>{cartItemCount} ITEMS</Text>
                        </View>
                        <Feather name="chevron-up" size={18} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleFinalizeBill} style={styles.commitBtn}>
                        {saving ? <ActivityIndicator color="white" /> : <Feather name="check-circle" size={22} color="white" />}
                    </TouchableOpacity>
                </View>
            )}

            <Modal visible={showCart} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCart(false)} />
                    <View style={styles.modalSheet}>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCart(false)}>
                            <Feather name="x" size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.modalPill} />
                        <Text style={styles.modalTitle}>Cart Manifest<Text style={{ color: '#f97316' }}>.</Text></Text>

                        <ScrollView style={styles.cartScroll}>
                            {cart.map((item) => (
                                <View key={item.id} style={styles.cartItem}>
                                    <View style={styles.cartItemMeta}>
                                        <Text style={styles.cartItemName}>{item.name}</Text>
                                        <Text style={styles.cartItemPrice}>₹{item.price.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.qtyControl}>
                                        <TouchableOpacity onPress={() => {
                                            if (item.quantity > 1) {
                                                setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                                            } else {
                                                setCart(prev => prev.filter(i => i.id !== item.id));
                                            }
                                        }}><Feather name={item.quantity > 1 ? "minus" : "trash-2"} size={14} color="#64748b" /></TouchableOpacity>
                                        <Text style={styles.qtyValue}>{item.quantity}</Text>
                                        <TouchableOpacity onPress={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}><Feather name="plus" size={14} color="#f97316" /></TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <View>
                                {gstEnabled && (
                                    <Text style={styles.taxLabel}>{gstType.toUpperCase()} GST ({gstPercentage}%): ₹{gstAmount.toFixed(2)}</Text>
                                )}
                                <Text style={styles.totalVal}>₹{cartTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                                <Text style={styles.totalLabel}>FINAL VALUATION</Text>
                            </View>
                            <TouchableOpacity onPress={handleFinalizeBill} style={styles.finalizeBtn}><Text style={styles.finalizeTxt}>COMMIT BILL</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={showVariantModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVariantModal(false)} />
                    <View style={styles.variantSheet}>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowVariantModal(false)}>
                            <Feather name="x" size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.modalPill} />
                        <Text style={styles.variantTitle}>{voiceLang === 'ta' && selectedProduct?.name_tamil ? selectedProduct.name_tamil : selectedProduct?.name}</Text>

                        <View style={styles.qtyPicker}>
                            <Text style={styles.pickerLabel}>Set Quantity/Weight</Text>
                            <View style={styles.qtyRow}>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setCustomQty(q => String(Math.max(0.1, (Number(q) || 0) - 1)))}
                                >
                                    <Feather name="minus" size={20} color="#f97316" />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.qtyInput}
                                    value={customQty}
                                    onChangeText={setCustomQty}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setCustomQty(q => String((Number(q) || 0) + 1))}
                                >
                                    <Feather name="plus" size={20} color="#f97316" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                            <>
                                <Text style={styles.pickerLabel}>Or Select Variant</Text>
                                <View style={styles.variantGrid}>
                                    {selectedProduct.variants.map((v: any, idx: number) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[
                                                styles.variantBtn,
                                                selectedVariant === v && {
                                                    borderColor: '#2563eb',
                                                    backgroundColor: '#eff6ff'
                                                }
                                            ]}
                                            onPress={() => setSelectedVariant(v)}
                                        >
                                            <Text style={styles.vQty}>{v.quantity}{v.unit}</Text>
                                            <Text style={styles.vPrice}>₹{v.sellingPrice || v.mrp || 0}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.confirmAddBtn}
                            onPress={() => addToCart(selectedProduct, selectedVariant)}
                        >
                            <Text style={styles.confirmAddTxt}>ADD TO CART</Text>
                        </TouchableOpacity>

                        {/* <TouchableOpacity onPress={() => setShowVariantModal(false)}><Text style={styles.cancelTxt}>CANCEL</Text></TouchableOpacity> */}
                    </View>
                </View>
            </Modal>

            {/* 🔥 POST-SAVE RECEIPT PREVIEW BOTTOM SHEET */}
            <Modal visible={showPostSavePreview} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { maxHeight: '95%', borderTopRightRadius: 40, borderTopLeftRadius: 40, padding: 0 }]}>
                        {/* Drag Indicator */}
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <View style={{ width: 48, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, alignSelf: 'center' }} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e293b', letterSpacing: 2, textTransform: 'uppercase' }}>Final Receipt</Text>
                            <TouchableOpacity onPress={() => finalizeUI()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
                                <Feather name="x" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 25, paddingBottom: 40 }}>
                            {savedPrintData && (
                                <View style={{ backgroundColor: '#fff', borderRadius: 4, padding: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: '#f1f5f9' }}>
                                    {/* Header */}
                                    <View style={{ alignItems: 'center', marginBottom: 25 }}>
                                        {businessInfo?.showLogo && businessInfo?.logoBase64 && (
                                            <View style={{ marginBottom: 15, padding: 8, backgroundColor: '#f8fafc', borderRadius: 16 }}>
                                                <Image source={{ uri: `data:image/png;base64,${businessInfo.logoBase64}` }} style={{ width: 90, height: 90 }} resizeMode="contain" />
                                            </View>
                                        )}
                                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', textAlign: 'center' }}>{businessInfo?.storeName || 'BILLING APP'}</Text>
                                        {businessInfo?.tagline && <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>{businessInfo.tagline}</Text>}

                                        <View style={{ marginTop: 15, alignItems: 'center' }}>
                                            {businessInfo?.address && <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600', textAlign: 'center' }}>{businessInfo.address}</Text>}
                                            {businessInfo?.phone && <Text style={{ fontSize: 10, color: '#475569', fontWeight: '900', textAlign: 'center', marginTop: 4 }}>Ph: {businessInfo.phone}</Text>}
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1 }}>ORD-#{savedPrintData.billId}</Text>
                                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1 }}>{savedPrintData.date}</Text>
                                    </View>

                                    <View style={{ height: 1, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderStyle: 'dashed', marginBottom: 25 }} />

                                    {/* Items */}
                                    <View style={{ gap: 15, marginBottom: 25 }}>
                                        {savedPrintData.items.map((item, idx) => (
                                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <View style={{ flex: 1, paddingRight: 20 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#1e293b' }}>{item.name}</Text>
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>{item.quantity} x ₹{item.price}</Text>
                                                </View>
                                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={{ height: 1.5, backgroundColor: '#0f172a', marginVertical: 25 }} />

                                    {/* Totals */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>PAID AMOUNT</Text>
                                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#f97316' }}>₹{savedPrintData.totalAmount}</Text>
                                    </View>

                                    {/* QR Section */}
                                    {businessInfo?.showQRCode && businessInfo?.upiId && (
                                        <View style={{ alignItems: 'center', marginTop: 30, backgroundColor: '#f8fafc', padding: 25, borderRadius: 30, borderWidth: 1, borderColor: '#f1f5f9' }}>
                                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginBottom: 20 }}>VERIFY PAYMENT VIA UPI</Text>
                                            <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 24, elevation: 2 }}>
                                                <Image
                                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${businessInfo.upiId}&pn=${businessInfo.storeName}&am=${savedPrintData.totalAmount}&cu=INR`)}` }}
                                                    style={{ width: 140, height: 140 }}
                                                />
                                            </View>
                                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 20, backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>{businessInfo.upiId}</Text>
                                        </View>
                                    )}

                                    {/* Footer */}
                                    <View style={{ marginTop: 35, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 25, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>{businessInfo?.footerMessage || 'Thank You!'}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 25, opacity: 0.3 }}>
                                            <View style={{ height: 1, flex: 1, backgroundColor: '#cbd5e1' }} />
                                            <Text style={{ fontSize: 8, fontWeight: '900', color: '#94a3b8', marginHorizontal: 12, letterSpacing: 2 }}>VERIFIED BY ZIPKART</Text>
                                            <View style={{ height: 1, flex: 1, backgroundColor: '#cbd5e1' }} />
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={{ paddingHorizontal: 30, paddingBottom: 50, paddingTop: 20, backgroundColor: '#fff', flexDirection: 'row', gap: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                            <TouchableOpacity onPress={() => finalizeUI()} style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', paddingVertical: 18, borderRadius: 22, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748b', letterSpacing: 1 }}>DONE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={async () => {
                                    if (savedPrintData) await printReceipt(savedPrintData);
                                    finalizeUI();
                                }}
                                style={{ flex: 2, backgroundColor: '#f97316', paddingVertical: 18, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 8, shadowColor: '#f97316', shadowOpacity: 0.3, shadowRadius: 10 }}
                            >
                                <Feather name="printer" size={20} color="white" />
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }}>PRINT RECEIPT</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default CreateBilling;

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 10, color: '#94a3b8', fontWeight: '900', letterSpacing: 2 },

    container: { flex: 1, backgroundColor: '#f8fafc' },

    headerGradient: {
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },

    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },

    headerTitleWrap: { flex: 1, alignItems: 'flex-start' },

    headerTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 0.5,
    },

    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 25,
    },

    searchInput: {
        flex: 1,
        height: 55,
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
        paddingLeft: 10,
    },

    voiceBtn: { padding: 6, marginRight: 4 },

    inlineScanner: { padding: 5 },

    voiceStatusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(37,99,235,0.15)', // blue tint
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginBottom: 20,
    },

    voiceStatusTxt: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1e3a8a',
        flex: 1,
    },

    customerFormRow: { flexDirection: 'row', gap: 10 },

    miniInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
    },

    miniInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 11,
        fontWeight: '700',
        color: '#0f172a',
    },

    listContent: { padding: 12, paddingBottom: 120 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        margin: 6,
        padding: 12,
        flex: 1,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },

    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#eff6ff',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },

    productImg: { width: '100%', height: '100%' },

    itemName: { fontSize: 12, fontWeight: '900', color: '#0f172a' },

    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },

    itemPrice: { fontSize: 14, fontWeight: '900', color: '#2563eb' },

    stockBadge: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },

    stockText: { fontSize: 8, fontWeight: '900', color: '#2563eb' },

    footerBar: {
        position: 'absolute',
        left: 24,
        right: 24,
        flexDirection: 'row',
        gap: 12,
        zIndex: 100,
    },

    cartBtn: {
        flex: 1,
        height: 60,
        backgroundColor: '#1e3a8a',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        elevation: 8,
    },

    cartIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    cartInfo: { flex: 1, marginLeft: 12 },

    cartVal: { color: '#fff', fontSize: 16, fontWeight: '900' },

    cartCount: { color: '#c7d2fe', fontSize: 8, fontWeight: '800' },

    commitBtn: {
        width: 60,
        height: 60,
        backgroundColor: '#2563eb',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.6)',
        justifyContent: 'flex-end',
    },

    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 25,
        maxHeight: '85%',
    },

    modalCloseBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
    },

    modalPill: {
        width: 40,
        height: 4,
        backgroundColor: '#dbeafe',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },

    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 20,
    },

    cartScroll: { marginBottom: 20 },

    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        padding: 15,
        borderRadius: 20,
        marginBottom: 10,
    },

    cartItemMeta: { flex: 1 },

    cartItemName: { fontSize: 12, fontWeight: '900', color: '#0f172a' },

    cartItemPrice: { fontSize: 10, fontWeight: '800', color: '#2563eb', marginTop: 1 },

    qtyControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 5,
        paddingHorizontal: 10,
        gap: 12,
    },

    qtyValue: { fontSize: 13, fontWeight: '900', color: '#0f172a' },

    modalFooter: {
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    taxLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 2 },

    totalLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8' },

    totalVal: { fontSize: 26, fontWeight: '900', color: '#2563eb' },

    finalizeBtn: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 18,
    },

    finalizeTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },

    variantSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        padding: 30,
        alignItems: 'center',
    },

    variantTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 20 },

    qtyPicker: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 25,
        backgroundColor: '#eff6ff',
        padding: 20,
        borderRadius: 24,
    },

    pickerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#1e3a8a',
        letterSpacing: 1,
        marginBottom: 15,
        textTransform: 'uppercase',
    },

    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },

    qtyBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },

    qtyInput: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0f172a',
        width: 80,
        textAlign: 'center',
    },

    variantGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
    },

    variantBtn: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        minWidth: 80,
    },

    vQty: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

    vPrice: { fontSize: 11, fontWeight: '800', color: '#2563eb', marginTop: 4 },

    cancelTxt: { fontSize: 11, fontWeight: '900', color: '#64748b' },
    addBtn: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 34,          // ✅ medium size
        height: 34,
        borderRadius: 17,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',

        // shadow
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },

    confirmAddBtn: {
        width: '100%',
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 18,
        alignItems: 'center',
        marginTop: 10,
    },

    confirmAddTxt: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
});