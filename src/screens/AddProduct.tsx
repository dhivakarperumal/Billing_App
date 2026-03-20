import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchCategories, 
  createProduct, 
  updateProduct, 
  fetchProductById,
  ProductData
} from '../api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const AddProduct = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { id } = (route.params as any) || {};
  const isEdit = !!id;
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const [formData, setFormData] = useState<any>({
    product_code: '',
    name: '',
    name_tamil: '',
    description: '',
    rating: '',
    category: '',
    subCategory: '',
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
            mrp: String(product.mrp || ''),
            discount: String(product.discount || ''),
            offer_price: String(product.offer_price || ''),
            total_stock: product.total_stock || 0,
            expiry: product.expiry || { mfgDate: '', expDate: '', batchNo: '' },
            supplier: product.supplier || { name: '', contact: '' },
            variants: product.variants?.length ? product.variants : formData.variants,
          });
          if (product.category) {
            const cat = cats.find((c: any) => c.name === product.category);
            setSelectedCategory(cat);
          }
        }
      } catch (err) {
        console.error('Init error:', err);
        Alert.alert('Error', 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit, token]);

  const handleChange = (name: string, value: string, section?: string) => {
    if (section) {
      setFormData((prev: any) => ({
        ...prev,
        [section]: { ...prev[section], [name]: value },
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (name === 'category') {
      const cat = categories.find((c: any) => c.name === value);
      setSelectedCategory(cat);
      setFormData((prev: any) => ({ ...prev, subCategory: '' }));
    }
  };

  const handleVariantChange = (i: number, field: string, value: string) => {
    const updated = [...formData.variants];
    updated[i][field] = value;

    if (field === 'mrp' || field === 'discount') {
      const mrp = Number(updated[i].mrp);
      const discount = Number(updated[i].discount);
      if (mrp && discount >= 0) {
        updated[i].sellingPrice = String((mrp - (mrp * discount) / 100).toFixed(2));
      }
    }

    setFormData({ ...formData, variants: updated });
    
    const newTotal = updated.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    setFormData((prev: any) => ({ ...prev, total_stock: newTotal }));
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
      Alert.alert('Limit reached', 'You can upload up to 5 images.');
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 5 - formData.images.length,
      includeBase64: true,
    });

    if (result.assets) {
      const newImages = result.assets
        .filter((asset: any) => asset.base64)
        .map((asset: any) => `data:${asset.type};base64,${asset.base64}`);
      
      setFormData((prev: any) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      Alert.alert('Validation Error', 'Name and Category are required.');
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
        Alert.alert('Success', 'Product updated successfully!');
      } else {
        await createProduct(payload, token);
        Alert.alert('Success', 'Product created successfully!');
      }
      navigation.goBack();
    } catch (err: any) {
      console.error('Save error:', err);
      Alert.alert('Error', err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F43F5E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#F43F5E" /> : <Icon name="check" size={24} color="#F43F5E" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FormSection title="Core Details" icon="info">
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
            label="Product Code" 
            value={formData.product_code} 
            onChangeText={(v: string) => handleChange('product_code', v)} 
            placeholder="PB001" 
          />
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
            <View style={{ flex: 1 }}>
              <FormInput 
                label="Discount (%)" 
                value={formData.discount} 
                onChangeText={(v: string) => handleChange('discount', v)} 
                placeholder="0" 
                keyboardType="numeric"
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
          {formData.variants.map((v: any, i: number) => (
            <View key={i} style={styles.variantCard}>
              <View style={styles.row}>
                <TextInput 
                  style={[styles.variantInput, { flex: 2 }]} 
                  placeholder="Qty (e.g. 500)" 
                  value={v.quantity} 
                  onChangeText={(val) => handleVariantChange(i, 'quantity', val)}
                />
                <TextInput 
                  style={[styles.variantInput, { flex: 1 }]} 
                  placeholder="Unit (kg)" 
                  value={v.unit} 
                  onChangeText={(val) => handleVariantChange(i, 'unit', val)}
                />
                <TextInput 
                  style={[styles.variantInput, { flex: 1 }]} 
                  placeholder="Stock" 
                  value={v.stock} 
                  onChangeText={(val) => handleVariantChange(i, 'stock', val)}
                />
                {formData.variants.length > 1 && (
                  <TouchableOpacity onPress={() => removeVariant(i)} style={styles.variantDelete}>
                    <Icon name="trash-2" size={18} color="#F43F5E" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addVariant} onPress={addVariant}>
            <Text style={styles.addVariantText}>+ Add Variant</Text>
          </TouchableOpacity>
        </FormSection>

        <TouchableOpacity 
          style={[styles.submitButton, saving && { opacity: 0.7 }]} 
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>{isEdit ? 'UPDATE PRODUCT' : 'PUBLISH PRODUCT'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginLeft: 8 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chipScroll: { marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#F43F5E', borderColor: '#F43F5E' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  chipTextActive: { color: 'white' },
  imageScroll: { flexDirection: 'row', marginTop: 8 },
  addImage: { width: 80, height: 80, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  imageWrapper: { width: 80, height: 80, marginRight: 12 },
  image: { width: 80, height: 80, borderRadius: 12 },
  removeImage: { position: 'absolute', top: -5, right: -5, backgroundColor: '#F43F5E', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  variantCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, marginBottom: 8 },
  variantInput: { fontSize: 12, fontWeight: '700', color: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginRight: 8, paddingVertical: 4 },
  variantDelete: { padding: 4 },
  addVariant: { padding: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#F43F5E', borderRadius: 12, marginTop: 8 },
  addVariantText: { color: '#F43F5E', fontWeight: '900', fontSize: 12 },
  submitButton: { backgroundColor: '#F43F5E', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16, elevation: 4 },
  submitText: { color: 'white', fontWeight: '900', fontSize: 14 },
});

export default AddProduct;
