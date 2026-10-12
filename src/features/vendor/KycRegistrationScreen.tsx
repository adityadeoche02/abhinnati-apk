import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, TextInput, Modal, FlatList, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { DocumentUploadCard } from '../../components/vendor/DocumentUploadCard';
import { UploadBottomSheet } from '../../components/vendor/UploadBottomSheet';
import { fileUploadService, KYCFile } from '../../services/fileUploadService';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const KycRegistrationScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user, preferredLanguage } = useAuthStore();

  const [bizName, setBizName] = useState("Aai's Bakery");
  const [selectedCat, setSelectedCat] = useState("Bakery");
  const [selectedArea, setSelectedArea] = useState("Bandra West");
  
  const [loading, setLoading] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);

  // Bottom Sheet Upload Management
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState<string | null>(null);

  // Track uploaded documents in local state
  const [files, setFiles] = useState<Record<string, KYCFile | null>>({
    aadhaar: null
  });

  // Keep references to cancel active mock uploads if replaced or removed
  const [uploadTasks, setUploadTasks] = useState<Record<string, { cancel: () => void } | null>>({});

  const isMr = preferredLanguage === 'mr';

  const strings = {
    back: t('vendor.registerBusiness'),
    bizNameLabel: t('vendor.businessName'),
    categoryLabel: t('vendor.category'),
    areaLabel: t('vendor.area'),
    docsLabel: t('vendor.aadhaarVerification'),
    btnSubmit: t('vendor.submitForReview'),
    successMsg: t('vendor.registrationSuccess'),
  };

  const categories = [
    { label: 'Bakery', slug: 'food', requireFssai: true },
    { label: 'Home Cooked Tiffin', slug: 'food', requireFssai: true },
    { label: 'Plumbing & Masonry', slug: 'plumbing', requireFssai: false },
    { label: 'Electrical Works', slug: 'electric', requireFssai: false },
    { label: 'Home Cleaning', slug: 'cleaning', requireFssai: false },
    { label: 'Legal Advice', slug: 'legal', requireFssai: false }
  ];

  const areas = [
    { id: 'area-bandra', name: 'Bandra West' },
    { id: 'area-bandra-east', name: 'Bandra East' },
    { id: 'area-khar', name: 'Khar' },
    { id: 'area-santacruz', name: 'Santacruz' },
    { id: 'area-kothrud', name: 'Kothrud (Pune)' },
    { id: 'area-ravet', name: 'Ravet (Pune)' }
  ];

  const handlePressUpload = (docType: string) => {
    setActiveUploadType(docType);
    setBottomSheetVisible(true);
  };

  const handleRemoveFile = (docType: string) => {
    if (uploadTasks[docType]) {
      uploadTasks[docType]?.cancel();
      setUploadTasks(prev => ({ ...prev, [docType]: null }));
    }
    setFiles(prev => ({
      ...prev,
      [docType]: null
    }));
  };

  const handleRetryFile = (docType: string) => {
    const failedFile = files[docType];
    if (failedFile) {
      startUploadProcess(failedFile);
    }
  };

  const startUploadProcess = async (kycFile: KYCFile) => {
    const docType = kycFile.documentType;

    // 1. Validation check
    const validation = fileUploadService.validateFile(kycFile.fileName, kycFile.mimeType, kycFile.fileSize);
    if (!validation.valid) {
      Alert.alert('Validation Error', validation.error);
      return;
    }

    // 2. Duplicate file check
    const isDuplicate = Object.entries(files).some(
      ([key, f]) => f && key !== docType && f.fileName.toLowerCase() === kycFile.fileName.toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate Upload', 'This file has already been uploaded for another document field.');
      return;
    }

    // 3. Compress Image (JPEG/PNG)
    let processedFile = kycFile;
    if (kycFile.mimeType.startsWith('image/')) {
      processedFile = await fileUploadService.compressImage(kycFile);
    }

    // Cancel existing upload task if running
    if (uploadTasks[docType]) {
      uploadTasks[docType]?.cancel();
    }

    // Set uploading state
    setFiles(prev => ({
      ...prev,
      [docType]: {
        ...processedFile,
        uploadStatus: 'uploading',
        uploadProgress: 0
      }
    }));

    // Start network simulation progress
    const task = fileUploadService.startUpload(
      processedFile,
      (progress) => {
        setFiles(prev => {
          const current = prev[docType];
          if (!current || current.uploadStatus !== 'uploading') return prev;
          return {
            ...prev,
            [docType]: {
              ...current,
              uploadProgress: progress
            }
          };
        });
      },
      (completedFile) => {
        setFiles(prev => ({
          ...prev,
          [docType]: completedFile
        }));
        setUploadTasks(prev => ({ ...prev, [docType]: null }));
      },
      (error) => {
        setFiles(prev => ({
          ...prev,
          [docType]: {
            ...processedFile,
            uploadStatus: 'failed',
            uploadProgress: 0
          }
        }));
        setUploadTasks(prev => ({ ...prev, [docType]: null }));
      }
    );

    setUploadTasks(prev => ({ ...prev, [docType]: task }));
  };

  const handleSubmit = async () => {
    if (!bizName.trim()) {
      Alert.alert('Validation Error', 'Please enter a business name.');
      return;
    }

    // Aadhaar Card upload check removed as requested

    setLoading(true);
    try {
      if (user) {
        // Collect uploaded documents list for DTO compatibility
        const uploadedDocuments = [];
        const kycDocs: any = {};

        if (files.aadhaar) {
          uploadedDocuments.push({
            documentId: `doc-aadhaar-${Date.now()}`,
            documentType: 'aadhaar',
            fileName: files.aadhaar.fileName,
            mimeType: files.aadhaar.mimeType,
            fileSize: files.aadhaar.fileSize,
            uploadedAt: files.aadhaar.uploadedAt || new Date().toISOString(),
            verificationStatus: 'Pending Review'
          });

          kycDocs.aadhaar = {
            fileName: files.aadhaar.fileName,
            mimeType: files.aadhaar.mimeType,
            fileData: files.aadhaar.fileData || '',
          };
        }

        const areaObj = areas.find(a => a.name === selectedArea);
        const selectedAreaId = areaObj?.id || 'area-bandra';

        await api.registerVendor({
          userId: user.id,
          businessNameMr: isMr ? bizName : 'आयझ बेकरी',
          businessNameEn: bizName,
          categorySlug: currentCatObj?.slug || 'food',
          categoryNameMr: isMr ? 'बेकरी' : 'Bakery',
          categoryNameEn: selectedCat,
          descriptionMr: 'ताज्या बेकरी वस्तू.',
          descriptionEn: "Aai's Bakery is a home-based bakery in Bandra West, known for customized cakes and bread.",
          kycDocsUrl: JSON.stringify(uploadedDocuments), // Store structured uploaded files payload
          kycDocs, // Pass structured documents for Supabase upload on the backend
          latitude: 19.0605,
          longitude: 72.8290,
          areaId: selectedAreaId,
          services: [],
        });
      }
      
      Alert.alert(strings.successMsg);
      navigation.replace('KycStatus');
    } catch (err) {
      console.error(err);
      Alert.alert('Upload Failed', 'Failed to register business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentCatObj = categories.find(c => c.label === selectedCat);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={15}>
          <Svg width={6} height={12} viewBox="0 0 6 12">
            <Path d="M5 1L1 6l4 5" stroke="#2A2520" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text style={styles.headerTitle}>{strings.back}</Text>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Business Name Field */}
        <Text style={styles.fieldLabel}>{strings.bizNameLabel}</Text>
        <View style={styles.inputCard}>
          <TextInput
            value={bizName}
            onChangeText={setBizName}
            style={styles.textInput}
            placeholderTextColor="#A89A82"
          />
        </View>

        {/* Category Dropdown Selector */}
        <Text style={[styles.fieldLabel, styles.marginField]}>{strings.categoryLabel}</Text>
        <Pressable onPress={() => setShowCatModal(true)} style={styles.dropdownTrigger}>
          <Text style={styles.dropdownText}>{selectedCat}</Text>
          <Svg width={10} height={5} viewBox="0 0 10 5">
            <Path d="M1 1l4 3 4-3" stroke="#8A7C66" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>

        {/* Area Dropdown Selector */}
        <Text style={[styles.fieldLabel, styles.marginField]}>{strings.areaLabel}</Text>
        <Pressable onPress={() => setShowAreaModal(true)} style={styles.dropdownTrigger}>
          <Text style={styles.dropdownText}>{selectedArea}</Text>
          <Svg width={10} height={5} viewBox="0 0 10 5">
            <Path d="M1 1l4 3 4-3" stroke="#8A7C66" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>

        {/* Documents Section */}
        <Text style={[styles.fieldLabel, styles.marginField]}>{strings.docsLabel}</Text>
        
        {/* Aadhaar Card Card (Mandatory) */}
        <DocumentUploadCard
          label="Aadhaar Card (Optional)"
          file={files.aadhaar}
          onPressUpload={() => handlePressUpload('aadhaar')}
          onRemove={() => handleRemoveFile('aadhaar')}
          onRetry={() => handleRetryFile('aadhaar')}
        />
        <Text style={styles.formatHelperText}>
          Supported formats: JPG, PNG, PDF (Max 5 MB)
        </Text>

        <View style={styles.spacingBottom} />
      </ScrollView>

      {/* Footer Submit button */}
      <View style={styles.footer}>
        <Pressable onPress={handleSubmit} disabled={loading} style={styles.submitBtn}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>{strings.btnSubmit}</Text>
          )}
        </Pressable>
      </View>

      {/* Reusable Selector Bottom Sheet */}
      {activeUploadType && (
        <UploadBottomSheet
          visible={bottomSheetVisible}
          documentType={activeUploadType}
          onClose={() => setBottomSheetVisible(false)}
          onFileSelect={startUploadProcess}
        />
      )}

      {/* Category Selection Modal */}
      <Modal visible={showCatModal} transparent animationType="fade" onRequestClose={() => setShowCatModal(false)}>
        <View style={styles.dropdownBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCatModal(false)} />
          <View style={styles.dropdownModalCard}>
            <Text style={styles.dropdownModalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedCat(item.label);
                    setShowCatModal(false);
                    // Clear FSSAI if category doesn't require it
                    if (!item.requireFssai) {
                      handleRemoveFile('fssai');
                    }
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={styles.dropdownItemText}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Area Selection Modal */}
      <Modal visible={showAreaModal} transparent animationType="fade" onRequestClose={() => setShowAreaModal(false)}>
        <View style={styles.dropdownBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAreaModal(false)} />
          <View style={styles.dropdownModalCard}>
            <Text style={styles.dropdownModalTitle}>Select Area</Text>
            <FlatList
              data={areas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedArea(item.name);
                    setShowAreaModal(false);
                  }}
                  style={styles.dropdownItem}
                >
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 100,
    backgroundColor: '#FBF6EC',
    zIndex: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 22,
    top: 66,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  headerTitle: {
    position: 'absolute',
    left: 52,
    top: 58,
    fontSize: 18,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    lineHeight: 30,
    color: '#2A2520',
  },
  headerDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 100,
    height: 1,
    backgroundColor: '#EFE3CC',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 116,
    paddingBottom: 100,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#6B5F4E',
    marginBottom: 2,
  },
  marginField: {
    marginTop: 14,
  },
  inputCard: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
    padding: 0,
    height: '100%',
  },
  dropdownTrigger: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
  },
  spacingBottom: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 18,
    right: 18,
  },
  submitBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 25,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModalCard: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    marginBottom: 14,
  },
  dropdownItem: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3CC',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: 'Mukta-Medium',
    color: '#3D362E',
  },
  formatHelperText: {
    fontSize: 12,
    fontFamily: 'Mukta-Medium',
    color: '#8A7C66',
    marginTop: 4,
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

export default KycRegistrationScreen;
