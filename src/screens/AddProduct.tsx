import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  StyleSheet,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchCategories,
  createProduct,
  updateProduct,
  fetchProductById,
  fetchNextProductId,
  ProductData
} from '../api';
import { getTamilProductName } from '../utils/tamilProductNames';
import { transliterateToTamil } from '../utils/tamilPhonetic';
import Toast from 'react-native-toast-message';

const SCREEN_WIDTH = Dimensions.get('window').width;

const AddProduct = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { id, initialName } = (route.params as any) || {};
  const isEdit = !!id;
  const { token } = useAuth();

  const [showImageModal, setShowImageModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMfgPicker, setShowMfgPicker] = useState(false);
  const [showExpPicker, setShowExpPicker] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const [formData, setFormData] = useState<any>({
    product_code: '',
    name: initialName || '',
    name_tamil: initialName ? (getTamilProductName(initialName) || transliterateToTamil(initialName)) : '',
    name_tanglish: '',
    description: '',
    rating: '',
    category: '',
    subcategory: '',
    status: 'Active',
    total_stock: 0,
    mrp: '',
    discount: '',
    offer_price: '',
    variants: [
      {
        quantity: '',
        unit: 'kg',
        mrp: '',
        discount: '',
        sellingPrice: '',
        stock: '',
      },
    ],
    expiry: { mfgDate: '', expDate: '', batchNo: '' },
    supplier: { name: '', contact: '' },
    images: [],
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const cats = await fetchCategories(token);
        setCategories(cats);

        if (isEdit) {
          const product = await fetchProductById(id, token);
          setFormData({
            ...product,
            subcategory: product.subcategory || product.subCategory || '',
            mrp: String(product.mrp || ''),
            discount: String(product.discount || ''),
            offer_price: String(product.offer_price || ''),
            total_stock: product.total_stock || 0,
            expiry: product.expiry || { mfgDate: '', expDate: '', batchNo: '' },
            supplier: product.supplier || { name: '', contact: '' },
            variants: product.variants?.length
              ? product.variants
              : [{ quantity: '', unit: 'kg', mrp: '', discount: '', sellingPrice: '', stock: '' }],
          });
          if (product.category) {
            const cat = cats.find((c: any) => c.name === product.category);
            setSelectedCategory(cat);
          }
        } else {
          // New Product - Fetch Next ID
          try {
            const res = await fetchNextProductId(token);
            if (res.nextId) {
              setFormData((prev: any) => ({ ...prev, product_code: res.nextId }));
            }
          } catch (e) {
            console.error('Error fetching next product ID:', e);
          }
        }
      } catch (err) {
        console.error('Init error:', err);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load initial data',
        });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit, token]);

  const handleChange = (name: string, value: string, section?: string) => {
    setFormData((prev: any) => {
      let next = { ...prev };
      if (section) {
        next[section] = { ...prev[section], [name]: value };
      } else {
        next[name] = value;
      }

      // Auto Tamil translation when name is typed
      if (name === 'name') {
        next.name_tamil = getTamilProductName(value) || transliterateToTamil(value);
      }

      // Auto calculation for top level
      if (!section && (name === 'mrp' || name === 'discount')) {
        const mrp = Number(next.mrp);
        const discount = Number(next.discount);
        if (mrp && !isNaN(mrp)) {
          next.offer_price = String((mrp - (mrp * (discount || 0)) / 100).toFixed(2));
        }
      }

      if (name === 'category') {
        const cat = categories.find((c: any) => c.name === value);
        setSelectedCategory(cat);
        next.subcategory = '';
      }

      return next;
    });
  };

  const handleVariantChange = (i: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const updatedVariants = [...prev.variants];
      const prevWeight = updatedVariants[i].quantity;
      updatedVariants[i] = { ...updatedVariants[i], [field]: value };

      // Auto-fill stock from weight (quantity) if stock is empty/zero or matches previous weight
      if (field === 'quantity') {
        const currentStock = updatedVariants[i].stock;
        if (currentStock === '' || currentStock === '0' || currentStock === prevWeight) {
          updatedVariants[i].stock = value;
        }
      }

      // Calculate selling price for this variant
      if (field === 'mrp' || field === 'discount') {
        const mrp = Number(updatedVariants[i].mrp);
        const discount = Number(updatedVariants[i].discount);
        if (mrp && !isNaN(mrp)) {
          updatedVariants[i].sellingPrice = String((mrp - (mrp * (discount || 0)) / 100).toFixed(2));
        } else {
          updatedVariants[i].sellingPrice = '';
        }
      }

      // Calculate new total stock
      const newTotal = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

      return {
        ...prev,
        variants: updatedVariants,
        total_stock: newTotal,
      };
    });
  };

  const addVariant = () => {
    setFormData((prev: any) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { quantity: '', unit: 'kg', mrp: '', discount: '', sellingPrice: '', stock: '' },
      ],
    }));
  };

  const removeVariant = (i: number) => {
    const updated = formData.variants.filter((_: any, idx: number) => idx !== i);
    setFormData({ ...formData, variants: updated });
  };

  const handlePickImage = async () => {
    if (formData.images.length >= 5) {
      Toast.show({
        type: 'error',
        text1: 'Limit Reached',
        text2: 'You can upload up to 5 images',
      });
      return;
    }

   setShowImageModal(true);
  };

  const openPicker = async (type: 'camera' | 'gallery') => {
    const options: any = {
      mediaType: 'photo',
      selectionLimit: 5 - formData.images.length,
      includeBase64: true,
      quality: 0.8,
    };

    const method = type === 'camera' ? import('react-native-image-picker').then(m => m.launchCamera) : import('react-native-image-picker').then(m => m.launchImageLibrary);

    // Using import for dynamic or just the imported ones
    const picker = type === 'camera' ? (await import('react-native-image-picker')).launchCamera : (await import('react-native-image-picker')).launchImageLibrary;

    picker(options, (result: any) => {
      if (result.assets) {
        const newImages = result.assets
          .filter((asset: any) => asset.base64)
          .map((asset: any) => `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`);

        setFormData((prev: any) => ({
          ...prev,
          images: [...(prev.images || []), ...newImages],
        }));
      }
    });
  };

  const removeImage = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Name and Category are required',
      });
      return;
    }

    setSaving(true);
    try {
      const payload: ProductData = {
        ...formData,
        price: Number(formData.offer_price) || Number(formData.variants[0]?.sellingPrice) || 0,
        mrp: Number(formData.mrp),
        offer_price: Number(formData.offer_price),
        total_stock: Number(formData.total_stock),
      };

      if (isEdit) {
        await updateProduct(id, payload, token);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Product updated successfully!',
        });
      } else {
        await createProduct(payload, token);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Product created successfully!',
        });
      }
      navigation.goBack();
    } catch (err: any) {
      console.error('Save error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Failed to save product',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      <View 
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Icon name="check" size={24} color="#ffffff" />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ... */}
        <FormSection title="Core Details" icon="info">
          {isEdit && formData.id ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Product ID</Text>
              <View style={[styles.input, { backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' }]}>
                <Icon name="hash" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#64748b' }}>{formData.id}</Text>
              </View>
            </View>
          ) : null}
          <FormInput
            label="Product Name"
            value={formData.name}
            onChangeText={(v: string) => handleChange('name', v)}
            placeholder="e.g. Organic Brown Rice"
          />
          <FormInput
            label="Tamil Name"
            value={formData.name_tamil}
            onChangeText={(v: string) => handleChange('name_tamil', v)}
            placeholder="ஆர்கானிக் அரிசி"
          />
          <FormInput
            label="Tanglish Name (Tamil in English)"
            value={formData.name_tanglish}
            onChangeText={(v: string) => handleChange('name_tanglish', v)}
            placeholder="e.g. Organic Arisi"
          />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Product Code / Barcode</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingRight: 4 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: 'transparent' }]}
                value={formData.product_code}
                onChangeText={(v: string) => handleChange('product_code', v)}
                placeholder="PB001"
                placeholderTextColor="#cbd5e1"
                keyboardType="default"
              />
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="maximize" size={14} color="#eff6ff" />
              </View>
            </View>
          </View>
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>Generated Barcode Preview</Text>
            <View style={styles.barcodePreviewContainer}>
              {formData.product_code ? (
                <>
                  <Image
                    source={{
                      uri: `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(
                        formData.product_code,
                      )}&scale=5&rotate=N&includetext=true`,
                    }}
                    style={styles.barcodeImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.barcodeHint}>Scan code for product lookup</Text>
                </>
              ) : (
                <View style={styles.barcodePlaceholder}>
                  <Icon name="slash" size={24} color="#e2e8f0" />
                  <Text style={styles.barcodeHint}>Identify product with custom code</Text>
                </View>
              )}
            </View>
          </View>
          <FormInput
            label="Description"
            value={formData.description}
            onChangeText={(v: string) => handleChange('description', v)}
            placeholder="Product details..."
            multiline
            numberOfLines={4}
          />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {categories.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => handleChange('category', c.name)}
                    style={[styles.chip, formData.category === c.name && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, formData.category === c.name && styles.chipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          {selectedCategory?.subcategories?.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Sub-Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {selectedCategory.subcategories.map((s: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleChange('subcategory', s)}
                    style={[styles.chip, formData.subcategory === s && styles.chipActiveSub]}
                  >
                    <Text style={[styles.chipText, formData.subcategory === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[styles.row, { marginTop: 16 }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <FormInput
                label="Rating (1-5)"
                value={formData.rating}
                onChangeText={(v: string) => handleChange('rating', v)}
                placeholder="4.5"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerContainer}>
                {['Active', 'Inactive', 'Out of Stock'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => handleChange('status', st)}
                    style={[styles.statusChip, formData.status === st && styles.statusActive]}
                  >
                    <Text style={[styles.statusText, formData.status === st && styles.statusTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </FormSection>

        <FormSection title="Pricing & Media" icon="image">
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <FormInput
                label="MRP"
                value={formData.mrp}
                onChangeText={(v: string) => handleChange('mrp', v)}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 0.8, marginRight: 8 }}>
              <FormInput
                label="Off %"
                value={formData.discount}
                onChangeText={(v: string) => handleChange('discount', v)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput
                label="Offer Price"
                value={formData.offer_price}
                editable={false}
                placeholder="0.00"
                style={[styles.input, { backgroundColor: '#f1f5f9', color: '#64748b' }]}
              />
            </View>
          </View>

          <Text style={styles.label}>Product Images (Max 5)</Text>
          <ScrollView horizontal style={styles.imageScroll}>
            <TouchableOpacity style={styles.addImage} onPress={handlePickImage}>
              <Icon name="plus" size={24} color="#94a3b8" />
            </TouchableOpacity>
            {formData.images.map((img: string, i: number) => (
              <View key={i} style={styles.imageWrapper}>
                <Image source={{ uri: img }} style={styles.image} />
                <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(i)}>
                  <Icon name="x" size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </FormSection>

        <FormSection title="Variants" icon="box">
          <View style={styles.totalStockBadge}>
            <Text style={styles.totalStockLabel}>Total Distributed Stock:</Text>
            <Text style={styles.totalStockValue}>{formData.total_stock || 0} Units</Text>
          </View>
          {formData.variants.map((v: any, i: number) => (
            <View key={i} style={styles.variantCard}>
              <View style={styles.variantHeader}>
                <Text style={styles.variantTitle}>Variant #{i + 1}</Text>
                {formData.variants.length > 1 && (
                  <TouchableOpacity onPress={() => removeVariant(i)} style={styles.variantDelete}>
                    <Icon name="trash-2" size={16} color="#2563eb" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.grid}>
                <View style={styles.gridCol}>
                  <Text style={styles.miniLabel}>Qty / Weight</Text>
                  <TextInput
                    style={styles.variantInput}
                    placeholder="e.g. 500"
                    placeholderTextColor="#cbd5e1"
                    value={v.quantity}
                    onChangeText={(val) => handleVariantChange(i, 'quantity', val)}
                  />
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.miniLabel}>Unit</Text>
                  <TextInput
                    style={styles.variantInput}
                    placeholder="e.g. Grams"
                    placeholderTextColor="#cbd5e1"
                    value={v.unit}
                    onChangeText={(val) => handleVariantChange(i, 'unit', val)}
                  />
                </View>
              </View>

              <View style={[styles.grid, { marginTop: 12 }]}>
                <View style={styles.gridCol}>
                  <Text style={styles.miniLabel}>MRP (₹)</Text>
                  <TextInput
                    style={styles.variantInput}
                    placeholder="0.00"
                    placeholderTextColor="#cbd5e1"
                    value={v.mrp}
                    onChangeText={(val) => handleVariantChange(i, 'mrp', val)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.miniLabel}>Discount (%)</Text>
                  <TextInput
                    style={styles.variantInput}
                    placeholder="0"
                    placeholderTextColor="#cbd5e1"
                    value={v.discount}
                    onChangeText={(val) => handleVariantChange(i, 'discount', val)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.grid, { marginTop: 12 }]}>
                <View style={styles.gridCol}>
                  <Text style={styles.miniLabel}>Availability (Stock)</Text>
                  <TextInput
                    style={styles.variantInput}
                    placeholder="0"
                    placeholderTextColor="#cbd5e1"
                    value={v.stock}
                    onChangeText={(val) => handleVariantChange(i, 'stock', val)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.gridCol}>
                  <Text style={[styles.miniLabel, { color: '#2563eb' }]}>Selling Price</Text>
                  <View style={[styles.variantInput, { backgroundColor: '#dbeafe  ', borderBottomColor: '#1e3a8a' }]}>
                    <Text style={{ color: '#2563eb', fontWeight: '900', fontSize: 13 }}>₹ {v.sellingPrice || '0.00'}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addVariant} onPress={addVariant}>
            <Text style={styles.addVariantText}>+ Add Variant</Text>
          </TouchableOpacity>
        </FormSection>

        <FormSection title="Shelf Life & Supplier" icon="truck">
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <Text style={styles.miniLabel}>MFG Date</Text>
              <TouchableOpacity
                onPress={() => setShowMfgPicker(true)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>{formData.expiry.mfgDate || 'Select Date'}</Text>
                <Icon name="calendar" size={14} color="#2563eb" />
              </TouchableOpacity>
              {showMfgPicker && (
                <DateTimePicker
                  value={formData.expiry.mfgDate ? new Date(formData.expiry.mfgDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowMfgPicker(false);
                    if (date) handleChange('mfgDate', date.toISOString().split('T')[0], 'expiry');
                  }}
                />
              )}
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.miniLabel}>EXP Date</Text>
              <TouchableOpacity
                onPress={() => setShowExpPicker(true)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>{formData.expiry.expDate || 'Select Date'}</Text>
                <Icon name="calendar" size={14} color="#F43F5E" />
              </TouchableOpacity>
              {showExpPicker && (
                <DateTimePicker
                  value={formData.expiry.expDate ? new Date(formData.expiry.expDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowExpPicker(false);
                    if (date) handleChange('expDate', date.toISOString().split('T')[0], 'expiry');
                  }}
                />
              )}
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <FormInput
              label="Batch Number"
              value={formData.expiry.batchNo}
              onChangeText={(v: string) => handleChange('batchNo', v, 'expiry')}
              placeholder="B-882-X"
            />
          </View>

          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 }}>
            <FormInput
              label="Supplier Name"
              value={formData.supplier.name}
              onChangeText={(v: string) => handleChange('name', v, 'supplier')}
              placeholder="Full Distribution Co."
            />
            <FormInput
              label="Contact Info"
              value={formData.supplier.contact}
              onChangeText={(v: string) => handleChange('contact', v, 'supplier')}
              placeholder="+91 98765 43210"
            />
          </View>
        </FormSection>

        <TouchableOpacity
          style={[styles.submitButton, saving && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>{isEdit ? 'UPDATE PRODUCT' : 'PUBLISH PRODUCT'}</Text>}
        </TouchableOpacity>
      </ScrollView>
      {showImageModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.imageModalBox}>
      <Text style={styles.modalTitle}>Upload Image</Text>

      <Text style={styles.modalSubText}>
        Choose image source
      </Text>

      <TouchableOpacity
        style={styles.modalBtn}
        onPress={() => {
          setShowImageModal(false);
          openPicker('camera');
        }}
      >
        <Text style={styles.modalBtnText}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modalBtn}
        onPress={() => {
          setShowImageModal(false);
          openPicker('gallery');
        }}
      >
        <Text style={styles.modalBtnText}>Choose from Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.modalBtn, { backgroundColor: '#e2e8f0' }]}
        onPress={() => setShowImageModal(false)}
      >
        <Text style={{ color: '#1e3a8a', fontWeight: '800' }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
    </SafeAreaView>
  );
};

const FormSection = ({ title, icon, children }: any) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={16} color="#64748b" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const FormInput = ({ label, ...props }: any) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, props.multiline && { height: 100, textAlignVertical: 'top' }]}
      placeholderTextColor="#cbd5e1"
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { padding: 16, paddingBottom: 100 },

  section: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    marginLeft: 8,
  },

  inputContainer: { marginBottom: 16 },

  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },

  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },

  row: { flexDirection: 'row', alignItems: 'center' },

  chipScroll: { marginTop: 4 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },

  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },

  chipActiveSub: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },

  chipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e3a8a',
  },

  chipTextActive: { color: '#ffffff' },

  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
  },

  statusActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },

  statusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1e3a8a',
  },

  statusTextActive: { color: '#ffffff' },

  imageScroll: { flexDirection: 'row', marginTop: 8 },

  addImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  imageWrapper: { width: 80, height: 80, marginRight: 12 },

  image: { width: 80, height: 80, borderRadius: 12 },

  removeImage: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  totalStockBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  totalStockLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1e3a8a',
    textTransform: 'uppercase',
  },

  totalStockValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2563eb',
  },

  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },

  dateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
  },

  variantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },

  variantTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
  },

  variantInput: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e3a8a',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    paddingVertical: 8,
  },

  variantDelete: { padding: 4 },

  grid: { flexDirection: 'row', gap: 12 },
  gridCol: { flex: 1 },

  miniLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  addVariant: {
    padding: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 12,
    marginTop: 8,
  },

  addVariantText: {
    color: '#2563eb',
    fontWeight: '900',
    fontSize: 12,
  },

  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
  },

  submitText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },

  barcodePreviewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    marginTop: 8,
  },

  barcodeImage: {
    width: '100%',
    height: 120,
  },

  barcodeHint: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
  },

  barcodePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},

imageModalBox: {
  width: '85%',
  backgroundColor: '#ffffff', // 🤍 WHITE BG
  borderRadius: 16,
  padding: 20,
},

modalTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#2563eb', // 🔵 BLUE
  textAlign: 'center',
  marginBottom: 8,
},

modalSubText: {
  textAlign: 'center',
  color: '#1e3a8a',
  marginBottom: 20,
  fontWeight: '600',
},

modalBtn: {
  backgroundColor: '#2563eb', // 🔵 BLUE BUTTON
  padding: 12,
  borderRadius: 10,
  marginBottom: 10,
  alignItems: 'center',
},

modalBtnText: {
  color: '#ffffff', // 🤍 WHITE TEXT
  fontWeight: '800',
},
});

export default AddProduct;
