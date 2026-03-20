import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    FlatList, Modal, ActivityIndicator, Alert,
    StatusBar, Dimensions, Platform, Image
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { fetchProducts, fetchCategories, createBill, Product, Category, BillPayload } from "../api";

const { width } = Dimensions.get('window');

const CreateBilling = () => {
    const navigation = useNavigation<any>();
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

    useEffect(() => {
        const loadInitialData = async () => {
            if (!token) return;
            try {
                const [pData, cData] = await Promise.all([
                    fetchProducts(token),
                    fetchCategories(token)
                ]);
                
                // Robust response handling for products
                let pItems = [];
                if (Array.isArray(pData)) {
                    pItems = pData;
                } else if (pData && typeof pData === 'object') {
                    const obj = pData as any;
                    pItems = obj.products || obj.data || obj.items || [];
                }
                setProducts(pItems);

                // Robust response handling for categories
                let cItems = [];
                if (Array.isArray(cData)) {
                    cItems = cData;
                } else if (cData && typeof cData === 'object') {
                    const obj = cData as any;
                    cItems = obj.categories || obj.data || obj.items || [];
                }
                setCategories(cItems);

            } catch (err) {
                console.error("Failed to load initial data", err);
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
            const normalizedSearch = (productSearchTerm || "").toLowerCase();
            const pName = (p.name || "").toLowerCase();
            const pCode = (p.product_code || String(p.id || "")).toLowerCase();
            return matchCat && (pName.includes(normalizedSearch) || pCode.includes(normalizedSearch));
        });
    }, [products, selectedCategory, productSearchTerm]);

    const handleProductPress = (product: Product) => {
        if (product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setShowVariantModal(true);
        } else {
            addToCart(product);
        }
    };

    const addToCart = (product: Product, variant?: any) => {
        const itemId = variant ? `${product.id}-${variant.quantity}-${variant.unit}` : String(product.id);
        
        setCart(prev => {
            const exists = prev.find(item => item.id === itemId);
            if (exists) {
                return prev.map(item => 
                    item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            const price = variant 
                ? Number(variant.sellingPrice || variant.mrp || 0) 
                : Number(product.offer_price || product.price || 0);

            return [...prev, {
                id: itemId,
                product_id: product.id,
                name: variant ? `${product.name} (${variant.quantity}${variant.unit})` : product.name,
                price: price,
                quantity: 1,
                image: product.images?.[0] || null
            }];
        });
        
        setShowVariantModal(false);
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleFinalizeBill = async () => {
        if (!customerName || !customerPhone) {
            Alert.alert("Customer Details", "Full name and contact number required for processing.");
            return;
        }
        if (cart.length === 0) {
            Alert.alert("Empty Terminal", "Add items to the manifest before finalization.");
            return;
        }

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

            console.log("Syncing Bill Payload:", JSON.stringify(payload));
            
            await createBill(payload, token);

            Alert.alert("Success", "Transaction synchronized with Global Vault.");
            setCart([]);
            setCustomerName("");
            setCustomerPhone("");
            navigation.goBack();
        } catch (err: any) {
            console.error("Sync Error Details:", err);
            const errorMsg = err?.message || "Failed to upload transaction data. Check your network or details.";
            Alert.alert("Sync Error", errorMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#E11D48" size="large" />
                <Text style={{ marginTop: 20, fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 }}>SYNCING TERMINAL...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header Section */}
            <View className="px-6 pt-2 pb-6 bg-white shadow-sm border-b border-gray-50">
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center">
                        <Feather name="arrow-left" size={20} color="#1e293b" />
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="text-xl font-black text-slate-900 tracking-tighter italic">new.billing<Text className="text-rose-600">.</Text></Text>
                    </View>
                    <TouchableOpacity className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center">
                        <Feather name="search" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                {/* Customer Details Inputs */}
                <View className="flex-row space-x-3">
                    <View className="flex-1 bg-gray-50 rounded-2xl p-3 flex-row items-center">
                        <Feather name="user" size={14} color="#cbd5e1" className="mr-3" />
                        <TextInput 
                            placeholder="Full Name" 
                            className="flex-1 font-bold text-slate-800 text-xs" 
                            placeholderTextColor="#cbd5e1"
                            value={customerName}
                            onChangeText={setCustomerName}
                        />
                    </View>
                    <View className="flex-1 bg-gray-50 rounded-2xl p-3 flex-row items-center">
                        <Feather name="phone" size={14} color="#cbd5e1" className="mr-3" />
                        <TextInput 
                            placeholder="Phone Number" 
                            keyboardType="phone-pad"
                            className="flex-1 font-bold text-slate-800 text-xs" 
                            placeholderTextColor="#cbd5e1"
                            value={customerPhone}
                            onChangeText={setCustomerPhone}
                        />
                    </View>
                </View>
            </View>

            {/* Inventory Controls */}
            <View className="px-6 pt-6 flex-row items-center justify-between">
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Inventory</Text>
                <View className="flex-row bg-gray-50 rounded-xl p-1">
                    <TouchableOpacity 
                        onPress={() => setViewMode("grid")}
                        className={`px-3 py-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Feather name="grid" size={14} color={viewMode === 'grid' ? '#E11D48' : '#94a3b8'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setViewMode("list")}
                        className={`px-3 py-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Feather name="list" size={14} color={viewMode === 'list' ? '#E11D48' : '#94a3b8'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Product Feed */}
            <FlatList
                data={filteredProducts}
                key={viewMode}
                numColumns={viewMode === 'grid' ? 2 : 1}
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        onPress={() => handleProductPress(item)}
                        style={{ elevation: 2 }}
                        className={`bg-white rounded-[32px] m-2 p-4 border border-gray-100 ${viewMode === 'grid' ? 'flex-1' : 'flex-row items-center'}`}
                    >
                        <View className={`bg-slate-50 rounded-3xl items-center justify-center overflow-hidden ${viewMode === 'grid' ? 'w-full aspect-square mb-4' : 'w-16 h-16 mr-4'}`}>
                            {item.image || item.images?.[0] ? (
                                <Image 
                                    source={{ uri: item.image || item.images?.[0] }} 
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Feather name="package" size={viewMode === 'grid' ? 32 : 24} color="#cbd5e1" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs font-black text-slate-900 tracking-tight text-center sm:text-left">{item.name}</Text>
                            <Text className="text-[8px] font-black text-gray-400 uppercase mt-1 text-center sm:text-left">PRD-{item.id}</Text>
                            <View className="flex-row items-center justify-between mt-3">
                                <Text className="text-sm font-black text-rose-600 italic">₹{Number(item.offer_price || item.price || 0)}</Text>
                                <View className="bg-emerald-50 px-2 py-0.5 rounded-md">
                                    <Text className="text-[8px] font-black text-emerald-600">{item.total_stock || 0} U</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                    <View className="items-center py-20 opacity-20">
                        <Feather name="package" size={48} color="#64748b" />
                        <Text className="mt-4 font-black uppercase text-[10px] tracking-widest">No stock records</Text>
                    </View>
                )}
            />

            {/* Floating Action Bar */}
            {cart.length > 0 && (
                <View className="absolute bottom-10 left-6 right-6 flex-row items-center space-x-3">
                    <TouchableOpacity 
                        onPress={() => setShowCart(true)}
                        style={{ elevation: 20, shadowColor: '#1e293b', shadowOpacity: 0.3, shadowRadius: 10 }}
                        className="flex-1 h-16 bg-slate-900 rounded-[28px] flex-row items-center px-6"
                    >
                        <View className="w-10 h-10 bg-white/10 rounded-2xl items-center justify-center">
                            <Feather name="shopping-bag" size={18} color="white" />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="text-white text-sm font-black italic">₹{cartTotal.toLocaleString()}</Text>
                            <Text className="text-white/40 text-[9px] font-black uppercase tracking-widest">{cartItemCount} Items added</Text>
                        </View>
                        <Feather name="chevron-up" size={16} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={handleFinalizeBill}
                        style={{ elevation: 20, shadowColor: '#E11D48', shadowOpacity: 0.3, shadowRadius: 10 }}
                        className="w-16 h-16 bg-rose-600 rounded-[28px] items-center justify-center"
                    >
                        {saving ? <ActivityIndicator color="white" /> : <Feather name="check-circle" size={24} color="white" />}
                    </TouchableOpacity>
                </View>
            )}

            {/* Cart Modal */}
            <Modal visible={showCart} animationType="slide" transparent>
                <View className="flex-1 bg-black/40 justify-end">
                    <TouchableOpacity className="flex-1" onPress={() => setShowCart(false)} />
                    <View className="bg-white rounded-t-[50px] p-8 max-h-[85%]">
                        <View className="w-12 h-1 bg-gray-200 rounded-full self-center mb-8" />
                        <View className="flex-row items-center justify-between mb-8">
                            <Text className="text-2xl font-black text-slate-900 italic">cart.manifest<Text className="text-rose-600">.</Text></Text>
                            <TouchableOpacity onPress={() => setShowCart(false)}>
                                <Feather name="x" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {cart.map((item, index) => (
                                <View key={item.id} className="flex-row items-center mb-6 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                                    <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center">
                                        <Feather name="file-text" size={20} color="#cbd5e1" />
                                    </View>
                                    <View className="flex-1 ml-4">
                                        <Text className="text-xs font-black text-slate-800 uppercase tracking-tight">{item.name}</Text>
                                        <Text className="text-[10px] font-black text-rose-500 mt-1">₹{item.price.toLocaleString()}</Text>
                                    </View>
                                    <View className="flex-row items-center bg-white rounded-2xl p-1 px-3 border border-slate-100">
                                        <TouchableOpacity onPress={() => updateQuantity(item.id, -1)}>
                                            <Feather name="minus" size={12} color="#94a3b8" />
                                        </TouchableOpacity>
                                        <Text className="mx-4 font-black text-slate-900 text-xs">{item.quantity}</Text>
                                        <TouchableOpacity onPress={() => updateQuantity(item.id, 1)}>
                                            <Feather name="plus" size={12} color="#E11D48" />
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(item.id)} className="ml-4">
                                        <Feather name="trash-2" size={16} color="#fda4af" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <View className="mt-8 pt-8 border-t border-slate-50 flex-row items-center justify-between">
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Valuation</Text>
                                <Text className="text-3xl font-black text-slate-900 italic">₹{cartTotal.toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={handleFinalizeBill}
                                className="bg-rose-600 px-10 py-5 rounded-[28px] shadow-xl shadow-rose-200"
                            >
                                <Text className="text-white font-black uppercase text-[10px] tracking-widest">Commit Bill</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Variant Selector */}
            <Modal visible={showVariantModal} transparent animationType="fade">
                <View className="flex-1 bg-slate-900/60 items-center justify-center p-6">
                    <View className="bg-white w-full rounded-[48px] p-10">
                        <Text className="text-3xl font-black text-slate-900 tracking-tighter italic mb-2">select.variant<Text className="text-rose-600">.</Text></Text>
                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{selectedProduct?.name}</Text>
                        
                        <ScrollView className="max-h-[300px]">
                            {selectedProduct?.variants?.map((v, i) => (
                                <TouchableOpacity 
                                    key={i} 
                                    onPress={() => addToCart(selectedProduct!, v)}
                                    className="bg-slate-50 p-6 rounded-[32px] mb-4 flex-row items-center justify-between border border-transparent"
                                >
                                    <View>
                                        <Text className="font-black text-slate-900 uppercase text-xs">{v.quantity} {v.unit}</Text>
                                        <Text className="text-[8px] font-black text-emerald-500 uppercase mt-1 tracking-widest">Avail: {v.stock}</Text>
                                    </View>
                                    <Text className="text-base font-black text-rose-600">₹{Number(v.sellingPrice || v.mrp || 0)}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity 
                            onPress={() => setShowVariantModal(false)}
                            className="mt-8 py-5 bg-slate-900 rounded-[28px] items-center"
                        >
                            <Text className="text-white font-black uppercase text-[10px] tracking-widest">Return to Feed</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default CreateBilling;
