import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    FlatList, Modal, ActivityIndicator, Alert,
    StatusBar, Dimensions, Platform, Image,
    PermissionsAndroid, StyleSheet
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { fetchProducts, fetchCategories, createBill, Product, Category, BillPayload } from "../api";
import Voice from '@react-native-voice/voice';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────
const PRIMARY_GRADIENT = ['#f97316', '#ea580c']; // Orange
const HEADER_GRADIENT  = ['#0f172a', '#1e293b']; // Dark Blueish
const ACCENT_COLOR     = '#E11D48'; // Rose Red

const CreateBilling = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { token } = useAuth();
    
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

    // Form State
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [cart, setCart] = useState<any[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [voiceLang, setVoiceLang] = useState<'en' | 'ta'>('en');
    const voiceLangRef = useRef<'en' | 'ta'>('en');

    // Sync ref for callbacks
    useEffect(() => { voiceLangRef.current = voiceLang; }, [voiceLang]);

    // Barcode Handling from Scanner
    useEffect(() => {
        if (route.params?.barcode && products.length > 0) {
            const barcode = String(route.params.barcode).toLowerCase().trim();
            
            // SUPER AGGRESSIVE SEARCH: Check every field for a match
            const product = products.find(p => {
                const b = barcode.toLowerCase().trim();
                
                // 1. Direct Field Matches (Code, Barcode, SKU, ID)
                if (String(p.product_code || "").toLowerCase() === b) return true;
                if (String(p.barcode || "").toLowerCase() === b) return true;
                if (String(p.sku || "").toLowerCase() === b) return true;
                if (String(p.id || "").toLowerCase() === b) return true;
                if (String(p.code || "").toLowerCase() === b) return true;
                
                // 2. Contains Match (Fuzzy)
                if (String(p.name || "").toLowerCase().includes(b)) return true;

                // 3. Object search
                return Object.values(p).some(val => 
                    (typeof val === 'string' || typeof val === 'number') && 
                    String(val).toLowerCase().trim() === b
                );
            });
            
            if (product) {
                handleProductPress(product);
                navigation.setParams({ barcode: null });
            } else {
                console.warn(`Barcode [${barcode}] not found among ${products.length} products.`);
                Alert.alert(
                    "Barcode Trace Failed", 
                    `[${barcode}] not detected in currently loaded inventory (${products.length} items). \n\nCheck if product exists in Products screen or pull-to-refresh.`
                );
                navigation.setParams({ barcode: null });
            }
        }
    }, [route.params?.barcode, products]);

    // Voice Setup
    useEffect(() => {
        Voice.onSpeechResults = (e: any) => {
            if (e.value && e.value.length > 0) {
                setProductSearchTerm(e.value[0]);
                stopListening();
            }
        };
        Voice.onSpeechPartialResults = (e: any) => {
            if (e.value && e.value.length > 0) setProductSearchTerm(e.value[0]);
        };
        Voice.onSpeechError = (e: any) => {
            console.error('Voice error:', e?.error);
            setIsListening(false);
            const code = e?.error?.code;
            if (code !== '7' && code !== 7) {
                Alert.alert('Voice Error', 'Recognition failed. Make sure mic permission is granted and try again.');
            }
        };
        Voice.onSpeechEnd = () => setIsListening(false);
        
        return () => {
            try {
                Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {});
            } catch (err) {}
        };
    }, []);

    const startListening = async () => {
        // Safe check for the native module to avoid 'of null' errors
        const VoiceModule = (Voice as any)._nativeModule || Voice; 
        if (!VoiceModule) {
            Alert.alert("Module Sync Error", "The Voice Recognition engine is not linked. Please run: npx react-native run-android");
            return;
        }

        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
        }

        const locale = voiceLangRef.current === 'ta' ? 'ta-IN' : 'en-IN';
        try {
            await Voice.cancel().catch(() => {});
            setTimeout(async () => {
                try {
                    await Voice.start(locale);
                    setIsListening(true);
                } catch (err: any) {
                    console.error("Delayed Start error:", err);
                    setIsListening(false);
                    if (String(err?.message).includes('null')) {
                        Alert.alert('Native Error', 'Voice module failed to attach. Ensure you have run npx react-native run-android.');
                    }
                }
            }, 50);
        } catch (e: any) {
            console.error('Initial start error:', e);
            setIsListening(false);
            if (String(e?.message).includes('null')) {
                Alert.alert('Module Sync', 'Voice module is linking. Restarting app after build is required.');
            }
        }
    };

    const stopListening = async () => {
        try { await Voice.stop(); } catch (e) {}
        setIsListening(false);
    };

    const toggleVoiceLang = () => setVoiceLang(prev => (prev === 'en' ? 'ta' : 'en'));

    // Data Loading
    useEffect(() => {
        const loadInitialData = async () => {
            if (!token) return;
            try {
                const [pResp, cResp]: any = await Promise.all([
                    fetchProducts(token).catch(() => []),
                    fetchCategories(token).catch(() => [])
                ]);
                
                // Robust response handling
                let pItems = Array.isArray(pResp) ? pResp : (pResp.products || pResp.data || pResp.items || []);
                setProducts(pItems);

                let cItems = Array.isArray(cResp) ? cResp : (cResp.categories || cResp.data || cResp.items || []);
                setCategories(cItems);
            } catch (err) {
                console.error("Data load error", err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [token]);

    const filteredProducts = useMemo(() => {
        const items = Array.isArray(products) ? products : [];
        return items.filter(p => {
            const matchCat = selectedCategory === "All" || p.category === selectedCategory;
            const term = (productSearchTerm || "").toLowerCase();
            const pName = (p.name || "").toLowerCase();
            const pCode = (p.product_code || String(p.id || "")).toLowerCase();
            return matchCat && (pName.includes(term) || pCode.includes(term));
        });
    }, [products, selectedCategory, productSearchTerm]);

    // Cart Logic
    const handleProductPress = (product: Product) => {
        if (product && product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setShowVariantModal(true);
        } else if (product) {
            addToCart(product);
        }
    };

    const addToCart = (product: Product, variant?: any) => {
        if (!product) return;
        const itemId = variant ? `${product.id}-${variant.quantity}-${variant.unit}` : String(product.id);
        const price = variant ? Number(variant.sellingPrice || variant.mrp || 0) : Number(product.offer_price || product.price || 0);

        setCart(prev => {
            const exists = prev.find(item => item.id === itemId);
            if (exists) return prev.map(item => item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, {
                id: itemId,
                product_id: product.id,
                name: variant ? `${product.name} (${variant.quantity}${variant.unit})` : product.name,
                price: price,
                quantity: 1,
                image: product.image || product.images?.[0] || null
            }];
        });
        setShowVariantModal(false);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleFinalizeBill = async () => {
        if (!customerName || !customerPhone) return Alert.alert("Missing Info", "Full name and contact number required.");
        if (cart.length === 0) return Alert.alert("Empty Manifest", "Add items to the cart first.");

        setSaving(true);
        try {
            const payload: BillPayload = {
                customer_name: customerName,
                customer_phone: customerPhone,
                total_amount: cartTotal,
                items: cart.map(i => ({ 
                    product_id: i.product_id, 
                    name: i.name,
                    quantity: i.quantity,
                    price: i.price
                }))
            };
            await createBill(payload, token);
            Alert.alert("Success", "Transaction finalized and uploaded.");
            setCart([]);
            navigation.goBack();
        } catch (err: any) {
            Alert.alert("Upload Failed", err?.message || "Check network connection.");
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
            
            {/* ─── Premium Header ─── */}
            <LinearGradient colors={HEADER_GRADIENT} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
                        <Feather name="arrow-left" size={20} color="#fff" />
                    </TouchableOpacity>
                    
                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.headerTitle}>TRANS.BILLING<Text style={{ color: '#f97316' }}>.</Text></Text>
                    </View>

                    <View style={styles.headerRightActions}>
                        <TouchableOpacity onPress={toggleVoiceLang} style={[styles.langSwitch, voiceLang === 'ta' && { borderColor: '#f97316' }]}>
                            <Text style={[styles.langText, voiceLang === 'ta' && { color: '#f97316' }]}>{voiceLang === 'ta' ? 'TA' : 'EN'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={isListening ? stopListening : startListening}
                            style={[styles.micBtn, isListening && { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}
                        >
                            <Feather name="mic" size={18} color={isListening ? "#f97316" : "#fff"} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarContainer}>
                    <Feather name="search" size={16} color="#94a3b8" style={styles.searchIcon} />
                    <TextInput 
                        placeholder={isListening ? (voiceLang === 'ta' ? 'கேட்கிறேன்...' : 'Listening...') : (voiceLang === 'ta' ? 'தேடுங்கள்...' : 'Search Inventory...')} 
                        style={styles.searchInput}
                        placeholderTextColor="#475569"
                        value={productSearchTerm}
                        onChangeText={setProductSearchTerm}
                    />
                    <TouchableOpacity onPress={() => navigation.navigate('ScannerScreen')} style={styles.inlineScanner}>
                        <Feather name="maximize" size={16} color="#f97316" />
                    </TouchableOpacity>
                </View>

                {/* Customer Mini-Form */}
                <View style={styles.customerFormRow}>
                    <View style={styles.miniInputContainer}>
                        <Feather name="user" size={12} color="#64748b" />
                        <TextInput 
                            placeholder="Full Name" 
                            style={styles.miniInput} 
                            placeholderTextColor="#475569"
                            value={customerName}
                            onChangeText={setCustomerName}
                        />
                    </View>
                    <View style={styles.miniInputContainer}>
                        <Feather name="phone" size={12} color="#64748b" />
                        <TextInput 
                            placeholder="Number" 
                            keyboardType="phone-pad"
                            style={styles.miniInput} 
                            placeholderTextColor="#475569"
                            value={customerPhone}
                            onChangeText={setCustomerPhone}
                        />
                    </View>
                </View>
            </LinearGradient>

            {/* ─── Inventory Feed ─── */}
            <View style={styles.inventoryHeader}>
                <Text style={styles.inventorySub}>GLOBAL ASSETS</Text>
                <View style={styles.viewModeToggle}>
                    <TouchableOpacity onPress={() => setViewMode("grid")} style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleActive]}>
                        <Feather name="grid" size={14} color={viewMode === 'grid' ? '#f97316' : '#94a3b8'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setViewMode("list")} style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}>
                        <Feather name="list" size={14} color={viewMode === 'list' ? '#f97316' : '#94a3b8'} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredProducts}
                key={viewMode}
                numColumns={viewMode === 'grid' ? 2 : 1}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        onPress={() => handleProductPress(item)}
                        style={[styles.card, viewMode === 'grid' ? styles.gridCard : styles.listCard]}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.imageContainer, viewMode === 'grid' ? styles.gridImage : styles.listImage]}>
                            {item.image || item.images?.[0] ? (
                                <Image source={{ uri: item.image || item.images?.[0] }} style={styles.productImg} resizeMode="cover" />
                            ) : (
                                <Feather name="package" size={24} color="#cbd5e1" />
                            )}
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.itemCode}>ID-{item.id}</Text>
                            <View style={styles.itemFooter}>
                                <Text style={styles.itemPrice}>₹{Number(item.offer_price || item.price || 0).toLocaleString('en-IN')}</Text>
                                <View style={styles.stockBadge}>
                                    <Text style={styles.stockText}>{item.total_stock || 0} U</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Feather name="search" size={40} color="#e2e8f0" />
                        <Text style={styles.emptyText}>No matching assets found</Text>
                    </View>
                )}
            />

            {/* ─── Footer Action Bar ─── */}
            {cart.length > 0 && (
                <View style={[styles.footerBar, { bottom: 10 }]}>
                    <TouchableOpacity onPress={() => setShowCart(true)} style={styles.cartBtn} activeOpacity={0.9}>
                        <View style={styles.cartIconWrapper}>
                            <Feather name="shopping-cart" size={18} color="#fff" />
                        </View>
                        <View style={styles.cartInfo}>
                            <Text style={styles.cartVal}>₹{cartTotal.toLocaleString()}</Text>
                            <Text style={styles.cartCount}>{cartItemCount} ITEMS</Text>
                        </View>
                        <Feather name="chevron-up" size={18} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleFinalizeBill} style={styles.commitBtn} activeOpacity={0.85}>
                        {saving ? <ActivityIndicator color="white" /> : <Feather name="check-circle" size={22} color="white" />}
                    </TouchableOpacity>
                </View>
            )}

            {/* ─── Cart Modal ─── */}
            <Modal visible={showCart} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCart(false)} />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalPill} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cart Manifest<Text style={{ color: '#f97316' }}>.</Text></Text>
                            <TouchableOpacity onPress={() => setShowCart(false)} style={styles.modalCloseIcon}>
                                <Feather name="x" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.cartScroll} showsVerticalScrollIndicator={false}>
                            {cart.map((item) => (
                                <View key={item.id} style={styles.cartItem}>
                                    <View style={styles.cartItemIcon}>
                                        <Feather name="box" size={16} color="#94a3b8" />
                                    </View>
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
                                        }}>
                                            <Feather name={item.quantity > 1 ? "minus" : "trash-2"} size={14} color={item.quantity > 1 ? "#64748b" : "#f43f5e"} />
                                        </TouchableOpacity>
                                        <Text style={styles.qtyValue}>{item.quantity}</Text>
                                        <TouchableOpacity onPress={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}>
                                            <Feather name="plus" size={14} color="#f97316" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <View>
                                <Text style={styles.totalLabel}>TOTAL VALUATION</Text>
                                <Text style={styles.totalVal}>₹{cartTotal.toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity onPress={handleFinalizeBill} style={styles.finalizeBtn}>
                                <Text style={styles.finalizeTxt}>COMMIT BILL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── Variant Modal ─── */}
            <Modal visible={showVariantModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVariantModal(false)} />
                    <View style={styles.variantSheet}>
                        <View style={styles.modalPill} />
                        <Text style={styles.variantTitle}>{selectedProduct?.name}</Text>
                        <Text style={styles.variantSubtitle}>SELECT UNIT VARIANT</Text>
                        
                        <View style={styles.variantGrid}>
                            {selectedProduct?.variants?.map((v: any, idx: number) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={styles.variantBtn}
                                    onPress={() => addToCart(selectedProduct as Product, v)}
                                >
                                    <Text style={styles.vQty}>{v.quantity}{v.unit}</Text>
                                    <Text style={styles.vPrice}>₹{v.sellingPrice || v.mrp || 0}</Text>
                                    <View style={styles.vTag}>
                                        <Feather name="plus" size={12} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <TouchableOpacity onPress={() => setShowVariantModal(false)} style={styles.cancelBtn}>
                            <Text style={styles.cancelTxt}>CANCEL</Text>
                        </TouchableOpacity>
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
    
    headerGradient: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    headerIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',marginTop:10 },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    langSwitch: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    langText: { color: '#94a3b8', fontSize: 10, fontWeight: '900' },
    micBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 15, marginBottom: 15 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 45, fontSize: 13, fontWeight: '700', color: '#0f172a' },
    inlineScanner: { padding: 5 },
    customerFormRow: { flexDirection: 'row', gap: 10 },
    miniInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 40 },
    miniInput: { flex: 1, marginLeft: 8, fontSize: 11, backgroundColor:"#fff", fontWeight: '700', color: 'rgba(0, 0, 0, 0.78)' },

    inventoryHeader: { paddingHorizontal: 24, paddingTop: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    inventorySub: { fontSize: 10, fontWeight: '900', color: '#64748b', letterSpacing: 1.5 },
    viewModeToggle: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 3 },
    toggleBtn: { padding: 8, borderRadius: 8 },
    toggleActive: { backgroundColor: '#f8fafc', elevation: 2 },

    listContent: { padding: 16, paddingBottom: 120 },
    card: { backgroundColor: '#fff', borderRadius: 24, margin: 8, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    gridCard: { flex: 1 },
    listCard: { flexDirection: 'row', alignItems: 'center' },
    imageContainer: { backgroundColor: '#f8fafc', borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    gridImage: { width: '100%', aspectRatio: 1, marginBottom: 12 },
    listImage: { width: 60, height: 60, marginRight: 15 },
    productImg: { width: '100%', height: '100%' },
    cardInfo: { flex: 1 },
    itemName: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
    itemCode: { fontSize: 8, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 },
    itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    itemPrice: { fontSize: 14, fontWeight: '900', color: '#E11D48' },
    stockBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    stockText: { fontSize: 8, fontWeight: '900', color: '#22c55e' },

    footerBar: { position: 'absolute', left: 24, right: 24, flexDirection: 'row', gap: 12, zIndex: 100 },
    cartBtn: { flex: 1, height: 60, backgroundColor: '#0f172a', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, elevation: 8 },
    cartIconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    cartInfo: { flex: 1, marginLeft: 12 },
    cartVal: { color: '#fff', fontSize: 15, fontWeight: '900' },
    cartCount: { color: '#64748b', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
    commitBtn: { width: 60, height: 60, backgroundColor: '#E11D48', borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '85%' },
    modalPill: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
    modalCloseIcon: { padding: 5 },
    cartScroll: { marginBottom: 20 },
    cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 20, marginBottom: 10 },
    cartItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    cartItemMeta: { flex: 1, marginLeft: 12 },
    cartItemName: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
    cartItemPrice: { fontSize: 10, fontWeight: '800', color: '#E11D48', marginTop: 1 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 5, paddingHorizontal: 10, gap: 12 },
    qtyValue: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
    modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
    totalLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
    totalVal: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    finalizeBtn: { backgroundColor: '#E11D48', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 18 },
    finalizeTxt: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    emptyContainer: { paddingVertical: 80, alignItems: 'center' },
    emptyText: { marginTop: 15, fontSize: 11, fontWeight: '900', color: '#cbd5e1', letterSpacing: 0.5 },
    
    variantSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, maxHeight: '70%', alignItems: 'center' },
    variantTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 5, textAlign: 'center' },
    variantSubtitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 25 },
    variantGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 30 },
    variantBtn: { backgroundColor: '#f8fafc', width: (width - 100) / 2, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', position: 'relative' },
    vQty: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    vPrice: { fontSize: 12, fontWeight: '800', color: '#E11D48', marginTop: 4 },
    vTag: { position: 'absolute', top: -5, right: -5, width: 24, height: 24, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    cancelBtn: { paddingVertical: 15 },
    cancelTxt: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
});
