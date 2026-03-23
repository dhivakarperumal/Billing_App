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
import LinearGradient from 'react-native-linear-gradient';
import { printReceipt, PrintData } from "../utils/printer";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
            } catch (e) {}
        };
        loadTaxConfig();
    }, []);

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

    // Sync ref for callbacks - Legacy
    const voiceLangRef = useRef<'en' | 'ta'>('en');

    // Barcode Handling
    useEffect(() => {
        const processBarcode = (code: string) => {
            const bc = String(code).toLowerCase().trim();
            const product = products.find(p => {
                const b = bc.toLowerCase().trim();
                return String(p.product_code || "").toLowerCase() === b || 
                       String(p.barcode || "").toLowerCase() === b;
            });
            if (product) {
                handleProductPress(product);
            } else {
                Alert.alert("Not Found", `Barcode [${bc}] matches no inventory item.`);
            }
        };

        if (products.length > 0) {
            if (route.params?.barcode) {
                processBarcode(route.params.barcode);
                navigation.setParams({ barcode: null });
            } else if (route.params?.barcodes && Array.isArray(route.params.barcodes)) {
                route.params.barcodes.forEach((v: string) => processBarcode(v));
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
            } catch (err) {} finally { setLoading(false); }
        };
        loadInitialData();
    }, [token]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchCat = selectedCategory === "All" || p.category === selectedCategory;
            const term = (productSearchTerm || "").toLowerCase();
            const pName = (p.name || "").toLowerCase();
            const pCode = (p.product_code || String(p.id || "")).toLowerCase();
            return matchCat && (pName.includes(term) || pCode.includes(term));
        });
    }, [products, selectedCategory, productSearchTerm]);

    const [customQty, setCustomQty] = useState('1');

    const handleProductPress = (product: Product) => {
        setCustomQty('1'); // Reset
        if (product && product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setShowVariantModal(true);
        } else if (product) {
            // Even if no variants, maybe we want to ask "How many/much?"
            // But for now behavior is immediate add. 
            // I'll show the modal for EVERY product to allow quantity selection if needed
            setSelectedProduct(product);
            setShowVariantModal(true);
        }
    };

    const addToCart = (product: Product, variant?: any) => {
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
        if (!customerName || !customerPhone) return Alert.alert("Missing Info", "Full name and contact number required.");
        if (cart.length === 0) return Alert.alert("Empty Manifest", "Add items to the cart first.");

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

            const finalizeUI = () => {
                setCart([]);
                setCustomerName("");
                setCustomerPhone("");
                if (afterA === 'back') {
                    navigation.goBack();
                } else {
                    Alert.alert("Success", "Bill saved. Ready for next transaction.");
                }
            };

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
                Alert.alert(
                    "Success", 
                    "Transaction finalized and uploaded.",
                    [
                        {
                            text: "Print Receipt",
                            onPress: async () => {
                                await printReceipt(printData);
                                finalizeUI();
                            }
                        },
                        {
                            text: "Done",
                            onPress: () => finalizeUI()
                        }
                    ]
                );
            }
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
            
            <LinearGradient colors={HEADER_GRADIENT} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
                        <Feather name="arrow-left" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.headerTitle}>BILLING<Text style={{ color: '#f97316' }}>.</Text></Text>
                    </View>
                </View>

                <View style={styles.searchBarContainer}>
                    <Feather name="search" size={16} color="#94a3b8" />
                    <TextInput 
                        placeholder="Search Inventory..." 
                        style={styles.searchInput}
                        placeholderTextColor="#475569"
                        value={productSearchTerm}
                        onChangeText={setProductSearchTerm}
                    />
                    <TouchableOpacity onPress={() => navigation.navigate('ScannerScreen')} style={styles.inlineScanner}>
                        <Feather name="maximize" size={16} color="#f97316" />
                    </TouchableOpacity>
                </View>

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
                contentContainerStyle={styles.listContent}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleProductPress(item)} style={styles.card}>
                        <View style={styles.imageContainer}>
                            {item.image || item.images?.[0] ? <Image source={{ uri: item.image || item.images?.[0] }} style={styles.productImg} /> : <Feather name="package" size={24} color="#cbd5e1" />}
                        </View>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.itemFooter}>
                            <Text style={styles.itemPrice}>₹{Number(item.offer_price || item.price || 0).toLocaleString()}</Text>
                            <View style={styles.stockBadge}><Text style={styles.stockText}>{item.total_stock || 0} U</Text></View>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {cart.length > 0 && (
                <View style={[styles.footerBar, { bottom: 10 }]}>
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
                        <Text style={styles.variantTitle}>{selectedProduct?.name}</Text>
                        
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
                                        <TouchableOpacity key={idx} style={styles.variantBtn} onPress={() => addToCart(selectedProduct as Product, v)}>
                                            <Text style={styles.vQty}>{v.quantity}{v.unit}</Text>
                                            <Text style={styles.vPrice}>₹{v.sellingPrice || v.mrp || 0}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                        
                        <TouchableOpacity style={styles.confirmAddBtn} onPress={() => addToCart(selectedProduct as Product)}>
                           <Text style={styles.confirmAddTxt}>ADD TO CART</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowVariantModal(false)}><Text style={styles.cancelTxt}>CANCEL</Text></TouchableOpacity>
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
    headerIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 15, marginBottom: 15 },
    searchInput: { flex: 1, height: 45, fontSize: 13, fontWeight: '700', color: '#0f172a', paddingLeft: 10 },
    inlineScanner: { padding: 5 },
    customerFormRow: { flexDirection: 'row', gap: 10 },
    miniInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 40 },
    miniInput: { flex: 1, marginLeft: 8, fontSize: 11, fontWeight: '700', color: 'rgba(0, 0, 0, 0.78)' },
    listContent: { padding: 12, paddingBottom: 120 },
    card: { backgroundColor: '#fff', borderRadius: 24, margin: 6, padding: 12, flex: 1, borderWidth: 1, borderColor: '#f1f5f9' },
    imageContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#f8fafc', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10, overflow: 'hidden' },
    productImg: { width: '100%', height: '100%' },
    itemName: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
    itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    itemPrice: { fontSize: 14, fontWeight: '900', color: '#E11D48' },
    stockBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    stockText: { fontSize: 8, fontWeight: '900', color: '#22c55e' },
    footerBar: { position: 'absolute', left: 24, right: 24, flexDirection: 'row', gap: 12, zIndex: 100 },
    cartBtn: { flex: 1, height: 60, backgroundColor: '#0f172a', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, elevation: 8 },
    cartIconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    cartInfo: { flex: 1, marginLeft: 12 },
    cartVal: { color: '#fff', fontSize: 16, fontWeight: '900' },
    cartCount: { color: '#64748b', fontSize: 8, fontWeight: '800' },
    commitBtn: { width: 60, height: 60, backgroundColor: '#E11D48', borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, maxHeight: '85%' },
    modalCloseBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    modalPill: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
    cartScroll: { marginBottom: 20 },
    cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 20, marginBottom: 10 },
    cartItemMeta: { flex: 1 },
    cartItemName: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
    cartItemPrice: { fontSize: 10, fontWeight: '800', color: '#E11D48', marginTop: 1 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 5, paddingHorizontal: 10, gap: 12 },
    qtyValue: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
    modalFooter: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    taxLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 2 },
    totalLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8' },
    totalVal: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    finalizeBtn: { backgroundColor: '#E11D48', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 18 },
    finalizeTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
    variantSheet: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, alignItems: 'center' },
    variantTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
    qtyPicker: { width: '100%', alignItems: 'center', marginBottom: 25, backgroundColor: '#f8fafc', padding: 20, borderRadius: 24 },
    pickerLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 15, textTransform: 'uppercase' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    qtyBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', elevation: 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    qtyInput: { fontSize: 24, fontWeight: '900', color: '#0f172a', width: 80, textAlign: 'center' },
    variantGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
    variantBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', minWidth: 80 },
    confirmAddBtn: { backgroundColor: '#f97316', width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginBottom: 15, elevation: 4 },
    confirmAddTxt: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    vQty: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
    vPrice: { fontSize: 11, fontWeight: '800', color: '#E11D48', marginTop: 4 },
    cancelTxt: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
});
