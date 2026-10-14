import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, TextInput, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChevronLeft, Edit, Plus, Trash2, Camera, MapPin, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { UploadBottomSheet } from '../../components/vendor/UploadBottomSheet';
import { KYCFile } from '../../services/fileUploadService';

type NavigationProp = StackNavigationProp<RootStackParamList>;

type TabType = 'info' | 'gallery' | 'location' | 'cover';

const CATEGORIES = [
  { slug: 'food', nameEn: 'Bakery, Cakes, Desserts', nameMr: 'बेकरी, केक्स, मिष्टान्न' },
  { slug: 'salon', nameEn: 'Salon & Beauty', nameMr: 'सलून आणि सौंदर्य' },
  { slug: 'cleaning', nameEn: 'Home Cleaning', nameMr: 'घर स्वच्छता' },
  { slug: 'repairs', nameEn: 'Appliance Repairs', nameMr: 'उपकरण दुरुस्ती' }
];

export const ManageBusinessScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, preferredLanguage, fetchVendorProfile } = useAuthStore();
  const isMr = preferredLanguage === 'mr';

  const [vendor, setVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('gallery');

  // Business Info Form States
  const [bizName, setBizName] = useState('');
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState('09:00 AM - 09:00 PM');
  const [contactNumber, setContactNumber] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);

  // Gallery/Cover Media States
  const [gallery, setGallery] = useState<any[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);

  // Upload Modal State
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'gallery' | 'cover'>('gallery');

  const loadVendorData = async () => {
    if (!user) return;
    try {
      const profile = await api.getVendorByUserId(user.id);
      if (profile) {
        setVendor(profile);
        setBizName(isMr ? (profile.businessNameMr || profile.businessNameEn) : profile.businessNameEn);
        
        const cat = CATEGORIES.find(c => c.slug === profile.categorySlug) || CATEGORIES[0];
        setSelectedCat(cat);
        
        setDescription(isMr ? (profile.descriptionMr || profile.descriptionEn) : profile.descriptionEn);
        setAddress(profile.formattedAddress || profile.area || '');
        setContactNumber(profile.phone || user.phone || '');
        
        if (profile.galleryUrls) {
          try {
            const list = JSON.parse(profile.galleryUrls);
            if (Array.isArray(list)) setGallery(list);
          } catch {}
        }
        setCoverPhoto(profile.coverPhotoUrl || null);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadVendorData();
    }, [user])
  );

  const handleUpdateChanges = async () => {
    setSaving(true);
    try {
      await api.updateVendorFirstTimeSetup({
        businessNameEn: bizName,
        businessNameMr: isMr ? bizName : undefined,
        descriptionEn: description,
        descriptionMr: isMr ? description : undefined,
        categorySlug: selectedCat.slug,
        categoryNameEn: selectedCat.nameEn,
        categoryNameMr: selectedCat.nameMr,
        formattedAddress: address,
        phone: contactNumber,
      });
      await fetchVendorProfile();
      Alert.alert(isMr ? 'यशस्वी' : 'Success', isMr ? 'बदल यशस्वीरित्या जतन केले!' : 'Business details updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update details.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = () => {
    setUploadTarget('gallery');
    setUploadVisible(true);
  };

  const handleChangeCover = () => {
    setUploadTarget('cover');
    setUploadVisible(true);
  };

  const handleFileSelected = async (file: KYCFile) => {
    setSaving(true);
    try {
      if (uploadTarget === 'gallery') {
        const updatedGallery = [...gallery, 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500'];
        setGallery(updatedGallery);
        
        await api.updateVendorFirstTimeSetup({
          gallery: updatedGallery.map(url => ({ previewUri: url }))
        });
      } else {
        const mockCover = 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=1000';
        setCoverPhoto(mockCover);
        await api.updateVendorFirstTimeSetup({
          coverPhoto: { fileData: 'mock_base64', mimeType: 'image/jpeg' }
        });
      }
      await fetchVendorProfile();
    } catch (err) {
      console.warn('Failed to upload:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async (index: number) => {
    const updated = gallery.filter((_, i) => i !== index);
    setGallery(updated);
    setSaving(true);
    try {
      await api.updateVendorFirstTimeSetup({
        gallery: updated.map(url => ({ previewUri: url }))
      });
      await fetchVendorProfile();
    } catch (err) {
      console.warn(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E58A2B" />
      </SafeAreaView>
    );
  }

  const categoryName = isMr ? selectedCat.nameMr : selectedCat.nameEn;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#2A2520" />
        </Pressable>
        <Text style={styles.headerTitle}>{isMr ? 'व्यवसाय व्यवस्थापन' : 'Manage Business'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Card: Basic Info */}
        <View style={styles.topCard}>
          <Image source={{ uri: coverPhoto || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500' }} style={styles.topCardImage} />
          <View style={styles.topCardInfo}>
            <Text style={styles.bizNameText}>{bizName || "Aai's Bakery"}</Text>
            <Text style={styles.bizSubText}>{categoryName}</Text>
            <Text style={styles.bizSubText}>{address}</Text>
          </View>
          <View style={styles.topCardRight}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{isMr ? 'मंजूर' : 'Approved'}</Text>
            </View>
            <Pressable onPress={() => setActiveTab('info')} style={styles.editBtn} hitSlop={10}>
              <Edit size={16} color="#E58A2B" />
            </Pressable>
          </View>
        </View>

        {/* Tab Buttons bar */}
        <View style={styles.tabBar}>
          {(['info', 'gallery', 'location', 'cover'] as TabType[]).map((tab) => {
            const label = 
              tab === 'info' ? (isMr ? 'माहिती' : 'Business Info') :
              tab === 'gallery' ? (isMr ? 'गॅलरी' : 'Gallery') :
              tab === 'location' ? (isMr ? 'पत्ता' : 'Location') :
              (isMr ? 'कव्हर फोटो' : 'Cover Photo');
            const isActive = activeTab === tab;
            return (
              <Pressable 
                key={tab} 
                onPress={() => setActiveTab(tab)} 
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tab Views */}
        {activeTab === 'gallery' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.tabSectionTitle}>{isMr ? 'गॅलरी फोटो' : 'Gallery Photos'}</Text>
                <Text style={styles.tabSectionSub}>{isMr ? 'फोटोंसह तुमचा व्यवसाय सादर करा' : 'Showcase your business with photos'}</Text>
              </View>
              <Pressable onPress={handleAddPhoto} style={styles.addPhotoBtn}>
                <Plus size={16} color="#E58A2B" />
                <Text style={styles.addPhotoBtnText}>{isMr ? 'फोटो जोडा +' : 'Add Photos +'}</Text>
              </Pressable>
            </View>

            {gallery.length === 0 ? (
              <View style={styles.emptyGallery}>
                <Text style={styles.emptyGalleryText}>No photos added yet. Add photos to showcase your business.</Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {gallery.map((url, idx) => (
                  <View key={idx} style={styles.photoGridCard}>
                    <Image source={{ uri: url }} style={styles.gridImage} />
                    <Pressable onPress={() => handleDeletePhoto(idx)} style={styles.deletePhotoBadge} hitSlop={10}>
                      <X size={12} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'location' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabSectionTitle}>{isMr ? 'व्यवसाय पत्ता' : 'Business Location'}</Text>
            
            {/* Map Placeholder */}
            <View style={styles.mapContainer}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800' }} style={styles.mapMockImage} />
              <View style={styles.mapPinOverlay}>
                <MapPin size={32} color="#C0392B" fill="#FADBD8" />
                <View style={styles.pinLabelBox}>
                  <Text style={styles.pinLabelText}>{bizName}</Text>
                </View>
              </View>
            </View>

            <Pressable onPress={() => navigation.navigate('VendorFirstTimeSetup', { editMode: true, initialStep: 1 })} style={styles.updateLocationBtn}>
              <MapPin size={16} color="#E58A2B" />
              <Text style={styles.updateLocationBtnText}>{isMr ? 'पत्ता अपडेट करा' : 'Update Location'}</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'cover' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabSectionTitle}>{isMr ? 'कव्हर फोटो' : 'Cover Photo'}</Text>
            <Text style={[styles.tabSectionSub, { marginBottom: 16 }]}>{isMr ? 'हा फोटो तुमच्या व्यवसाय प्रोफाइलवर दाखवला जाईल' : 'This photo will be shown on your business profile'}</Text>

            <View style={styles.coverPhotoContainer}>
              <Image source={{ uri: coverPhoto || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=1000' }} style={styles.coverPreviewImage} />
            </View>

            <Pressable onPress={handleChangeCover} style={styles.changeCoverBtn}>
              <Camera size={16} color="#E58A2B" style={{ marginRight: 8 }} />
              <Text style={styles.changeCoverBtnText}>{isMr ? 'कव्हर फोटो बदला' : 'Change Cover Photo'}</Text>
            </Pressable>
          </View>
        )}

        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isMr ? 'व्यवसायाचे नाव' : 'Business Name'}</Text>
              <TextInput 
                value={bizName} 
                onChangeText={setBizName} 
                style={styles.textInput} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isMr ? 'श्रेणी' : 'Category'}</Text>
              <Pressable onPress={() => setShowCatModal(true)} style={styles.categoryPickerBtn}>
                <Text style={styles.categoryPickerBtnText}>{categoryName}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isMr ? 'वर्णन' : 'Description'}</Text>
              <TextInput 
                value={description} 
                onChangeText={setDescription} 
                multiline 
                numberOfLines={3}
                style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isMr ? 'पत्ता' : 'Address'}</Text>
              <TextInput 
                value={address} 
                onChangeText={setAddress} 
                style={styles.textInput} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isMr ? 'कामाची वेळ' : 'Operating Hours'}</Text>
              <TextInput 
                value={operatingHours} 
                onChangeText={setOperatingHours} 
                style={styles.textInput} 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{isMr ? 'संपर्क क्रमांक' : 'Contact Number'}</Text>
              <TextInput 
                value={contactNumber} 
                onChangeText={setContactNumber} 
                keyboardType="phone-pad"
                style={styles.textInput} 
              />
            </View>

            <Pressable onPress={handleUpdateChanges} disabled={saving} style={styles.updateBtn}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.updateBtnText}>{isMr ? 'बदल अपडेट करा' : 'Update Changes'}</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Categories Selector Modal */}
      <Modal visible={showCatModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isMr ? 'श्रेणी निवडा' : 'Select Category'}</Text>
            {CATEGORIES.map((c) => (
              <Pressable 
                key={c.slug} 
                onPress={() => {
                  setSelectedCat(c);
                  setShowCatModal(false);
                }}
                style={styles.categoryItemRow}
              >
                <Text style={styles.categoryItemText}>{isMr ? c.nameMr : c.nameEn}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowCatModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>{isMr ? 'बंद करा' : 'Close'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Upload Bottom Sheet */}
      <UploadBottomSheet 
        visible={uploadVisible} 
        onClose={() => setUploadVisible(false)} 
        documentType={uploadTarget === 'gallery' ? 'gallery' : 'cover'} 
        onFileSelect={handleFileSelected} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FBF6EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#EFE3CC',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 18,
    color: '#2A2520',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  topCardImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  topCardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  bizNameText: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 16,
    color: '#2A2520',
  },
  bizSubText: {
    fontFamily: 'Mukta',
    fontWeight: '400',
    fontSize: 12,
    color: '#8A7C66',
    marginTop: 2,
  },
  topCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 68,
  },
  statusBadge: {
    backgroundColor: '#E3F0E8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 11,
    color: '#2E7D52',
  },
  editBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderColor: '#EFE3CC',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2.5,
    borderColor: '#E58A2B',
  },
  tabButtonText: {
    fontFamily: 'Mukta',
    fontWeight: '500',
    fontSize: 13,
    color: '#8A7C66',
  },
  tabButtonTextActive: {
    color: '#E58A2B',
    fontWeight: '700',
  },
  tabContent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 16,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabSectionTitle: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 15,
    color: '#2A2520',
  },
  tabSectionSub: {
    fontFamily: 'Mukta',
    fontSize: 12,
    color: '#8A7C66',
    marginTop: 2,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FAF5EA',
  },
  addPhotoBtnText: {
    fontFamily: 'Mukta',
    fontSize: 12,
    fontWeight: '600',
    color: '#E58A2B',
    marginLeft: 4,
  },
  emptyGallery: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyGalleryText: {
    fontFamily: 'Mukta',
    fontSize: 13,
    color: '#8A7C66',
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoGridCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deletePhotoBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 12,
  },
  mapMockImage: {
    width: '100%',
    height: '100%',
  },
  mapPinOverlay: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    marginLeft: -16,
    marginTop: -32,
    alignItems: 'center',
  },
  pinLabelBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  pinLabelText: {
    fontFamily: 'Mukta',
    fontSize: 10,
    fontWeight: '600',
    color: '#2A2520',
  },
  updateLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    backgroundColor: '#FAF5EA',
    marginTop: 10,
  },
  updateLocationBtnText: {
    fontFamily: 'Mukta',
    fontSize: 13,
    fontWeight: '600',
    color: '#E58A2B',
    marginLeft: 6,
  },
  coverPhotoContainer: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverPreviewImage: {
    width: '100%',
    height: '100%',
  },
  changeCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    backgroundColor: '#FAF5EA',
  },
  changeCoverBtnText: {
    fontFamily: 'Mukta',
    fontSize: 13,
    fontWeight: '600',
    color: '#E58A2B',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: 'Mukta',
    fontSize: 12,
    fontWeight: '600',
    color: '#8A7C66',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: '#FAF5EA',
    color: '#2A2520',
    fontSize: 14,
    fontFamily: 'Mukta',
  },
  categoryPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: '#FAF5EA',
  },
  categoryPickerBtnText: {
    fontFamily: 'Mukta',
    fontSize: 14,
    color: '#2A2520',
  },
  pickerArrow: {
    fontSize: 10,
    color: '#8A7C66',
  },
  updateBtn: {
    backgroundColor: '#2A2520',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  updateBtnText: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'Mukta',
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryItemRow: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: '#EFE3CC',
  },
  categoryItemText: {
    fontFamily: 'Mukta',
    fontSize: 14,
    color: '#2A2520',
  },
  modalCloseBtn: {
    marginTop: 16,
    height: 40,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 14,
    color: '#8A7C66',
  },
});

export default ManageBusinessScreen;
