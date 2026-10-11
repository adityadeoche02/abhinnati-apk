import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Vendor, Service } from '../../api/mockData';

export const ManageServicesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, preferredLanguage } = useAuthStore();
  const navigation = useNavigation<any>();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [pausedServices, setPausedServices] = useState<string[]>(['srv-aai-2']); // Daily fresh bread paused by default to match screenshot

  const CustomSwitch = ({ value, onValueChange }: { value: boolean; onValueChange: () => void }) => {
    return (
      <Pressable 
        onPress={onValueChange} 
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          backgroundColor: value ? '#2A2520' : '#E0CFB0',
          position: 'relative',
          justifyContent: 'center',
        }}
      >
        <View 
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: '#FFFFFF',
            position: 'absolute',
            left: value ? 18 : 2,
            top: 2,
          }}
        />
      </Pressable>
    );
  };

  const isMr = preferredLanguage === 'mr';

  const strings = {
    title: t('vendor.servicesListTitle'),
    servicesCount: (count: number) => t('vendor.servicesCount', { count }),
    available: t('vendor.available'),
    paused: t('vendor.paused'),
    addService: t('vendor.addServiceBtn'),
  };

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

  const toggleServiceAvailability = (serviceId: string) => {
    setPausedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleOpenAddModal = () => {
    navigation.navigate('EditService', {});
  };

  const handleOpenEditModal = (service: Service) => {
    navigation.navigate('EditService', { serviceId: service.id });
  };

  const getServicePriceLabel = (item: Service) => {
    if (item.name_en.includes('Custom cake') || item.id === 'srv-aai-1') {
      return isMr ? '₹६०० पासून' : 'from ₹600';
    }
    if (item.name_en.includes('Daily fresh') || item.id === 'srv-aai-2') {
      return isMr ? '₹४० · पिकअप' : '₹40 · pickup';
    }
    if (item.name_en.includes('Birthday party') || item.id === 'srv-aai-3') {
      return isMr ? '₹१,५०० पासून' : 'from ₹1,500';
    }
    return `₹${item.price}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E58A2B" />
      </SafeAreaView>
    );
  }

  if (!vendor) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.noVendorText}>No business profile found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{strings.title}</Text>
      </View>
      <View style={styles.headerDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Vendor Header Row */}
        <View style={styles.vendorHeaderRow}>
          <View style={styles.vendorLogo} />
          <View style={styles.vendorInfo}>
            <View style={styles.vendorTitleRow}>
              <Text style={styles.vendorName}>
                {isMr ? vendor.businessNameMr : vendor.businessNameEn}
              </Text>
              <View style={styles.verifiedBadge}>
                <Svg width={7} height={5} viewBox="0 0 7 5">
                  <Path d="M1 2.5l2 2 3-3.5" stroke="#FFFFFF" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </View>
            <Text style={styles.servicesCount}>
              {strings.servicesCount(vendor.services.length)}
            </Text>
          </View>
        </View>

        {/* Services List */}
        {vendor.services.map((item) => {
          const isAvailable = !pausedServices.includes(item.id);
          return (
            <View key={item.id} style={styles.serviceCard}>
              <View style={styles.serviceMainRow}>
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceNameText}>
                    {isMr ? item.name_mr : item.name_en}
                  </Text>
                  <Text style={styles.servicePrice}>
                    {getServicePriceLabel(item)}
                  </Text>
                </View>
                
                {/* Edit Icon SVG */}
                <Pressable onPress={() => handleOpenEditModal(item)} style={styles.editBtn} hitSlop={10}>
                  <Svg width={12} height={12} viewBox="0 0 12 12">
                    <Path d="M7.5 1.5l3 3L3.5 11H.5V8l7-7z" stroke="#8A7C66" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Pressable>
              </View>

              {/* Toggle Footer */}
              <View style={styles.toggleRow}>
                <CustomSwitch
                  value={isAvailable}
                  onValueChange={() => toggleServiceAvailability(item.id)}
                />
                <Text style={[styles.toggleText, !isAvailable && styles.toggleTextPaused]}>
                  {isAvailable ? strings.available : strings.paused}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Dashed Add a service button */}
        <Pressable onPress={handleOpenAddModal} style={styles.addServiceBtn}>
          <Text style={styles.addServiceBtnText}>{strings.addService}</Text>
        </Pressable>

        <View style={styles.spacingBottom} />
      </ScrollView>
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
  noVendorText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    color: '#8A7C66',
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
  headerTitle: {
    position: 'absolute',
    left: 22,
    top: 53,
    fontSize: 22,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    lineHeight: 37,
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
  vendorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    height: 44,
  },
  vendorLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFD3AE',
    marginRight: 12,
  },
  vendorInfo: {
    justifyContent: 'center',
  },
  vendorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 25,
  },
  vendorName: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    lineHeight: 25,
  },
  verifiedBadge: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#E58A2B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  servicesCount: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    lineHeight: 22,
    marginTop: -3,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 100, // Starts after the header divider
    paddingBottom: 100,
  },
  serviceCard: {
    width: 357,
    height: 93,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    position: 'relative',
  },
  serviceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    height: 41,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceNameText: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    lineHeight: 25,
    marginTop: -4,
  },
  servicePrice: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
    lineHeight: 20,
  },
  editBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    top: 5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 22,
    marginTop: 6,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
    lineHeight: 20,
  },
  toggleTextPaused: {
    color: '#A89A82',
  },
  addServiceBtn: {
    width: 357,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: '#C9A877',
    backgroundColor: '#FBF6EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addServiceBtnText: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#9A5A12',
    lineHeight: 25,
  },
  spacingBottom: {
    height: 120,
  },
});

export default ManageServicesScreen;
