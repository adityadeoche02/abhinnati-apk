import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  ActivityIndicator, 
  ToastAndroid, 
  Platform,
  Alert,
  BackHandler
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChevronLeft, AlertCircle, MapPin } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useAnimatedStyle, 
  withTiming 
} from 'react-native-reanimated';

import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/client';
import { Area } from '../../api/mockData';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import useAreaSearch from './hooks/useAreaSearch';
import AreaSearchInput from './components/AreaSearchInput';
import CurrentLocationButton from './components/CurrentLocationButton';
import AreaList from './components/AreaList';
import MapLocationPickerModal from '../../components/modals/MapLocationPickerModal';

type NavigationProp = StackNavigationProp<RootStackParamList, 'LocationSelect'>;

export const LocationSelectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { preferredLanguage, activeArea, setActiveArea, logout, isAuthenticated, deviceGps } = useAuthStore();

  const isMr = preferredLanguage === 'mr';
  const isNewOnboarding = !activeArea;

  // Use the custom state hook
  const {
    searchText,
    setSearchText,
    selectedArea,
    setSelectedArea,
    suggestions,
    operationalAreas,
    loading,
    gpsLoading,
    error,
    handleGpsFetch,
  } = useAreaSearch(activeArea);

  const strings = {
    title: t('location.title'),
    profileTitle: t('location.profileTitle'),
    sub: t('location.sub'),
    searchPlaceholder: t('location.searchPlaceholder'),
    btnContinueOnboarding: t('location.btnContinueOnboarding'),
    btnSaveLocation: t('location.btnSaveLocation'),
    emptyTitle: t('location.emptyTitle'),
    emptySub: t('location.emptySub'),
    loadingLocation: t('location.loadingLocation'),
    toastPermission: t('location.toastPermission'),
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (isNewOnboarding) {
      (navigation as any).navigate('Permissions');
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
  }, [navigation, isNewOnboarding]);

  // Toast notification fallback
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Location', message);
    }
  };

  // Handle continuing or saving the location selection
  const handleContinue = async () => {
    if (!selectedArea) return;
    try {
      const isPreSeeded = operationalAreas.some(a => a.id === selectedArea.id);
      const res = await api.updateProfile({ 
        activeAreaId: selectedArea.id,
        ...(!isPreSeeded ? {
          activeArea: {
            id: selectedArea.id,
            name: selectedArea.name_en || selectedArea.name_mr || 'Custom Location',
            city: selectedArea.city || 'Mumbai',
            latitude: selectedArea.latitude,
            longitude: selectedArea.longitude,
          }
        } : {})
      });
      
      if (res.success) {
        const isOnboarding = !activeArea;
        await setActiveArea(selectedArea);
        if (!isOnboarding) {
          navigation.navigate('ResidentMain');
        }
      }
    } catch (err) {
      console.error('[LocationSelectScreen] Error saving area:', err);
    }
  };

  const [showMapModal, setShowMapModal] = React.useState(false);

  const handleMapLocationSelect = (loc: { latitude: number; longitude: number; name: string }) => {
    setSelectedArea({
      id: `map_${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`,
      name_en: loc.name,
      name_mr: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius_km: 5.0,
      locality: loc.name,
      city: 'Unknown'
    });
  };

  // Onboarding default operational areas list (Top 4)
  const getDisplayList = () => {
    if (searchText.trim()) {
      return suggestions;
    }
    let defaultList: Area[] = [];

    // Sort operational areas by distance from deviceGps if available
    if (deviceGps && deviceGps.latitude && deviceGps.longitude) {
      const sorted = [...operationalAreas].map(a => {
        const dLat = a.latitude - deviceGps.latitude!;
        const dLon = a.longitude - deviceGps.longitude!;
        return { area: a, dist: dLat * dLat + dLon * dLon };
      }).sort((a, b) => a.dist - b.dist);
      defaultList = sorted.map(item => item.area).slice(0, 4);
    } else {
      // Default onboarding static areas (Ravet (Pune))
      const onboardingIds = ['area-ravet'];
      const filtered = operationalAreas.filter(a => onboardingIds.includes(a.id));
      defaultList = filtered.length > 0 ? filtered : operationalAreas.slice(0, 4);
    }
    
    // Always show the currently selected area at the top if it's a custom map/gps location
    if (selectedArea && !operationalAreas.some(a => a.id === selectedArea.id)) {
      return [selectedArea, ...defaultList];
    }
    
    return defaultList;
  };

  // Animated style for continue button (Swiggy / Uber premium transitions)
  const animatedButtonStyle = useAnimatedStyle(() => {
    const isEnabled = selectedArea !== null && !loading;
    return {
      opacity: withTiming(isEnabled ? 1.0 : 0.5, { duration: 250 }),
      transform: [
        { scale: withTiming(isEnabled ? 1.0 : 0.98, { duration: 250 }) }
      ]
    };
  });

  // Handle Permission errors inside a Toast/Alert (UX requirement)
  React.useEffect(() => {
    if (error && error.includes('permission')) {
      showToast(strings.toastPermission);
    }
  }, [error]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('[LocationSelectScreen] Error logging out:', err);
    }
  };

  // 1. ONBOARDING MODE VIEW (100% Absolute Coordinate Matching Frame)
  if (isNewOnboarding) {
    return (
      <View style={styles.container}>
        <View style={styles.viewport}>
          
          {/* Back chevron button */}
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={15}
            accessibilityLabel="Go back"
          >
            <View style={styles.backChevron} />
          </Pressable>

          {/* Screen Title */}
          <Text style={styles.title}>{strings.title}</Text>

          {/* Search container */}
          <View style={styles.searchBarWrapperContainer}>
            <AreaSearchInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={strings.searchPlaceholder}
              disabled={gpsLoading}
            />
          </View>

          {/* List layout container */}
          <View style={styles.listAbsoluteContainer}>
            {loading ? (
              <View style={styles.listLoadingContainer}>
                <ActivityIndicator size="large" color="#E58A2B" />
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {/* Current Location button */}
                <CurrentLocationButton
                  onPress={handleGpsFetch}
                  loading={gpsLoading}
                  isMarathi={isMr}
                />

                {/* GPS error feedback inline */}
                {error && !error.includes('permission') && (
                  <View style={styles.gpsErrorRow}>
                    <AlertCircle size={14} color="#C0392B" style={{ marginRight: 6 }} />
                    <Text style={styles.gpsErrorText}>{error}</Text>
                  </View>
                )}

                {/* Select on Map Button */}
                <Pressable onPress={() => setShowMapModal(true)} style={styles.mapButton}>
                  <View style={styles.mapIconCircle}>
                    <MapPin size={18} color="#E58A2B" />
                  </View>
                  <Text style={styles.mapButtonText}>
                    {isMr ? 'नकाशावर लोकेशन निवडा' : 'Select location on Map'}
                  </Text>
                  <ChevronLeft size={16} color="#6B5F4E" style={{ transform: [{ rotate: '180deg' }], marginLeft: 'auto' }} />
                </Pressable>

                {/* Suggested locations flat list */}
                <View style={{ flex: 1, marginTop: 10 }}>
                  <AreaList
                    data={getDisplayList()}
                    selectedArea={selectedArea}
                    onSelectArea={(area) => setSelectedArea(area)}
                    isMarathi={isMr}
                    emptyTitle={strings.emptyTitle}
                    emptySubtitle={strings.emptySub}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Continue button */}
          <Animated.View style={[styles.submitButtonWrapper, animatedButtonStyle]}>
            <Pressable
              onPress={handleContinue}
              disabled={!selectedArea || loading}
              style={styles.pressableButton}
              accessibilityLabel={strings.btnContinueOnboarding}
              accessibilityRole="button"
            >
              <Text style={styles.submitButtonText}>{strings.btnContinueOnboarding}</Text>
            </Pressable>
          </Animated.View>

          {/* Onboarding indicators (6pagination dots) */}
          <View style={styles.indicatorWrapper}>
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isActive = idx === 5; // 6th dot is active
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    isActive ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              );
            })}
          </View>

        </View>
        
        {/* Map Modal for Onboarding View */}
        <MapLocationPickerModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          onSelectLocation={handleMapLocationSelect}
          isMarathi={isMr}
          initialLocation={deviceGps || { latitude: 18.5204, longitude: 73.8567 }}
        />
      </View>
    );
  }

  // 2. PROFILE MODE VIEW (Standard Settings View Layout)
  return (
    <SafeAreaView style={styles.container}>
      
      {/* Top dashboard navigation action */}
      <View style={styles.topActionsRow}>
        <Pressable 
          onPress={handleBack} 
          style={styles.headerBackBtn}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#2A2520" />
          <Text style={styles.headerBackText}>{isMr ? 'मागे' : 'Back'}</Text>
        </Pressable>
        {isAuthenticated && (
          <Pressable onPress={handleLogout} style={styles.headerLogoutBtn}>
            <Text style={styles.headerLogoutText}>{isMr ? 'बाहेर पडा' : 'Logout'}</Text>
          </Pressable>
        )}
      </View>

      {/* Profile Header */}
      <View style={styles.header}>
        <Text style={styles.titleText}>{strings.profileTitle}</Text>
        <Text style={styles.subtitleText}>{strings.sub}</Text>
      </View>

      {/* Search Input Box */}
      <View style={styles.searchSection}>
        <AreaSearchInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={strings.searchPlaceholder}
          disabled={gpsLoading}
        />
      </View>

      {/* GPS Current Location button */}
      <View style={styles.gpsButtonSection}>
        <CurrentLocationButton
          onPress={handleGpsFetch}
          loading={gpsLoading}
          isMarathi={isMr}
        />
        {error && !error.includes('permission') && (
          <View style={styles.profileGpsErrorRow}>
            <AlertCircle size={14} color="#C0392B" style={{ marginRight: 6 }} />
            <Text style={styles.gpsErrorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* List wrapper */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E58A2B" style={styles.spinner} />
            <Text style={styles.loadingText}>{strings.loadingLocation}</Text>
          </View>
        ) : (
          <AreaList
            data={getDisplayList()}
            selectedArea={selectedArea}
            onSelectArea={(area) => setSelectedArea(area)}
            isMarathi={isMr}
            emptyTitle={strings.emptyTitle}
            emptySubtitle={strings.emptySub}
          />
        )}
      </View>

      {/* Profile bottom button */}
      <View style={styles.profileFooter}>
        <Animated.View style={[styles.profileSubmitBtnWrapper, animatedButtonStyle]}>
          <Pressable
            onPress={handleContinue}
            disabled={!selectedArea || loading}
            style={styles.pressableButton}
            accessibilityLabel={strings.btnSaveLocation}
            accessibilityRole="button"
          >
            <Text style={styles.submitButtonText}>{strings.btnSaveLocation}</Text>
          </Pressable>
        </Animated.View>
      </View>

      <MapLocationPickerModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        onSelectLocation={handleMapLocationSelect}
        isMarathi={isMr}
        initialLocation={deviceGps || { latitude: 18.5204, longitude: 73.8567 }}
      />
    </SafeAreaView>
  );
};

