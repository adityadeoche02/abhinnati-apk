import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView, Image, AlertButton } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { SwitchAreaBottomSheet } from '../../components/common/SwitchAreaBottomSheet';

type NavigationProp = StackNavigationProp<RootStackParamList, 'EditProfile'>;

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, login, preferredLanguage, activeArea } = useAuthStore();
  const [name, setName] = useState('Mahesh Kulkarni');
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isAreaSheetVisible, setIsAreaSheetVisible] = useState(false);

  const handleChangePhoto = () => {
    const options: AlertButton[] = [
      {
        text: isMr ? 'कॅमेरा' : 'Camera',
        onPress: async () => {
          // Simulate taking a photo
          await new Promise((r) => setTimeout(r, 600));
          setProfileImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80');
        },
      },
      {
        text: isMr ? 'गॅलरीतून निवडा' : 'Choose from Gallery',
        onPress: async () => {
          // Simulate choosing from gallery
          await new Promise((r) => setTimeout(r, 600));
          setProfileImage('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80');
        },
      },
    ];

    if (profileImage) {
      options.push({
        text: isMr ? 'फोटो काढा' : 'Remove photo',
        onPress: () => {
          setProfileImage(null);
        },
      });
    }

    options.push({
      text: isMr ? 'रद्द करा' : 'Cancel',
      style: 'cancel',
    });

    Alert.alert(
      isMr ? 'प्रोफाईल फोटो बदला' : 'Profile photo',
      isMr ? 'स्त्रोत निवडा' : 'Choose an action',
      options
    );
  };

  const isMr = preferredLanguage === 'mr';

  const strings = {
    title: isMr ? 'प्रोफाईल संपादित करा' : 'Edit Profile',
    changePhoto: isMr ? 'फोटो बदला' : 'Change photo',
    labelName: isMr ? 'नाव' : 'Name',
    labelPhone: isMr ? 'फोन' : 'Phone',
    labelArea: isMr ? 'विभाग' : 'Area',
    btnSave: isMr ? 'जतन करा' : 'Save',
    success: isMr ? 'प्रोफाईल जतन केली!' : 'Profile saved successfully!',
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Mock call or api update
      const res = await api.updateProfile({ name: name.trim() });
      if (res.success && user) {
        await login({ ...user, name: name.trim() });
      }
      Alert.alert(isMr ? 'यशस्वी' : 'Success', strings.success);
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={15}>
            <View style={styles.backChevron} />
          </Pressable>
          <Text style={styles.headerTitle}>{strings.title}</Text>
        </View>
        <View style={styles.headerDivider} />

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {name ? name[0].toUpperCase() : 'L'}
                </Text>
              )}
            </View>
            <Pressable onPress={handleChangePhoto} style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>{strings.changePhoto}</Text>
            </Pressable>
          </View>

          {/* Form Field: Name */}
          <Text style={styles.fieldLabel}>{strings.labelName}</Text>
          <View style={styles.inputCard}>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.textInput}
              placeholderTextColor="#A89A82"
            />
          </View>

          {/* Form Field: Phone (Disabled) */}
          <Text style={[styles.fieldLabel, styles.marginField]}>{strings.labelPhone}</Text>
          <View style={[styles.inputCard, styles.disabledCard]}>
            <Text style={styles.disabledText}>+91 98••• ••210</Text>
          </View>

          {/* Form Field: Area (Pressable select) */}
          <Text style={[styles.fieldLabel, styles.marginField]}>{strings.labelArea}</Text>
          <Pressable onPress={() => setIsAreaSheetVisible(true)} style={styles.inputCard}>
            <View style={styles.areaRow}>
              <Text style={styles.areaText}>
                {isMr ? activeArea?.name_mr : activeArea?.name_en || 'Bandra West'}
              </Text>
              <View style={styles.chevronRight} />
            </View>
          </Pressable>
        </ScrollView>

        {/* Bottom Save Button */}
        <View style={styles.footer}>
          <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{strings.btnSave}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <SwitchAreaBottomSheet
        visible={isAreaSheetVisible}
        onClose={() => setIsAreaSheetVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 50,
    marginTop: 14,
  },
  backBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevron: {
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#2A2520',
    transform: [{ rotate: '45deg' }],
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Mukta-Bold',
    fontWeight: '600',
    color: '#2A2520',
    marginLeft: 14,
  },
  headerDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#EFE3CC',
    marginTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 100,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 38,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 37,
    fontFamily: 'Mukta-Bold',
    fontWeight: '600',
    color: '#9A5A12',
    lineHeight: 61,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  changePhotoBtn: {
    marginTop: 12,
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#9A5A12',
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#6B5F4E',
    marginBottom: 6,
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
  disabledCard: {
    backgroundColor: '#F3EEE3',
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
    padding: 0,
    height: '100%',
  },
  disabledText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#A89A82',
  },
  areaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
  },
  chevronRight: {
    width: 6,
    height: 10,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#8A7C66',
    transform: [{ rotate: '45deg' }],
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 18,
    right: 18,
  },
  saveBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: 'Mukta-Bold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EditProfileScreen;
