import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, LayoutAnimation, RefreshControl } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/client';
import { Vendor } from '../../api/mockData';
import { RootStackParamList } from '../../navigation/types';
import LanguageModal from '../../components/common/LanguageModal';
import { SwitchAreaBottomSheet } from '../../components/common/SwitchAreaBottomSheet';
import Header from '../../components/common/Header';
import BusinessCard from '../../components/common/BusinessCard';
import BottomNavigation from '../../components/common/BottomNavigation';

import { theme } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import locationService from '../onboarding/services/LocationService';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<RootStackParamList, 'EmptyFeed'>;

export const EmptyFeedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { preferredLanguage, activeArea, setIsNewUser, deviceGps } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isNearbyExpanded, setIsNearbyExpanded] = useState(false);
  const [selectedNearbyAreaId, setSelectedNearbyAreaId] = useState<string | null>(null);
  const [nearbyAreas, setNearbyAreas] = useState<any[]>([]);
  const [nearbyVendors, setNearbyVendors] = useState<Record<string, Vendor[]>>({});
  const [localityLoading, setLocalityLoading] = useState(false);
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeArea])
  );

  // Analytics event tracker
  const trackEvent = (eventName: string, params?: any) => {
    console.log(`[Analytics] Event: "${eventName}"`, params ? JSON.stringify(params) : '');
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const sortVendorsByNewest = (list: Vendor[]) => {
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });
  };

  const isNewBusiness = (createdAtString?: string) => {
    if (!createdAtString) return false;
    const createdDate = new Date(createdAtString);
    const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const handleToggleLocality = async (areaId: string) => {
    trackEvent('Nearby locality selected', { localityId: areaId });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedNearbyAreaId === areaId) {
      setSelectedNearbyAreaId(null);
      return;
    }
    setSelectedNearbyAreaId(areaId);

    // Lazy load vendors for this area
    if (!nearbyVendors[areaId]) {
      setLocalityLoading(true);
      try {
        const list = await api.getVendors(areaId);
        const sorted = sortVendorsByNewest(list);
        setNearbyVendors(prev => ({
          ...prev,
          [areaId]: sorted
        }));
      } catch (err) {
        console.error('[EmptyFeedScreen] Error lazy loading locality vendors:', err);
      } finally {
        setLocalityLoading(false);
      }
    }
  };
  const [isAreaSheetVisible, setIsAreaSheetVisible] = useState(false);

  const isMr = preferredLanguage === 'mr';
  const localityName = isMr ? activeArea?.name_mr : activeArea?.name_en;
  const displayLocality = localityName || (isMr ? 'वांद्रे पश्चिम' : 'Bandra west');

  const strings = {
    title: t('feed.areaJustStarted', { area: displayLocality }),
    subtitle: vendors.length === 0
      ? t('feed.supportLocalBusinesses')
      : t('feed.beTheFirstToShare'),
    btnPost: t('feed.postBtn'),
    btnNearby: t('feed.exploreNearby'),
    sectionTitle: t('feed.newBusinessesNearYou'),
  };

  const loadData = async (isRefreshing = false) => {
    if (!activeArea) return;
    try {
      if (!isRefreshing) setLoading(true);
      const res = await api.getEmptyFeed(activeArea.id);
      if (res.hasPosts) {
        console.log('[EmptyFeedScreen] Area has posts. Redirecting to normal community feed...');
        await setIsNewUser(false);
        navigation.navigate('ResidentMain', { screen: 'MyArea' } as any);
        return;
      }
      const sortedActive = sortVendorsByNewest(res.latestBusinesses || []);
      setVendors(sortedActive);
      setNearbyAreas(res.nearbyAreas || []);
      setIsOffline(false);

      // Cache successful response
      try {
        await AsyncStorage.setItem(
          `abhinnati_cached_empty_feed_${activeArea.id}`,
          JSON.stringify(res)
        );
      } catch (err) {
        console.error('[EmptyFeedScreen] Error caching feed data:', err);
      }
    } catch (err) {
      console.warn('[EmptyFeedScreen] Fetch failed, looking up cache:', err);
      setIsOffline(true);
      try {
        const cachedStr = await AsyncStorage.getItem(`abhinnati_cached_empty_feed_${activeArea.id}`);
        if (cachedStr) {
          const cachedRes = JSON.parse(cachedStr);
          const sortedActive = sortVendorsByNewest(cachedRes.latestBusinesses || []);
          setVendors(sortedActive);
          setNearbyAreas(cachedRes.nearbyAreas || []);
        }
      } catch (cacheErr) {
        console.error('[EmptyFeedScreen] Cache load error:', cacheErr);
      }
    } finally {
      if (!isRefreshing) setLoading(false);
    }
  };

  // Removed redundant useEffect; useFocusEffect handles page load and focus refreshes

  useEffect(() => {
    if (activeArea) {
      trackEvent('Empty feed viewed', { areaId: activeArea.id, areaName: activeArea.name_en });
    }
  }, [activeArea]);

  useEffect(() => {
    if (vendors.length > 0) {
      vendors.slice(0, 4).forEach((v) => {
        trackEvent('Business card viewed', { vendorId: v.id, businessName: v.businessNameEn });
      });
    }
  }, [vendors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  // Mark the onboarding screen as shown once.
  // When they open the app the 2nd time, it will automatically load the populated feed.
  useEffect(() => {
    const markAsOpenedOnce = async () => {
      try {
        await AsyncStorage.setItem('abhinnati_store_new_user', 'false');
      } catch (err) {
        console.error('[EmptyFeedScreen] Error updating onboarding flag:', err);
      }
    };
    markAsOpenedOnce();
  }, []);

  const handleTabPress = async (tabName: 'Home' | 'Explore' | 'Bookings' | 'Profile') => {
    await setIsNewUser(false);
    const screenMap = {
      Home: 'MyArea',
      Explore: 'Explore',
      Bookings: 'BookingsList',
      Profile: 'Profile',
    };
    navigation.navigate('ResidentMain', { screen: screenMap[tabName] } as any);
  };

  // Fallback business info matching design specifications
  const fallbackVendors = [
    {
      id: 'vendor-cycles',
      businessNameEn: 'Sai Cycles',
      businessNameMr: 'साई सायकल्स',
      categoryNameEn: 'Repair',
      categoryNameMr: 'दुरुस्ती',
      distance: '1.2 km',
      thumbnailColors: [theme.colors.peachBg, '#FFF0DC'],
    },
    {
      id: 'vendor-tiffins',
      businessNameEn: 'Reshma Tiffin',
      businessNameMr: 'रेश्मा टिफिन',
      categoryNameEn: 'Food',
      categoryNameMr: 'जेवण',
      distance: '1.8 km',
      thumbnailColors: [theme.colors.greenLight, '#F0F6F1'],
    },
    {
      id: 'vendor-electricals',
      businessNameEn: 'Nova Electricals',
      businessNameMr: 'नोव्हा इलेक्ट्रिकल्स',
      categoryNameEn: 'Electricals',
      categoryNameMr: 'इलेक्ट्रिकल्स',
      distance: '100 m',
      thumbnailColors: [theme.colors.greenLight, '#F0F6F1'],
    },
    {
      id: 'vendor-water',
      businessNameEn: 'Water Supplier',
      businessNameMr: 'पाणी पुरवठा',
      categoryNameEn: 'General',
      categoryNameMr: 'जनरल',
      distance: '1.2 km',
      thumbnailColors: [theme.colors.peachBg, '#FFF0DC'],
    },
  ];

  const getDisplayVendors = () => {
    const listToUse = vendors.length > 0 ? vendors : fallbackVendors;
    return listToUse.slice(0, 4).map((v: any, i: number) => ({
      id: v.id,
      businessNameEn: v.businessNameEn,
      businessNameMr: v.businessNameMr || v.businessNameEn,
      categoryNameEn: v.categoryNameEn || 'General',
      categoryNameMr: v.categoryNameMr || 'जनरल',
      distance: v.distance || '1.0 km',
      thumbnailColors: i % 4 === 0 || i % 4 === 3
        ? [theme.colors.peachBg, '#FFF0DC']
        : [theme.colors.greenLight, '#F0F6F1'],
    }));
  };

  const displayVendors = getDisplayVendors();

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* Fixed Sticky Header */}
      <Header
        localityName={displayLocality}
        preferredLanguage={preferredLanguage}
        onLocalityPress={() => {
          setIsNewUser(false);
          setIsAreaSheetVisible(true);
        }}
        onLanguagePress={() => setIsLangModalVisible(true)}
        onNotificationsPress={() => {
          setIsNewUser(false);
          navigation.navigate('Alerts');
        }}
        langButtonBackground={theme.colors.cream}
      />

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            {t('feed.recentBusinessesBanner')}
          </Text>
        </View>
      )}

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E58A2B']}
          />
        }
      >
        {/* Seedling Leaf Illustration Circle */}
        <View style={styles.seedlingCircle}>
          <View style={styles.seedlingLeftLeaf} />
          <View style={styles.seedlingRightLeaf} />
          <View style={styles.seedlingStem} />
        </View>

        {/* Text descriptions */}
        <Text style={styles.title}>{strings.title}</Text>
        <Text style={styles.subtitle}>{strings.subtitle}</Text>

        {/* Interactive Action Buttons Row */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => {
              trackEvent('Explore Nearby clicked');
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIsNearbyExpanded(prev => !prev);
            }}
            style={styles.postButton}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[styles.postButtonText, isMr && { fontSize: 13 }]}
            >
              {t('feed.exploreNearby')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              trackEvent('Create First Post clicked');
              navigation.navigate('CreatePost');
            }}
            style={styles.nearbyButton}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[styles.nearbyButtonText, isMr && { fontSize: 13 }]}
            >
              {t('feed.createFirstPost')}
            </Text>
          </Pressable>
        </View>

        {/* Businesses Directory Label */}
        <Text style={styles.sectionTitle}>{strings.sectionTitle}</Text>

        {/* 2x2 Grid of New Businesses or Skeleton Loader */}
        {loading ? (
          <SkeletonLoader />
        ) : (
          <View style={styles.gridContainer}>
            {displayVendors.map((vendor: any) => (
              <BusinessCard
                key={vendor.id}
                layout="grid"
                title={isMr ? vendor.businessNameMr : vendor.businessNameEn}
                category={isMr ? vendor.categoryNameMr : vendor.categoryNameEn}
                distance={vendor.distance}
                thumbnailColors={vendor.thumbnailColors}
                showNewBadge={isNewBusiness(vendor.createdAt)}
                onPress={async () => {
                  trackEvent('Business card opened', { vendorId: vendor.id });
                  await setIsNewUser(false);
                  navigation.navigate('BusinessProfile', { vendorId: vendor.id });
                }}
                style={styles.gridCardItem}
              />
            ))}
          </View>
        )}

        {isNearbyExpanded && (
          <View style={styles.nearbySection}>
            <Text style={styles.nearbySectionTitle}>
              {isMr ? 'जवळचे परिसर शोधा' : 'Explore Nearby Areas'}
            </Text>
            
            {(() => {
              const userLat = deviceGps?.latitude || activeArea?.latitude || 19.0596;
              const userLng = deviceGps?.longitude || activeArea?.longitude || 72.8295;

              const filtered = nearbyAreas
                .map((area: any) => {
                  const dist = getDistance(userLat, userLng, area.latitude, area.longitude);
                  return { ...area, distance: dist };
                })
                .filter((area: any) => area.distance <= 5.0)
                .sort((a: any, b: any) => a.distance - b.distance);

              if (filtered.length === 0) {
                return (
                  <Text style={styles.noVendorsText}>
                    {isMr ? '५ किमी अंतरात कोणतेही परिसर आढळले नाहीत' : 'No areas found within 5 km'}
                  </Text>
                );
              }

              return filtered.map((area: any) => {
                const isSelected = selectedNearbyAreaId === area.id;
                const areaName = isMr ? area.name_mr : area.name_en;
                const businessCountText = isMr
                  ? `${area.distance.toFixed(1)} किमी • ${area.newBusinessCount} व्यवसाय`
                  : `${area.distance.toFixed(1)} km • ${area.newBusinessCount} Businesses`;
                  
                return (
                  <View key={area.id} style={styles.localityContainer}>
                    <Pressable
                      onPress={() => handleToggleLocality(area.id)}
                      style={[
                        styles.localityRow,
                        isSelected && styles.localityRowSelected
                      ]}
                    >
                      <View style={styles.localityRowLeft}>
                        <MapPin size={16} color="#E58A2B" style={{ marginRight: 8 }} />
                        <Text style={styles.localityName}>{areaName}</Text>
                      </View>
                      <Text style={styles.localityCount}>{businessCountText}</Text>
                    </Pressable>

                    {isSelected && (
                      <View style={styles.localityVendorsGrid}>
                        {localityLoading ? (
                          <ActivityIndicator size="small" color="#E58A2B" style={{ padding: 16 }} />
                        ) : (nearbyVendors[area.id] || []).length === 0 ? (
                          <Text style={styles.noVendorsText}>
                            {isMr ? 'या परिसरात नवीन व्यवसाय नाहीत' : 'No new businesses in this area'}
                          </Text>
                        ) : (
                          <View style={styles.gridContainer}>
                            {(nearbyVendors[area.id] || []).map((vendor: Vendor, idx: number) => (
                              <BusinessCard
                                key={vendor.id}
                                layout="grid"
                                title={isMr ? vendor.businessNameMr : vendor.businessNameEn}
                                category={isMr ? vendor.categoryNameMr : vendor.categoryNameEn}
                                distance={vendor.distance}
                                thumbnailColors={idx % 4 === 0 || idx % 4 === 3
                                  ? [theme.colors.peachBg, '#FFF0DC']
                                  : [theme.colors.greenLight, '#F0F6F1']}
                                showNewBadge={isNewBusiness(vendor.createdAt)}
                                onPress={async () => {
                                  trackEvent('Business card opened', { vendorId: vendor.id });
                                  await setIsNewUser(false);
                                  navigation.navigate('BusinessProfile', { vendorId: vendor.id });
                                }}
                                style={styles.gridCardItem}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>
        )}

        {/* Bottom spacing so that ScrollView content doesn't get hidden under glass tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>


      <LanguageModal
        visible={isLangModalVisible}
        onClose={() => setIsLangModalVisible(false)}
        currentLanguage={preferredLanguage}
        onSelectLanguage={async (lang) => {
          await useAuthStore.getState().setLanguage(lang);
        }}
      />

      <SwitchAreaBottomSheet
        visible={isAreaSheetVisible}
        onClose={() => setIsAreaSheetVisible(false)}
      />
      <BottomNavigation
        activeTab="Home"
        onTabPress={handleTabPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FBF6EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  seedlingCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FBE7CC',
    alignSelf: 'center',
    marginTop: 24,
    position: 'relative',
  },
  seedlingStem: {
    position: 'absolute',
    width: 3,
    height: 22,
    left: 37,
    top: 32,
    backgroundColor: '#9A5A12',
    borderRadius: 1.5,
  },
  seedlingLeftLeaf: {
    position: 'absolute',
    width: 22,
    height: 13,
    left: 15,
    top: 30,
    backgroundColor: '#E58A2B',
    borderRadius: 6.5,
  },
  seedlingRightLeaf: {
    position: 'absolute',
    width: 22,
    height: 13,
    left: 39,
    top: 24,
    backgroundColor: '#C9760F',
    borderRadius: 6.5,
  },
  title: {
    marginTop: 20,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 19,
    lineHeight: 32,
    color: '#2A2520',
    textAlign: 'center',
    alignSelf: 'center',
    width: 283,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: theme.typography.fontFamily.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B5F4E',
    textAlign: 'center',
    alignSelf: 'center',
    width: 300,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    gap: 17,
  },
  postButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: {
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 15,
    color: '#FFFFFF',
  },
  nearbyButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D8C29A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyButtonText: {
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 15,
    color: '#2A2520',
  },
  sectionTitle: {
    marginTop: 34,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 23,
    color: '#6B5F4E',
    marginBottom: 5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  gridCardItem: {
    width: 170,
  },
  bottomSpacer: {
    height: 110, // clear glass tab navigation overlay
  },
  offlineBanner: {
    backgroundColor: '#FAF5EC',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3CC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBannerText: {
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: '500',
    fontSize: 12,
    color: '#9A5A12',
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
    marginTop: 10,
  },
  skeletonCard: {
    width: 170,
    height: 116,
    backgroundColor: '#FAF5EC',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  skeletonThumbnail: {
    width: '100%',
    height: 64,
    backgroundColor: '#EFE3CC',
  },
  skeletonTextContainer: {
    paddingHorizontal: 11,
    paddingTop: 8,
  },
  skeletonTitle: {
    width: '70%',
    height: 12,
    backgroundColor: '#EFE3CC',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonSubtitle: {
    width: '50%',
    height: 10,
    backgroundColor: '#EFE3CC',
    borderRadius: 4,
  },
  nearbySection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#EFE3CC',
    paddingTop: 20,
  },
  nearbySectionTitle: {
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 25,
    color: '#6B5F4E',
    marginBottom: 12,
  },
  localityContainer: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    overflow: 'hidden',
  },
  localityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  localityRowSelected: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3CC',
    backgroundColor: '#FAF5EC',
  },
  localityRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  localityName: {
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 14,
    color: '#2A2520',
  },
  localityCount: {
    fontFamily: theme.typography.fontFamily.regular,
    fontWeight: '400',
    fontSize: 12,
    color: '#6B5F4E',
  },
  localityVendorsGrid: {
    padding: 16,
    backgroundColor: '#FCFAF7',
  },
  noVendorsText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 13,
    color: '#6B5F4E',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonThumbnail} />
    <View style={styles.skeletonTextContainer}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSubtitle} />
    </View>
  </View>
);

const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </View>
);

export default EmptyFeedScreen;