// 100% Figma Coordinate Tokens & Aesthetic Layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  viewport: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FBF6EC',
  },
  backButton: {
    position: 'absolute',
    left: 22,
    top: 66,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backChevron: {
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#2A2520',
    transform: [{ rotate: '45deg' }],
  },
  title: {
    position: 'absolute',
    left: 52,
    top: 54,
    height: 37,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 37,
    color: '#2A2520',
    right: 22,
  },
  searchBarWrapperContainer: {
    position: 'absolute',
    left: 22,
    top: 146,
    width: 349,
    height: 48,
  },
  listAbsoluteContainer: {
    position: 'absolute',
    left: 22,
    top: 212,
    width: 349,
    height: 490,
  },
  listLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFE3CC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  mapIconCircle: {
    width: 36,
    height: 36,
    backgroundColor: '#FBE7CC',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mapButtonText: {
    fontFamily: 'Mukta-SemiBold',
    fontSize: 15,
    color: '#2A2520',
  },
  submitButtonWrapper: {
    position: 'absolute',
    left: 22,
    top: 724,
    width: 349,
    height: 50,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    overflow: 'hidden',
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
    fontSize: 15,
    lineHeight: 25,
    color: '#FFFFFF',
  },
  indicatorWrapper: {
    position: 'absolute',
    left: 156,
    top: 792,
    width: 95,
    height: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E0CFB0',
  },
  activeDot: {
    width: 20,
    backgroundColor: '#E58A2B',
  },
  inactiveDot: {
    width: 7,
    backgroundColor: '#E0CFB0',
  },

  // Profile layout details
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    fontSize: 14,
    fontFamily: 'Mukta-Medium',
    color: '#2A2520',
    marginLeft: 2,
  },
  headerLogoutBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerLogoutText: {
    fontSize: 13,
    fontFamily: 'Mukta-SemiBold',
    color: '#E58A2B',
  },
  header: {
    paddingHorizontal: 22,
    marginTop: 10,
    marginBottom: 16,
  },
  titleText: {
    fontSize: 24,
    fontFamily: 'Mukta-SemiBold',
    color: '#2A2520',
    lineHeight: 32,
  },
  subtitleText: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    marginTop: 4,
    lineHeight: 20,
  },
  searchSection: {
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  gpsButtonSection: {
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Mukta-Medium',
    color: '#6B5F4E',
  },
  profileFooter: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#FBF6EC',
    borderTopWidth: 1,
    borderTopColor: '#F0E6D2',
  },
  profileSubmitBtnWrapper: {
    width: '100%',
    height: 50,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileGpsErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gpsErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  gpsErrorText: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#C0392B',
    lineHeight: 18,
    flexShrink: 1,
  },
});

export const AreaSearchScreen = LocationSelectScreen;

export default LocationSelectScreen;
