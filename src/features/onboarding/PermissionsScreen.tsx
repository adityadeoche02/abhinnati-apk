import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Modal, ScrollView, PermissionsAndroid, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MapPin, Bell } from 'lucide-react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { api } from '../../api/client';
import { geoService } from '../../api/geoService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Permissions'>;

const LockIllustration: React.FC = () => (
  <Svg width={94.54} height={89.36} viewBox="0 0 95 90">
    {/* User silhouette head & shoulders */}
    <Circle cx={38} cy={24} r={18} fill="#E58A2B" />
    <Path d="M4,80 C4,57 20,44 38,44 C56,44 72,57 72,80 Z" fill="#E58A2B" />
    
    {/* Padlock body */}
    <Rect x={53} y={50} width={37} height={35} rx={8} fill="#E58A2B" />
    
    {/* Padlock shackle (open) */}
    <Path 
      d="M60,50 V37 C60,25 79,25 79,37 V43" 
      stroke="#E58A2B" 
      strokeWidth={5.5} 
      strokeLinecap="round" 
      fill="none" 
    />
    
    {/* Checkmark badge inside padlock */}
    <Circle cx={71.5} cy={67.5} r={8.5} stroke="#FFFFFF" strokeWidth={2} fill="none" />
    <Path 
      d="M68,67.5 L70.5,70 L75,65" 
      stroke="#FFFFFF" 
      strokeWidth={2} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      fill="none" 
    />
  </Svg>
);

