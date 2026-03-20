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
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  fetchCategoryById,
  Category
} from '../api';

const AddCategory = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { id } = (route.params as any) || {};
  const isEdit = !!id;
  const { token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    catId: '',
    name: '',
    description: '',
    image: '',
  });

  const [subcategories, setSubcategories] = useState<string[]>(['']);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (!isEdit) {
            // Auto ID Generation matching web logic
            const data = await fetchCategories(token);
            let nextNum = 1;
            if (data && data.length > 0) {
              const ids = data.map((c: any) => {
                const num = parseInt(c.catId?.replace('CAT', ''), 10);
                return isNaN(num) ? 0 : num;
              });
              nextNum = Math.max(...ids, 0) + 1;
            }
            const formattedNum = nextNum.toString().padStart(3, '0');
            setFormData((prev: any) => ({ ...prev, catId: `CAT${formattedNum}` }));
        } else {
          const cat = await fetchCategoryById(id, token);
          setFormData({
            catId: cat.catId || '',
            name: cat.name || '',
            description: cat.description || '',
            image: cat.image || '',
          });
          setSubcategories(cat.subcategories || ['']);
        }
      } catch (err) {
        console.error('Init error:', err);
        Alert.alert('Error', 'Failed to initialize screen');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit, token]);

  const handleSubChange = (index: number, value: string) => {
    const updated = [...subcategories];
    updated[index] = value;
    setSubcategories(updated);
  };

  const addSub = () => setSubcategories([...subcategories, '']);

  const removeSub = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  const handlePickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
    });

    if (result.assets && result.assets[0].base64) {
      const asset = result.assets[0];
      const base64 = `data:${asset.type};base64,${asset.base64}`;
      setFormData((prev: any) => ({ ...prev, image: base64 }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.catId) {
      Alert.alert('Required', 'Name and Category ID are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        subcategories: subcategories.filter(s => s.trim() !== ''),
      };

      if (isEdit) {
        await updateCategory(id, payload, token);
        Alert.alert('Success', 'Category updated successfully');
      } else {
        await createCategory(payload, token);
        Alert.alert('Success', 'Category created successfully');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save category');
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
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Category' : 'Add Category'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#F43F5E" /> : <Icon name="save" size={24} color="#F43F5E" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
            <Text style={styles.label}>Category ID</Text>
            <TextInput 
              style={styles.input} 
              value={formData.catId}
              onChangeText={(v) => setFormData((p: any) => ({ ...p, catId: v }))}
            />

            <Text style={styles.label}>Category Name</Text>
            <TextInput 
              style={styles.input} 
              value={formData.name}
              onChangeText={(v) => setFormData((p: any) => ({ ...p, name: v }))}
              placeholder="e.g. Beverages"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              value={formData.description}
              onChangeText={(v) => setFormData((p: any) => ({ ...p, description: v }))}
              placeholder="Category details..."
              multiline
            />

            <Text style={styles.label}>Category Image</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
               {formData.image ? (
                 <Image source={{ uri: formData.image }} style={styles.preview} />
               ) : (
                 <View style={styles.pickerInner}>
                   <Icon name="image" size={32} color="#cbd5e1" />
                   <Text style={styles.pickerText}>Tap to Upload</Text>
                 </View>
               )}
            </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Subcategories</Text>
            <TouchableOpacity onPress={addSub} style={styles.addButton}>
              <Icon name="plus" size={16} color="#F43F5E" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {subcategories.map((sub, index) => (
            <View key={index} style={styles.subRow}>
              <TextInput 
                style={styles.subInput} 
                value={sub}
                onChangeText={(v) => handleSubChange(index, v)}
                placeholder="Subcategory name"
              />
              {subcategories.length > 1 && (
                <TouchableOpacity onPress={() => removeSub(index)} style={styles.removeButton}>
                  <Icon name="trash-2" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>SAVE CATEGORY</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFDFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  scrollContent: { padding: 16 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 1 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#F8F9FF', borderRadius: 16, padding: 14, fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  imagePicker: { height: 150, backgroundColor: '#F8F9FF', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', overflow: 'hidden' },
  pickerInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pickerText: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginTop: 8 },
  preview: { width: '100%', height: '100%' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { color: '#F43F5E', fontWeight: '900', fontSize: 12 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  subInput: { flex: 1, backgroundColor: '#F8F9FF', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  removeButton: { padding: 4 },
  submitButton: { backgroundColor: '#F43F5E', padding: 16, borderRadius: 16, alignItems: 'center', height: 56, justifyContent: 'center' },
  submitText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});

export default AddCategory;
