import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, ScrollView, Alert, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { RootNavigator } from '../../navigation/RootNavigator';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Vendor } from '../../api/mockData';
import { CustomChevronRight, CustomBellIcon } from '../../components/common/Icons';
import { Briefcase } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const ProfileDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const {
    user,
    preferredLanguage,
    activeArea,
    setLanguage,
    setUserMode,
    logout
  } = useAuthStore();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  const isMr = preferredLanguage === 'mr';

  const strings = {
    title: t('profile.title'),
    subtextManage: t('profile.manageBusinessSub'),
    btnSwitchMode: t('profile.switchToVendor'),
    btnRegisterVendor: t('profile.registerVendor'),
    defaultName: user?.name || (user?.phone ? user.phone : (isMr ? 'रहिवासी' : 'Resident')),
    defaultPhone: user?.phone || '',
    defaultLocation: activeArea ? (isMr ? activeArea.name_mr : activeArea.name_en) : (isMr ? 'परिसर निवडलेला नाही' : 'No area selected'),
  };

  const fetchVendorStatus = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const v = await api.getVendorByUserId(user.id);
      setVendor(v);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchVendorStatus();
    }, [user])
  );

  const handleLanguageToggle = async () => {
    const nextLang = preferredLanguage === 'mr' ? 'en' : 'mr';
    await setLanguage(nextLang);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header section Frame 3 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{strings.title}</Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Language toggle Frame */}
          <Pressable onPress={handleLanguageToggle} style={styles.langBtn}>
            <Text style={styles.langText}>{isMr ? 'मराठी' : 'EN'}</Text>
          </Pressable>
          
          {/* Bell Icon Vector */}
          <Pressable onPress={() => navigation.navigate('Alerts')} style={styles.bellBtn}>
            <CustomBellIcon size={18} color="#E58A2B" />
          </Pressable>
        </View>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarImage, { backgroundColor: '#FDECD4', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#9A5A12' }}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{strings.defaultName}</Text>
            <Text style={styles.userPhone}>{strings.defaultPhone}</Text>
            <Text style={styles.userLocation}>{strings.defaultLocation}</Text>
          </View>
        </View>

        {/* Vendor Manager Card */}
        {loading ? (
          <ActivityIndicator size="small" color="#E58A2B" style={styles.loader} />
        ) : (
          <View style={styles.vendorCard}>
            <View style={styles.vendorStoreIcon}>
              {vendor?.logoUrl ? (
                <Image source={{ uri: vendor.logoUrl }} style={styles.businessLogoImage} />
              ) : (
                <View style={styles.placeholderLogoCircle}>
                  <Briefcase size={20} color="#9A5A12" />
                </View>
              )}
            </View>
            
            <Text style={styles.vendorTitle}>{vendor ? (isMr ? (vendor.businessNameMr || vendor.businessNameEn) : vendor.businessNameEn) : (isMr ? 'व्यवसाय नोंदणी' : 'Business Registration')}</Text>
            
            <View style={[
              styles.approvedBadge,
              {
                backgroundColor: !vendor ? '#F5ECE0' : vendor.kycStatus === 'approved' ? '#E3F0E8' : '#FBE7CC',
              }
            ]}>
              <Text style={[
                styles.approvedText,
                {
                  color: !vendor ? '#8A7C66' : vendor.kycStatus === 'approved' ? '#2E7D52' : '#9A5A12',
                }
              ]}>
                {!vendor ? t('profile.notRegistered') : vendor.kycStatus === 'approved' ? t('profile.approved') : t('profile.underReview')}
              </Text>
            </View>
            
            <Text style={styles.vendorSubtext}>{strings.subtextManage}</Text>
            
            <Pressable 
              onPress={async () => {
                if (vendor?.kycStatus === 'approved') {
                  await setUserMode('vendor');
                } else if (vendor?.kycStatus === 'pending') {
                  navigation.navigate('KycStatus');
                } else {
                  navigation.navigate('KycRegistration');
                }
              }} 
              style={styles.switchBtn}
            >
              <Text style={styles.switchBtnText}>
                {!vendor ? strings.btnRegisterVendor : vendor.kycStatus === 'approved' ? strings.btnSwitchMode : t('profile.checkKycStatus')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* List Menu Items */}
        <View style={styles.menuList}>
          {/* Item 1: Edit Profile */}
          <Pressable onPress={() => navigation.navigate('EditProfile')} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('profile.editProfile')}</Text>
            <CustomChevronRight size={14} color="#C9A877" strokeWidth={3.5} />
          </Pressable>

          {/* Item 2: Language */}
          <Pressable onPress={handleLanguageToggle} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('profile.language')}</Text>
            <View style={styles.menuItemRight}>
              <Text style={styles.langValue}>मराठी / EN</Text>
              <CustomChevronRight size={14} color="#C9A877" strokeWidth={3.5} />
            </View>
          </Pressable>

          {/* Item 3: Saved */}
          <Pressable onPress={() => Alert.alert('Saved items list')} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('profile.saved')}</Text>
            <CustomChevronRight size={14} color="#C9A877" strokeWidth={3.5} />
          </Pressable>

          {/* Item 4: Settings */}
          <Pressable onPress={() => navigation.navigate('Settings')} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('profile.settings')}</Text>
            <CustomChevronRight size={14} color="#C9A877" strokeWidth={3.5} />
          </Pressable>

          {/* Item 5: Help & Support */}
          <Pressable onPress={() => navigation.navigate('HelpSupport')} style={styles.menuItem}>
            <Text style={styles.menuItemText}>{t('profile.helpSupport')}</Text>
            <CustomChevronRight size={14} color="#C9A877" strokeWidth={3.5} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 30,
    marginTop: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Mukta-Bold',
    fontWeight: '600',
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
  langText: {
    fontSize: 12,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#6B5F4E',
  },
  bellBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    width: 14,
    height: 16,
    backgroundColor: '#E58A2B',
    borderRadius: 2,
    position: 'relative',
  },
  bellBody: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    top: 4,
  },
  bellClapper: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 2,
    backgroundColor: '#9A5A12',
    left: 5,
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E58A2B',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#EFE3CC',
    marginTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 100,
  },
  profileCard: {
    width: '100%',
    height: 92,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  avatarText: {
    fontSize: 25,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#9A5A12',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 17,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  userPhone: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    marginTop: 2,
  },
  userLocation: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
    marginTop: 1,
  },
  vendorCard: {
    width: '100%',
    height: 120,
    backgroundColor: '#FDF1DF',
    borderWidth: 1.2,
    borderColor: '#E58A2B',
    borderRadius: 16,
    marginTop: 14,
    padding: 16,
    position: 'relative',
  },
  vendorStoreIcon: {
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
  vendorTitle: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    left: 76,
    position: 'absolute',
    top: 16,
  },
  approvedBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    height: 22,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  approvedText: {
    fontSize: 11,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2E7D52',
  },
  vendorSubtext: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    top: 40,
    left: 76,
    position: 'absolute',
  },
  switchBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 72,
    height: 34,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchBtnText: {
    fontSize: 14,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuList: {
    marginTop: 14,
    gap: 6,
  },
  menuItem: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langValue: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
  },
  chevronRight: {
    width: 6,
    height: 10,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#C2B193',
    transform: [{ rotate: '45deg' }],
  },
  loader: {
    marginVertical: 20,
  },
  vendorStoreImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});

export default ProfileDashboardScreen;
