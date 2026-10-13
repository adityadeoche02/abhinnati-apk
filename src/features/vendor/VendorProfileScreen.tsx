import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Bell, Briefcase } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Vendor } from '../../api/mockData';
import { LanguageModal } from '../../components/common/LanguageModal';
import Svg, { Path } from 'react-native-svg';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const VendorProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user, preferredLanguage, activeArea, setUserMode, logout, setLanguage } = useAuthStore();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const isMr = preferredLanguage === 'mr';

  const loadVendorProfile = async () => {
    if (!user) return;
    try {
      const v = await api.getVendorByUserId(user.id);
      if (v) {
        setVendor(v);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadVendorProfile();
    }, [user])
  );

  const handleSwitchToResident = () => {
    setUserMode('resident');
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.marigold} />
      </SafeAreaView>
    );
  }

  const nameInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.phone ? user.phone.slice(-1) : 'V');
  const userPhone = user?.phone || '';
  const userArea = activeArea ? (isMr ? activeArea.name_mr : activeArea.name_en) : (isMr ? 'परिसर निवडलेला नाही' : 'No area selected');
  const businessName = vendor ? (isMr ? (vendor.businessNameMr || vendor.businessNameEn) : vendor.businessNameEn) : (isMr ? 'व्यवसाय नोंदणी नाही' : 'No Business Registered');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Profile Title Row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('vendor.profileTitle')}</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setLangModalVisible(true)} style={styles.langBtn}>
            <Text style={styles.langBtnText}>{isMr ? 'मराठी' : 'EN'}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Alerts')} style={styles.bellBtn} hitSlop={10}>
            <Bell size={18} color="#E58A2B" fill="#E58A2B" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* User Details Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarImage, { backgroundColor: '#FDECD4', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#9A5A12' }}>
                  {nameInitial}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || user?.phone || (isMr ? 'विक्रेता' : 'Vendor')}</Text>
            {userPhone ? <Text style={styles.userPhone}>{userPhone}</Text> : null}
            <Text style={styles.userArea}>{userArea}</Text>
          </View>
        </View>

        {/* Business Management Card */}
        <View style={styles.businessCard}>
          {/* Shop Icon */}
          <View style={styles.shopIconWrapper}>
            {vendor?.logoUrl ? (
              <Image source={{ uri: vendor.logoUrl }} style={styles.businessLogoImage} />
            ) : (
              <View style={styles.placeholderLogoCircle}>
                <Briefcase size={20} color="#9A5A12" />
              </View>
            )}
          </View>
          
          <Text style={styles.businessName}>{businessName}</Text>
          
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedBadgeText}>{t('vendor.approved')}</Text>
          </View>

          <Text style={styles.manageLabel}>{t('vendor.manageBusinessLabel')}</Text>

          <Pressable onPress={handleSwitchToResident} style={styles.switchButton}>
            <Text style={styles.switchButtonText}>{t('vendor.switchToUserMode')}</Text>
          </Pressable>
        </View>

        {/* Menu Items List */}
        <View style={styles.menuList}>
          {/* Edit Profile (routes to ManageBusinessScreen) */}
          <Pressable onPress={() => navigation.navigate('ManageBusiness')} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('vendor.editProfileMenu')}</Text>
            <ChevronRight size={16} color="#C2B193" strokeWidth={3} />
          </Pressable>

          {/* Language */}
          <Pressable onPress={() => setLangModalVisible(true)} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemText}>{t('vendor.languageMenu')}</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Text style={styles.langDisplay}>{isMr ? 'मराठी' : 'English'}</Text>
              <ChevronRight size={16} color="#C2B193" strokeWidth={3} />
            </View>
          </Pressable>

          {/* Saved */}
          <Pressable style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('vendor.savedMenu')}</Text>
            <ChevronRight size={16} color="#C2B193" strokeWidth={3} />
          </Pressable>

          {/* Settings */}
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('vendor.settingsMenu')}</Text>
            <ChevronRight size={16} color="#C2B193" strokeWidth={3} />
          </Pressable>

          {/* Help & support */}
          <Pressable onPress={() => navigation.navigate('HelpSupport')} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('vendor.helpSupportMenu')}</Text>
            <ChevronRight size={16} color="#C2B193" strokeWidth={3} />
          </Pressable>

          {/* Log out */}
          <Pressable onPress={handleLogout} style={styles.logoutItem}>
            <Text style={styles.logoutText}>{t('vendor.logoutMenu')}</Text>
          </Pressable>
        </View>

      </ScrollView>

      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
        currentLanguage={preferredLanguage}
        onSelectLanguage={(lang) => {
          setLanguage(lang);
          setLangModalVisible(false);
        }}
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
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: '#FBF6EC',
  },
  headerTitle: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 18,
    color: '#2A2520',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langBtn: {
    width: 40,
    height: 26,
    backgroundColor: '#FBF6EC',
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langBtnText: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 20,
    color: '#6B5F4E',
  },
  bellBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 16,
    height: 92,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 25,
    lineHeight: 42,
    color: '#9A5A12',
    textAlign: 'center',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 17,
    color: '#2A2520',
  },
  userPhone: {
    fontFamily: 'Mukta',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 22,
    color: '#6B5F4E',
  },
  userArea: {
    fontFamily: 'Mukta',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 20,
    color: '#8A7C66',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  businessCard: {
    backgroundColor: '#FDF1DF',
    borderWidth: 1.2,
    borderColor: '#E58A2B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    height: 120,
    position: 'relative',
  },
  shopIconWrapper: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  businessLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderLogoCircle: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessName: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 15,
    color: '#2A2520',
    left: 76,
    top: 16,
    position: 'absolute',
  },
  approvedBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 64,
    height: 22,
    backgroundColor: '#E3F0E8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvedBadgeText: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 18,
    color: '#2E7D52',
  },
  manageLabel: {
    fontFamily: 'Mukta',
    fontWeight: '400',
    fontSize: 12,
    color: '#6B5F4E',
    left: 76,
    top: 40,
    position: 'absolute',
  },
  switchButton: {
    backgroundColor: '#2A2520',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    right: 16,
    top: 72,
  },
  switchButtonText: {
    fontFamily: 'Mukta',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 23,
    color: '#FFFFFF',
  },
  menuList: {
    gap: 12,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemText: {
    fontFamily: 'Mukta',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 25,
    color: '#2A2520',
  },
  langDisplay: {
    fontFamily: 'Mukta',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 22,
    color: '#8A7C66',
  },
  logoutItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  logoutText: {
    fontFamily: 'Mukta',
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 25,
    color: '#C0392B',
  },
});

export default VendorProfileScreen;