export const PermissionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { preferredLanguage, setActiveArea, setDeviceGps } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedArea, setDetectedArea] = useState<any>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const isMr = preferredLanguage === 'mr';

  const strings = {
    title: t('permissions.title'),
    subtitle: t('permissions.subtitle'),
    locTitle: t('permissions.locationTitle'),
    locDesc: t('permissions.locationDesc'),
    notifTitle: t('permissions.notificationTitle'),
    notifDesc: t('permissions.notificationDesc'),
    btnAllow: t('permissions.btnAllow'),
    loadingLocation: t('permissions.loadingLocation'),
    modalTitle: t('permissions.modalTitle'),
    modalBody: (name: string) => t('permissions.modalBody', { name }),
    btnUseThis: (name: string) => t('permissions.btnUseThis', { name }),
    btnChooseAnother: t('permissions.btnChooseAnother'),
  };

  const handleStart = async () => {
    setError('');
    setLoading(true);
    
    // 1. Force Notification Permission Prompt (if supported)
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }

    // 2. Force Location Permission Prompt (to bypass mock mode skipping it)
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Abhinnati needs your location to find nearby services and your area.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );
      } catch (err) {
        console.warn('Location permission error:', err);
      }
    }

    try {
      // geoService handles the GPS + Nominatim reverse geocode
      setGpsLoading(true);
      const result = await geoService.getCurrentLocation(true);

      if (result.error === 'permission_denied') {
        // User denied permission — go straight to manual location selection
        navigation.navigate('LocationSelect');
        return;
      }

      if (!result.success || result.latitude === null) {
        // GPS unavailable or geocode failed
        setError(result.errorMessage || t('permissions.locationNotFound'));
        navigation.navigate('LocationSelect');
        return;
      }

      const locality =
        result.localityLabel ||
        result.address?.city ||
        t('location.title');

      const areaObj = result.matchedArea ? {
        id: result.matchedArea.id,
        name_en: result.matchedArea.name_en || result.matchedArea.name,
        name_mr: result.matchedArea.name_mr || result.matchedArea.name || result.matchedArea.name_en,
        latitude: result.matchedArea.latitude || result.latitude!,
        longitude: result.matchedArea.longitude || result.longitude!,
        deviceLatitude: result.latitude!,
        deviceLongitude: result.longitude!,
        radius_km: result.matchedArea.radius_km || 5.0,
        locality: result.matchedArea.locality || locality,
        city: result.matchedArea.city || result.address?.city || '',
      } : {
        id: `gps_${result.latitude!.toFixed(5)}_${result.longitude!.toFixed(5)}`,
        name_en: locality,
        name_mr: locality,
        latitude: result.latitude!,
        longitude: result.longitude!,
        deviceLatitude: result.latitude!,
        deviceLongitude: result.longitude!,
        radius_km: 5.0,
        locality,
        city: result.address?.city || '',
      };

      // Save full GPS area to store (deviceGps only — NOT activeArea)
      await setDeviceGps(areaObj);
      setDetectedArea(areaObj);
      setShowPromptModal(true);
    } catch (err: any) {
      console.error('[PermissionsScreen] GPS error:', err);
      setError(t('common.somethingWentWrong'));
      navigation.navigate('LocationSelect');
    } finally {
      setLoading(false);
      setGpsLoading(false);
    }
  };

  const handleUseDetected = async () => {
    if (!detectedArea) return;
    setLoading(true);
    try {
      const isCustom = detectedArea.id.startsWith('gps_');
      const res = await api.updateProfile({ 
        activeAreaId: detectedArea.id,
        latitude: detectedArea.deviceLatitude || detectedArea.latitude,
        longitude: detectedArea.deviceLongitude || detectedArea.longitude,
        ...(isCustom ? {
          activeArea: {
            id: detectedArea.id,
            name: detectedArea.name_en || detectedArea.name_mr || 'Custom Location',
            city: detectedArea.city || 'Mumbai',
            latitude: detectedArea.latitude,
            longitude: detectedArea.longitude,
          }
        } : {})
      } as any); // using any here to bypass client.ts strict typing for the new fields
      if (res.success) {
        await setActiveArea(detectedArea);
      } else {
        setError(t('permissions.saveLocationError'));
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t('common.somethingWentWrong'));
    } finally {
      setLoading(false);
      setShowPromptModal(false);
    }
  };

  const handleChooseAnother = () => {
    setShowPromptModal(false);
    navigation.navigate('LocationSelect');
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    const isEnabled = !loading && !gpsLoading;
    return {
      opacity: withTiming(isEnabled ? 1.0 : 0.5, { duration: 250 }),
      transform: [
        { scale: withTiming(isEnabled ? 1.0 : 0.98, { duration: 250 }) }
      ]
    };
  });

  return (
    <View style={styles.container}>
      
      {/* Header Row - Fixed at top */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={20}>
          <View style={styles.backChevron} />
        </Pressable>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        {/* Lock illustration vector centered */}
        <View style={styles.lockIllustration}>
          <LockIllustration />
        </View>

        {/* Subtitle description */}
        <Text style={styles.subtitle}>{strings.subtitle}</Text>

        {/* Cards Wrapper */}
        <View style={styles.cardsWrapper}>
          {/* Location permission card */}
          <View style={styles.card}>
            <View style={styles.iconFrame}>
              <MapPin size={18} color="#E58A2B" fill="#E58A2B" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{strings.locTitle}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{strings.locDesc}</Text>
            </View>
          </View>

          {/* Notifications permission card */}
          <View style={styles.card}>
            <View style={styles.iconFrame}>
              <Bell size={18} color="#E58A2B" fill="#E58A2B" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{strings.notifTitle}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{strings.notifDesc}</Text>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Footer pinned to bottom */}
      <View style={styles.footer}>
        <Animated.View style={[styles.submitButton, animatedButtonStyle]}>
          <Pressable
            onPress={handleStart}
            disabled={loading || gpsLoading}
            style={styles.pressableButton}
          >
            {loading || gpsLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{strings.btnAllow}</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Pagination Indicators */}
        <View style={styles.indicatorWrapper}>
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isActive = idx === 4; // 5th dot is active
            return (
              <View
                key={idx}
                style={[styles.dot, isActive ? styles.activeDot : styles.inactiveDot]}
              />
            );
          })}
        </View>
      </View>

      {/* GPS fetching loader overlay */}
      {gpsLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E58A2B" />
          <Text style={styles.loadingText}>{strings.loadingLocation}</Text>
        </View>
      )}

      {/* Detected location prompt modal */}
      <Modal
        visible={showPromptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPromptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{strings.modalTitle}</Text>
            <Text style={styles.modalBody}>
              {detectedArea ? strings.modalBody(isMr ? detectedArea.name_mr : detectedArea.name_en) : ''}
            </Text>

            <Pressable
              onPress={handleUseDetected}
              style={styles.modalButtonPrimary}
            >
              <Text style={styles.modalButtonPrimaryText}>
                {detectedArea ? strings.btnUseThis(isMr ? detectedArea.name_mr : detectedArea.name_en) : ''}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleChooseAnother}
              style={styles.modalButtonSecondary}
            >
              <Text style={styles.modalButtonSecondaryText}>
                {strings.btnChooseAnother}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC', // Warm cream page background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backChevron: {
    width: 9,
    height: 9,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#2A2520',
    transform: [{ rotate: '45deg' }],
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 40,
    paddingBottom: 20,
  },
  lockIllustration: {
    marginBottom: 40,
  },
  subtitle: {
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B5F4E',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  cardsWrapper: {
    width: '100%',
    gap: 16,
  },
  card: {
    width: '100%',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  iconFrame: {
    width: 40,
    height: 40,
    backgroundColor: '#FBE7CC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
    color: '#2A2520',
  },
  cardSubtitle: {
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 16,
    color: '#6B5F4E',
    marginTop: 1,
  },
  errorText: {
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 14,
    color: '#D32F2F', // Red error text
    textAlign: 'center',
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 56,
    paddingTop: 12,
  },
  submitButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#2A2520',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  pressableButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },
  indicatorWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#E58A2B',
  },
  inactiveDot: {
    width: 7,
    backgroundColor: '#E0CFB0',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(251, 246, 236, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 15,
    fontFamily: 'Mukta-Regular',
    fontSize: 16,
    color: '#6B5F4E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#EFE3CC',
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 18,
    color: '#2A2520',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B5F4E',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonPrimary: {
    width: '100%',
    height: 50,
    backgroundColor: '#E58A2B',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonPrimaryText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#FFFFFF',
  },
  modalButtonSecondary: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#6B5F4E',
  },
});

export default PermissionsScreen;
