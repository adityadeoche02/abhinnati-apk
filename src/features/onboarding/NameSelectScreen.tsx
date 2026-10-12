import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, Image, Modal, TouchableWithoutFeedback, Platform, ScrollView, Keyboard, BackHandler } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Plus, Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { api } from '../../api/client';

type NavigationProp = StackNavigationProp<RootStackParamList, 'NameSelect'>;

export const NameSelectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { user, login, preferredLanguage, logout } = useAuthStore();
  const isMr = preferredLanguage === 'mr';
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const handleBack = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (user) {
      await logout();
    } else {
      (navigation as any).navigate('LanguageSelect');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [navigation, user]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const strings = {
    title: t('auth.nameTitle'),
    label: t('auth.nameLabel'),
    placeholder: t('auth.namePlaceholder'),
    btnContinue: t('common.continue'),
  };

  const handleContinue = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.updateProfile({ name: name.trim(), profileImage });
      if (res.success) {
        if (user) {
          await login({ ...user, name: res.data?.displayName || name.trim() });
        } else {
          await login({ id: `user-${Date.now()}`, name: res.data?.displayName || name.trim(), phone: '+919999999999', role: 'resident' });
        }
        navigation.navigate('Permissions');
      } else {
        setError(t('auth.saveNameError'));
      }
    } catch (err: any) {
      setError(err?.message || t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const getNamePreview = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return 'Sneha P.';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]?.toUpperCase() || ''}.`;
  };

  const previewName = getNamePreview(name);
  const noteText = t('auth.namePreviewNote', { name: previewName });

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: withTiming(name.trim().length > 0 && !loading ? 1.0 : 0.5, { duration: 250 }),
  }));

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      {/* Header Row - Fixed at top outside ScrollView */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={20} accessibilityLabel="Go back">
          <View style={styles.backChevron} />
        </Pressable>
        <Text style={styles.title}>{strings.title}</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.content}>
            <Pressable onPress={() => setIsPhotoSheetVisible(true)} style={styles.avatarFrame}>
              {profileImage
                ? <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                : <Plus size={28} color="#9A5A12" strokeWidth={3.0} />
              }
            </Pressable>

            <Text style={styles.fieldLabel}>{strings.label}</Text>
            <Pressable onPress={() => nameInputRef.current?.focus()} style={styles.inputContainer}>
              <TextInput
                ref={nameInputRef}
                value={name}
                onChangeText={setName}
                placeholder={strings.placeholder}
                placeholderTextColor="#A89A82"
                maxLength={40}
                style={styles.textInput}
              />
            </Pressable>
            <Text style={styles.noteText}>{noteText}</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

        </ScrollView>

        {/* Footer - OUTSIDE ScrollView so it always floats at the bottom (and above keyboard) */}
        <View style={styles.footer}>
          <Animated.View style={[styles.submitButton, animatedButtonStyle]}>
            <Pressable onPress={handleContinue} disabled={!name.trim() || loading} style={styles.pressableButton}>
              {loading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.submitButtonText}>{strings.btnContinue}</Text>
              }
            </Pressable>
          </Animated.View>
          <View style={styles.indicatorWrapper}>
            {[0,1,2,3,4,5].map((idx) => (
              <View key={idx} style={[styles.dot, idx === 3 ? styles.activeDot : styles.inactiveDot]} />
            ))}
          </View>
        </View>

      </View>

      <PhotoUploadBottomSheet
        visible={isPhotoSheetVisible}
        onClose={() => setIsPhotoSheetVisible(false)}
        onCameraPress={async () => { setIsPhotoSheetVisible(false); setLoading(true); await new Promise(r => setTimeout(r, 800)); setProfileImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80'); setLoading(false); }}
        onGalleryPress={async () => { setIsPhotoSheetVisible(false); setLoading(true); await new Promise(r => setTimeout(r, 800)); setProfileImage('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80'); setLoading(false); }}
        onRemovePress={() => { setIsPhotoSheetVisible(false); setProfileImage(null); }}
        hasPhoto={!!profileImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6EC' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 8, paddingBottom: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backChevron: { width: 9, height: 9, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#2A2520', transform: [{ rotate: '45deg' }] },
  title: { flex: 1, fontFamily: 'Mukta-SemiBold', fontWeight: '700', fontSize: 22, color: '#2A2520', marginRight: 16 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
  avatarFrame: { width: 72, height: 72, backgroundColor: '#FBE7CC', borderRadius: 36, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 32 },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  fieldLabel: { fontFamily: 'Mukta-Medium', fontWeight: '500', fontSize: 13, color: '#6B5F4E', marginBottom: 8 },
  inputContainer: { height: 54, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0CFB0', borderRadius: 12, justifyContent: 'center', marginBottom: 10 },
  textInput: { fontFamily: 'Mukta-Medium', fontWeight: '500', fontSize: 16, color: '#2A2520', paddingHorizontal: 16, paddingVertical: 0 },
  noteText: { fontFamily: 'Mukta-Regular', fontWeight: '400', fontSize: 13, color: '#8A7C66' },
  errorText: { fontFamily: 'Mukta-Regular', fontWeight: '400', fontSize: 14, color: '#D32F2F', marginTop: 8, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingBottom: 56, paddingTop: 12 },
  submitButton: { width: '100%', height: 54, backgroundColor: '#2A2520', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  pressableButton: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  submitButtonText: { fontFamily: 'Mukta-SemiBold', fontWeight: '600', fontSize: 16, color: '#FFFFFF' },
  indicatorWrapper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { height: 7, borderRadius: 4 },
  activeDot: { width: 20, backgroundColor: '#E58A2B' },
  inactiveDot: { width: 7, backgroundColor: '#E0CFB0' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(26,23,20,0.4)', justifyContent: 'flex-end' },
  sheetContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, alignItems: 'center', width: '100%' },
  sheetDragHandle: { width: 36, height: 5, borderRadius: 2.5, backgroundColor: '#D8CDB8', marginBottom: 20, opacity: 0.8 },
  sheetTitle: { fontFamily: 'Mukta-SemiBold', fontWeight: '600', fontSize: 18, lineHeight: 28, color: '#2A2520', alignSelf: 'flex-start', marginBottom: 24 },
  sheetRow: { flexDirection: 'row', alignSelf: 'flex-start', gap: 32 },
  sheetOption: { alignItems: 'center' },
  sheetIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  sheetOptionText: { fontFamily: 'Mukta-Regular', fontSize: 13, lineHeight: 18, color: '#6B5F4E' },
});

interface PhotoUploadBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onCameraPress: () => void;
  onGalleryPress: () => void;
  onRemovePress: () => void;
  hasPhoto: boolean;
}

const PhotoUploadBottomSheet: React.FC<PhotoUploadBottomSheetProps> = ({
  visible,
  onClose,
  onCameraPress,
  onGalleryPress,
  onRemovePress,
  hasPhoto,
}) => {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.sheetDragHandle} />
              <Text style={styles.sheetTitle}>{t('profile.title')}</Text>
              <View style={styles.sheetRow}>
                <View style={styles.sheetOption}>
                  <Pressable onPress={onCameraPress} style={[styles.sheetIconCircle, { backgroundColor: '#E8F5E9' }]}>
                    <Camera size={24} color="#2E7D52" />
                  </Pressable>
                  <Text style={styles.sheetOptionText}>{t('auth.takePhoto')}</Text>
                </View>
                <View style={styles.sheetOption}>
                  <Pressable onPress={onGalleryPress} style={[styles.sheetIconCircle, { backgroundColor: '#E3F2FD' }]}>
                    <ImageIcon size={24} color="#1565C0" />
                  </Pressable>
                  <Text style={styles.sheetOptionText}>{t('auth.chooseFromGallery')}</Text>
                </View>
                {hasPhoto && (
                  <View style={styles.sheetOption}>
                    <Pressable onPress={onRemovePress} style={[styles.sheetIconCircle, { backgroundColor: '#FFEBEE' }]}>
                      <Trash2 size={24} color="#C62828" />
                    </Pressable>
                    <Text style={styles.sheetOptionText}>{t('auth.removePhoto')}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default NameSelectScreen;
