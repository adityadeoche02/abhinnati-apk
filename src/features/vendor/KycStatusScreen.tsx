import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable, BackHandler } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Vendor } from '../../api/mockData';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const KycStatusScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user, preferredLanguage, setUserMode, activeArea } = useAuthStore();
  
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('ResidentMain');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [navigation]);

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  const isMr = preferredLanguage === 'mr';
  const localityName = isMr ? vendor?.categoryNameMr : vendor?.businessNameEn; // or active area

  const areaName = activeArea ? (isMr ? activeArea.name_mr : activeArea.name_en) : (isMr ? 'तुमचा परिसर' : 'Your area');

  const strings = {
    back: t('vendor.verification'),
    title: t('vendor.verificationInProgress'),
    sub: t('vendor.verificationCheckingDocs'),
    notifyText: t('vendor.notifyWhenApproved'),
    editDetails: t('vendor.editDetails'),
    liveTitle: t('vendor.liveInArea', { area: areaName }),
    spotlightTitle: t('vendor.spotlightPosted'),
    spotlightSub: t('vendor.spotlightNotified'),
    goDashboard: t('vendor.next'),
  };

  const checkStatus = async () => {
    if (!user) return;
    try {
      const v = await api.getVendorByUserId(user.id);
      setVendor(v);

      // If pending, make sure backend database has this vendor queued for admin approval
      if (v && (v.kycStatus === 'pending' || !v.kycStatus)) {
        api.registerVendor({
          userId: user.id,
          businessNameEn: v.businessNameEn || 'My Shop',
          businessNameMr: v.businessNameMr || v.businessNameEn || 'माझे दुकान',
          categoryNameEn: v.categoryNameEn || 'Retail',
          categoryNameMr: v.categoryNameMr || 'दुकान',
          categorySlug: v.categorySlug || 'general',
          descriptionEn: v.descriptionEn || '',
          descriptionMr: v.descriptionMr || '',
          phone: user.phone,
          userName: user.name || 'Shop Owner',
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll backend every 3 seconds while under review so that when Admin approves in Admin Panel, the phone updates immediately
    const interval = setInterval(() => {
      checkStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const handleGoToDashboard = async () => {
    await setUserMode('vendor');
    const profile = useAuthStore.getState().vendorProfile;
    if (profile?.firstApprovedLogin) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'VendorFirstTimeSetup' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'VendorMain' }],
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E58A2B" />
      </SafeAreaView>
    );
  }

  const isApproved = vendor?.kycStatus === 'approved';

  if (isApproved) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.liveContainer}>
          {/* Green Checkmark Circle */}
          <View style={styles.liveCheckCircle}>
            <View style={{ position: 'absolute', left: 24.5, top: 27 }}>
              <Svg width={36.96} height={30.24} viewBox="0 0 37 30">
                <Path
                  d="M4 14.5l9 9L33 4"
                  stroke="#2E7D52"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
          </View>

          {/* Live title */}
          <Text style={styles.liveTitle}>{strings.liveTitle}</Text>

          {/* Spotlight posted card */}
          <View style={styles.liveSpotlightCard}>
            <View style={styles.liveSpotlightRow}>
              {/* Sparkle Star SVG */}
              <Svg width={28} height={28} viewBox="0 0 28 28" style={styles.liveSpotlightIcon}>
                <Path d="M14 2c0 6.627-5.373 12-12 12 6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" fill="#E58A2B" />
              </Svg>
              <View style={styles.liveSpotlightTextCol}>
                <Text style={styles.liveSpotlightTitle}>{strings.spotlightTitle}</Text>
                <Text style={styles.liveSpotlightSub}>{strings.spotlightSub}</Text>
              </View>
            </View>
          </View>

          {/* Go to Home button */}
          <Pressable onPress={handleGoToDashboard} style={styles.liveHomeBtn}>
            <Text style={styles.liveHomeBtnText}>{strings.goDashboard}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Header - Hide in approved live state */}
      {!isApproved && (
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={15} accessibilityLabel="Go back">
            <Svg width={6} height={12} viewBox="0 0 6 12">
              <Path d="M5 1L1 6l4 5" stroke="#2A2520" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
          <Text style={styles.headerTitle}>{strings.back}</Text>
        </View>
      )}
      {!isApproved && <View style={styles.headerDivider} />}

      <View style={[styles.content, isApproved && styles.liveContent]}>
        {isApproved ? (
          // ================= LIVE STATE =================
          <View style={styles.centerContainer}>
            {/* Green Checkmark Circle */}
            <View style={styles.liveCheckCircle}>
              <Svg width={37} height={30} viewBox="0 0 37 30">
                <Path
                  d="M4 14.5l9 9L33 4"
                  stroke="#2E7D52"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>

            {/* Live title */}
            <Text style={styles.statusTitle}>{strings.liveTitle}</Text>

            {/* Spotlight posted card */}
            <View style={styles.spotlightCard}>
              <Svg width={28} height={28} viewBox="0 0 28 28" style={styles.spotlightIcon}>
                <Path d="M14 2c0 6.627-5.373 12-12 12 6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" fill="#E58A2B" />
              </Svg>
              <View style={styles.spotlightTextContent}>
                <Text style={styles.spotlightTitle}>{strings.spotlightTitle}</Text>
                <Text style={styles.spotlightSub}>{strings.spotlightSub}</Text>
              </View>
            </View>
          </View>
        ) : (
          // ================= UNDER REVIEW / PENDING STATE =================
          <View style={styles.centerContainer}>
            {/* Clock Illustration SVG */}
            <View style={styles.clockCircle}>
              <Svg width={84} height={84} viewBox="0 0 84 84">
                <Circle cx={42} cy={42} r={20} stroke="#9A5A12" strokeWidth={3} fill="none" />
                <Line x1={42} y1={42} x2={42} y2={30} stroke="#9A5A12" strokeWidth={3} strokeLinecap="round" />
                <Line x1={42} y1={42} x2={51.6} y2={42} stroke="#9A5A12" strokeWidth={3} strokeLinecap="round" />
              </Svg>
            </View>

            {/* Status Title */}
            <Text style={styles.statusTitle}>{strings.title}</Text>

            {/* Subtext description */}
            <Text style={styles.statusSubtext}>{strings.sub}</Text>

            {/* Notify row */}
            <View style={styles.notifyRow}>
              <Svg width={14} height={16} viewBox="0 0 14 16" style={styles.bellIcon}>
                <Path d="M7 16a2 2 0 002-2H5a2 2 0 002 2zm5-4V7a5 5 0 00-4-4.9V1.5a1 1 0 10-2 0v.6A5 5 0 002 7v5l-1.5 1.5A.5.5 0 001 14h12a.5.5 0 00.5-.5L12 12z" fill="#E58A2B" />
              </Svg>
              <Text style={styles.notifyText}>{strings.notifyText}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Footer CTA Buttons */}
      <View style={styles.footer}>
        {isApproved ? (
          <Pressable onPress={handleGoToDashboard} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{strings.goDashboard}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.navigate('KycRegistration')} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>{strings.editDetails}</Text>
          </Pressable>
        )}
      </View>
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
    fontSize: 17,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    lineHeight: 28,
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  liveContent: {
    marginTop: 0,
  },
  centerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  clockCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 70, // Aligns to top: 170px (100 header + 70 offset)
    marginBottom: 22,
  },
  liveCheckCircle: {
    position: 'absolute',
    width: 84,
    height: 84,
    left: 154.5,
    top: 140,
    backgroundColor: '#E3F0E8',
    borderRadius: 42,
  },
  statusTitle: {
    fontSize: 21,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    textAlign: 'center',
    marginBottom: 19, // 248 to 302 top is 54px. Title height is 35px, so margin is 19px.
    lineHeight: 35,
    width: 258,
  },
  statusSubtext: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    textAlign: 'center',
    lineHeight: 22, // 155% of 14px
    marginBottom: 44,
    width: 300,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 23,
  },
  bellIcon: {
    marginRight: 10,
  },
  notifyText: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    lineHeight: 23,
  },
  spotlightCard: {
    width: 357,
    height: 74,
    backgroundColor: '#FFF7EA',
    borderWidth: 1,
    borderColor: '#F0D9B4',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotlightIcon: {
    marginRight: 12,
  },
  spotlightTextContent: {
    flex: 1,
  },
  spotlightTitle: {
    fontSize: 14,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    lineHeight: 23,
  },
  spotlightSub: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 18,
    right: 18,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2A2520',
    height: 50,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8C29A',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#2A2520',
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
  },
  liveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FBF6EC',
  },
  liveTitle: {
    position: 'absolute',
    width: 258,
    height: 35,
    left: '50%',
    marginLeft: -129,
    top: 248,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 21,
    lineHeight: 35,
    textAlign: 'center',
    color: '#2A2520',
  },
  liveSpotlightCard: {
    position: 'absolute',
    width: 357,
    height: 74,
    left: '50%',
    marginLeft: -178.5,
    top: 302,
    backgroundColor: '#FFF7EA',
    borderWidth: 1,
    borderColor: '#F0D9B4',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  liveSpotlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 325,
    height: 46,
  },
  liveSpotlightIcon: {
    marginRight: 12,
  },
  liveSpotlightTextCol: {
    width: 195,
    height: 46,
    justifyContent: 'center',
  },
  liveSpotlightTitle: {
    width: 195,
    height: 23,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 23,
    color: '#2A2520',
  },
  liveSpotlightSub: {
    width: 195,
    height: 22,
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 22,
    color: '#6B5F4E',
  },
  liveHomeBtn: {
    position: 'absolute',
    width: 357,
    height: 50,
    left: 18,
    top: 724,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveHomeBtnText: {
    width: 77,
    height: 25,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'center',
    color: '#FFFFFF',
  },
});

export default KycStatusScreen;
