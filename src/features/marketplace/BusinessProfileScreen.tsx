import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Image, Modal, Linking, BackHandler } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Star, MapPin, Calendar, Clock, MessageSquare, AlertTriangle, Phone } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { CustomChevronLeft } from '../../components/common/Icons';
import { useBookingStore } from '../../store/useBookingStore';
import { api } from '../../api/client';
import { Vendor, Service, Review } from '../../api/mockData';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import Card from '../../components/common/Card';
import Tag from '../../components/common/Tag';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

type NavigationProp = StackNavigationProp<RootStackParamList, 'BusinessProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'BusinessProfile'>;

const translateDistance = (distStr: string, isMrLanguage: boolean) => {
  if (isMrLanguage || !distStr) return distStr;
  const marathiDigits = [/०/g, /१/g, /२/g, /३/g, /४/g, /५/g, /६/g, /७/g, /८/g, /९/g];
  let result = distStr;
  for (let i = 0; i < 10; i++) {
    result = result.replace(marathiDigits[i], String(i));
  }
  return result.replace('किमी', 'km').trim();
};

interface ServiceRowProps {
  service: Service;
  isMr: boolean;
  isBookable: boolean;
  isAdded: boolean;
  priceLabel: string;
  addText: string;
  addedText: string;
  onToggle: () => void;
}

const ServiceRow: React.FC<ServiceRowProps> = ({
  service,
  isMr,
  isBookable,
  isAdded,
  priceLabel,
  addText,
  addedText,
  onToggle,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={() => {
        if (isBookable) {
          scale.value = withTiming(0.98, { duration: 100, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        }
      }}
      onPressOut={() => {
        if (isBookable) {
          scale.value = withTiming(1, { duration: 100, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        }
      }}
      disabled={!isBookable}
      style={styles.serviceRowPressable}
    >
      <Animated.View style={[styles.serviceRowCard, animatedStyle]}>
        <View style={styles.serviceTextCol}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {isMr ? service.name_mr : service.name_en}
          </Text>
          <Text style={styles.servicePriceLabel}>
            {priceLabel}
          </Text>
        </View>

        <View
          style={[
            styles.addBtn,
            isAdded ? styles.addBtnAdded : styles.addBtnUnadded,
            !isBookable && styles.addBtnDisabled
          ]}
        >
          <Text style={[
            styles.addBtnText,
            isAdded ? styles.addBtnTextAdded : styles.addBtnTextUnadded,
            !isBookable && styles.addBtnTextDisabled
          ]}>
            {isAdded ? addedText : addText}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const MOCK_REVIEWS = [
  {
    id: 'rev-1',
    userName: 'Priya D.',
    rating: 5,
    text_en: 'Lovely custom cake, exactly like the photo. Tasted amazing too.',
    text_mr: 'खूपच सुंदर केक, अगदी फोटोसारखाच. चवही अप्रतिम होती.',
    date_en: '2 weeks ago',
    date_mr: '२ आठवड्यांपूर्वी',
    avatar: 'P',
  },
  {
    id: 'rev-2',
    userName: 'Sneha P.',
    rating: 5,
    text_en: 'Best bakery items in Bandra. The fresh daily bread is absolutely amazing!',
    text_mr: 'वांद्रे मधील सर्वोत्तम बेकरी उत्पादने. ताजा पाव खरोखरच अप्रतिम आहे!',
    date_en: '3 weeks ago',
    date_mr: '३ आठवड्यांपूर्वी',
    avatar: 'S',
  },
  {
    id: 'rev-3',
    userName: 'Rahul K.',
    rating: 4,
    text_en: 'Great custom cakes. A bit sweet but highly recommended.',
    text_mr: 'छान कस्टमाइज्ड केक. थोडे जास्त गोड पण नक्की शिफारस करेन.',
    date_en: '1 month ago',
    date_mr: '१ महिन्यापूर्वी',
    avatar: 'R',
  },
  {
    id: 'rev-4',
    userName: 'Anita S.',
    rating: 5,
    text_en: 'Excellent service and delicious pastries. Will order again!',
    text_mr: 'उत्कृष्ट सेवा आणि चवदार पेस्ट्री. पुन्हा नक्की ऑर्डर करेन!',
    date_en: '1 month ago',
    date_mr: '१ महिन्यापूर्वी',
    avatar: 'A',
  },
];

export const BusinessProfileScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { vendorId } = route.params;
  const { preferredLanguage } = useAuthStore();
  const { setBookingVendor, setBookingService } = useBookingStore();
  const { bottom } = useSafeAreaInsets();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewsY, setReviewsY] = useState(0);

  const isMr = preferredLanguage === 'mr';
  const strings = useMemo(() => ({
    back: t('common.back'),
    servicesTab: t('marketplace.servicesList'),
    reviewsTab: t('marketplace.reviews'),
    btnBook: t('marketplace.serviceAdd'),
    fullyBookedTitle: t('marketplace.fullyBookedTitle'),
    fullyBookedSub: t('marketplace.fullyBookedSub'),
    pendingVerification: t('marketplace.pendingVerification'),
    pendingVerificationSub: t('marketplace.pendingVerificationSub'),
    noServices: t('marketplace.noServices'),
    noReviews: t('marketplace.reviews'),
    replyTitle: t('marketplace.vendorResponse'),
  }), [t]);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        const data = await api.getVendorById(vendorId);
        setVendor(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendorDetails();
  }, [vendorId]);

  const handleServiceToggle = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleBook = () => {
    if (selectedServices.length === 0 || !vendor) return;
    setBookingVendor(vendor.id, isMr ? vendor.businessNameMr : vendor.businessNameEn);
    setBookingService(selectedServices[0]);
    navigation.navigate('Booking', { vendorId: vendor.id });
  };

  const handleOpenMap = () => {
    const url = 'https://www.google.com/maps/search/?api=1&query=Hill+Road,+Bandra+West,+Mumbai';
    Linking.openURL(url).catch(err => console.error("Couldn't load map", err));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.marigold} />
        </View>
      </SafeAreaView>
    );
  }

  if (!vendor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>{t('marketplace.vendorNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isApproved = vendor.kycStatus === 'approved';
  const phone = (vendor as any).phone;
  const whatsapp = (vendor as any).whatsapp;

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

  const photos = [
    { id: '1', color: '#F6E2C4', label: 'Custom Cake' },
    { id: '2', color: '#D3E2D8', label: 'Daily Bread' },
    { id: '3', color: '#E1D4E9', label: 'Sweets Box' },
    { id: '4', color: '#FDF1DF', label: 'Store Front' },
  ];

  const getSelectedText = () => {
    if (selectedServices.length === 1) {
      const s = selectedServices[0];
      const serviceName = isMr ? (s.name_mr || s.name_en) : (s.name_en || s.name_mr);
      return isMr ? `${serviceName} निवडले` : `${serviceName} selected`;
    }
    return t('marketplace.servicesSelected_other', { count: selectedServices.length });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          selectedServices.length > 0 && { paddingBottom: verticalScale(120) }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Section */}
        <View style={styles.coverContainer}>
          {/* Back chevron button */}
          <Pressable onPress={handleBack} style={styles.backBtnAbsolute} hitSlop={10} accessibilityLabel="Go back">
            <CustomChevronLeft size={24} color="#2A2520" strokeWidth={3} />
          </Pressable>
          
          {/* New Tag */}
          {vendor.reviewsCount <= 5 && (
            <View style={styles.newTag}>
              <Star size={11} color="#9A5A12" fill="#9A5A12" style={styles.tagStar} />
              <Text style={styles.tagText}>{t('marketplace.newTag')}</Text>
            </View>
          )}
        </View>

        {/* Banner Alert boards */}
        {vendor.isFullyBooked && (
          <View style={[styles.alertBanner, styles.dangerBanner]}>
            <AlertTriangle size={20} color={theme.colors.danger} />
            <View style={styles.alertTextWrapper}>
              <Text style={styles.alertTitle}>{strings.fullyBookedTitle}</Text>
              <Text style={styles.alertSub}>{strings.fullyBookedSub}</Text>
            </View>
          </View>
        )}

        {!isApproved && (
          <View style={[styles.alertBanner, styles.warningBanner]}>
            <AlertTriangle size={20} color={theme.colors.marigold} />
            <View style={styles.alertTextWrapper}>
              <Text style={styles.alertTitle}>{strings.pendingVerification}</Text>
              <Text style={styles.alertSub}>{strings.pendingVerificationSub}</Text>
            </View>
          </View>
        )}

        {/* Business Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.businessTitleRow}>
            <Text style={styles.businessName}>
              {isMr ? vendor.businessNameMr : vendor.businessNameEn}
            </Text>
            {isApproved && <VerifiedBadge size={17} style={styles.badge} />}
          </View>

          <View style={styles.metaRow}>
            <Star size={15} color={theme.colors.marigold} fill={theme.colors.marigold} style={styles.metaStar} />
            <Text style={styles.metaText}>
              {vendor.ratingAvg > 0 ? `${vendor.ratingAvg} (${vendor.reviewsCount})` : t('marketplace.newTag')} • {isMr ? vendor.categoryNameMr : vendor.categoryNameEn} • {translateDistance(vendor.distance, isMr)}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {t('marketplace.openTill')}
            </Text>

            {/* Launchers (WhatsApp/Call) if contact exists */}
            {(phone || whatsapp) && (
              <View style={styles.contactActions}>
                {phone && (
                  <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.contactBtn}>
                    <Phone size={14} color="#2A2520" />
                  </Pressable>
                )}
                {whatsapp && (
                  <Pressable onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)} style={styles.contactBtn}>
                    <MessageSquare size={14} color="#2E7D52" />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.descSection}>
          <Text style={styles.aboutHeaderLabel}>{t('marketplace.about')}</Text>
          <Text style={styles.description}>
            {isMr ? vendor.descriptionMr : vendor.descriptionEn}
          </Text>
        </View>

        {/* Services List Header */}
        <Text style={styles.servicesHeaderLabel}>
          {t('marketplace.servicesList')}
        </Text>

        {/* Services List */}
        <View style={styles.servicesList}>
          {vendor.services.length > 0 ? (
            vendor.services.map(service => {
              const isBookable = !vendor.isFullyBooked && vendor.kycStatus === 'approved';
              const isAdded = selectedServices.some(s => s.id === service.id);

              let serviceName = isMr ? service.name_mr : service.name_en;
              let priceLabel = '';
              
              if (vendor.id === 'vendor-aai') {
                if (service.id === 'srv-aai-1') {
                  serviceName = isMr ? 'कस्टम केक ऑर्डर' : 'Custom cake order';
                  priceLabel = isMr ? '₹६०० पासून' : 'from ₹600';
                } else if (service.id === 'srv-aai-2') {
                  serviceName = isMr ? 'ताजा पाव' : 'Daily fresh bread';
                  priceLabel = isMr ? '₹४० · पिकअप' : '₹40 · pickup';
                } else if (service.id === 'srv-aai-3') {
                  serviceName = isMr ? 'सणांचा गोड बॉक्स' : 'Festive sweets box';
                  priceLabel = isMr ? '₹३५० पासून' : 'from ₹350';
                }
              } else {
                priceLabel = isMr ? `₹${service.price} · ${service.duration_mins} मि` : `₹${service.price} · ${service.duration_mins} mins`;
              }

              // Overwrite local name with mapped name
              const mappedService = { ...service, name_mr: serviceName, name_en: serviceName };

              return (
                <ServiceRow
                  key={service.id}
                  service={mappedService}
                  isMr={isMr}
                  isBookable={isBookable}
                  isAdded={isAdded}
                  priceLabel={priceLabel}
                  addText={t('marketplace.serviceAdd')}
                  addedText={t('marketplace.serviceAdded')}
                  onToggle={() => handleServiceToggle(service)}
                />
              );
            })
          ) : (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>{strings.noServices}</Text>
            </View>
          )}
        </View>

        {/* Photos Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>
            {t('marketplace.photos')}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photosScroll}
        >
          {photos.map(p => (
            <Pressable
              key={p.id}
              onPress={() => setSelectedPhoto(p.color)}
              style={[styles.photoCard, { backgroundColor: p.color }]}
            >
              <Text style={styles.photoLabel}>{p.label[0]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Reviews Section */}
        <View 
          onLayout={(event) => {
            setReviewsY(event.nativeEvent.layout.y);
          }}
          style={styles.sectionHeaderRow}
        >
          <Text style={styles.sectionHeaderLabel}>
            {t('marketplace.reviews')}
          </Text>
          {!showAllReviews && (
            <Pressable onPress={() => {
              setShowAllReviews(true);
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: reviewsY, animated: true });
              }, 60);
            }}>
              <Text style={styles.seeAllText}>
                {t('marketplace.seeAll')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.ratingStatsRow}>
          <Text style={styles.largeRatingText}>4.6</Text>
          <View style={styles.ratingStarsCol}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={16} color={theme.colors.marigold} fill={theme.colors.marigold} style={styles.starSpace} />
              ))}
            </View>
            <Text style={styles.ratingSubtext}>
              {t('marketplace.basedOnReviews', { count: 38 })}
            </Text>
          </View>
        </View>

        {/* Dynamic Reviews List */}
        {(showAllReviews ? MOCK_REVIEWS : [MOCK_REVIEWS[0]]).map((review) => (
          <Card key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAvatar}>
                <Text style={styles.reviewAvatarText}>{review.avatar}</Text>
              </View>
              <View style={styles.reviewMeta}>
                <Text style={styles.reviewAuthor}>{review.userName}</Text>
                <Text style={styles.reviewDate}>{isMr ? review.date_mr : review.date_en}</Text>
              </View>
              <View style={styles.reviewStars}>
                {Array.from({ length: review.rating }).map((_, star) => (
                  <Star key={star} size={12} color={theme.colors.marigold} fill={theme.colors.marigold} style={styles.starSpace} />
                ))}
              </View>
            </View>
            <Text style={styles.reviewText}>
              {isMr ? review.text_mr : review.text_en}
            </Text>
          </Card>
        ))}

        {/* Location & Hours Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>
            {t('marketplace.locationAndHours')}
          </Text>
        </View>

        {/* Mock Map Image Container */}
        <Pressable onPress={handleOpenMap} style={styles.mapContainer}>
          <View style={styles.mapGrid}>
            <View style={styles.mapPark} />
            <View style={styles.mapRoadH} />
            <View style={styles.mapRoadV} />
            <View style={styles.mapPinContainer}>
              <MapPin size={24} color={theme.colors.danger} fill={theme.colors.danger} />
            </View>
          </View>
        </Pressable>
        <Text style={styles.addressText}>
          Hill Road, Bandra West, Mumbai
        </Text>

      </ScrollView>

      {/* Full-screen Photo Gallery Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        onRequestClose={() => setSelectedPhoto(null)}
        animationType="fade"
      >
        <Pressable 
          style={styles.galleryContainer} 
          onPress={() => setSelectedPhoto(null)}
        >
          <View style={[styles.galleryPhoto, { backgroundColor: selectedPhoto || '#FFFFFF' }]}>
            <Text style={styles.galleryCloseText}>
              {t('marketplace.tapToClose')}
            </Text>
          </View>
        </Pressable>
      </Modal>

      {/* Floating Bottom Sticky Book Bar */}
      {selectedServices.length > 0 && (
        <View style={[styles.bookBar, { paddingBottom: bottom || 16, height: 82 + (bottom || 0) }]}>
          <View style={styles.bookBarDivider} />
          <Text style={styles.selectedServiceText}>
            {getSelectedText()}
          </Text>
          <Pressable 
            onPress={handleBook}
            style={styles.bookBtnSubmit}
          >
            <Text style={styles.bookBtnSubmitText}>
              {t('marketplace.bookNow')}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  coverContainer: {
    width: '100%',
    height: 174,
    backgroundColor: '#F6E2C4',
  },
  backBtnAbsolute: {
    position: 'absolute',
    left: 22,
    top: 66,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTag: {
    position: 'absolute',
    width: 56,
    height: 22,
    left: 319,
    top: 61,
    backgroundColor: '#FBE7CC',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tagStar: {
    marginRight: 4,
  },
  tagText: {
    fontSize: moderateScale(11),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#9A5A12',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: verticalScale(40),
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: horizontalScale(14),
    marginHorizontal: 18,
    marginTop: verticalScale(14),
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerBanner: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
  },
  warningBanner: {
    backgroundColor: theme.colors.marigoldTintBg,
    borderColor: theme.colors.border,
  },
  alertTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: moderateScale(theme.typography.sizes.body),
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.charcoal,
  },
  alertSub: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  titleSection: {
    height: 98,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  businessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#2A2520',
  },
  badge: {
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 7,
  },
  metaStar: {
    marginRight: 0,
  },
  metaText: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B5F4E',
    lineHeight: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2E7D52',
    marginRight: 5,
  },
  statusText: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: '500',
    color: '#2E7D52',
    lineHeight: 20,
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  contactBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3ECE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descSection: {
    paddingHorizontal: 18,
    marginTop: verticalScale(14),
  },
  aboutHeaderLabel: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#6B5F4E',
    marginBottom: 6,
  },
  description: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: moderateScale(20),
  },
  servicesHeaderLabel: {
    marginLeft: 18,
    marginTop: 22,
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#6B5F4E',
    lineHeight: 22,
  },
  sectionHeaderLabel: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#6B5F4E',
    lineHeight: 22,
  },
  servicesList: {
    paddingHorizontal: 0,
    marginTop: 4,
  },
  serviceRowPressable: {
    width: '100%',
  },
  serviceRowCard: {
    height: 64,
    marginHorizontal: 18,
    marginVertical: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTextCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  serviceName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#2A2520',
    lineHeight: 23,
  },
  servicePriceLabel: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#8A7C66',
    lineHeight: 20,
    marginTop: 2,
  },
  addBtn: {
    width: 72,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnAdded: {
    backgroundColor: '#E58A2B',
  },
  addBtnUnadded: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8C29A',
  },
  addBtnDisabled: {
    backgroundColor: theme.colors.board,
    borderColor: theme.colors.board,
  },
  addBtnText: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    lineHeight: 23,
  },
  addBtnTextAdded: {
    color: '#FFFFFF',
  },
  addBtnTextUnadded: {
    color: '#3D362E',
  },
  addBtnTextDisabled: {
    color: theme.colors.textSecondary,
  },
  emptyTab: {
    padding: horizontalScale(40),
    alignItems: 'center',
  },
  emptyTabText: {
    fontSize: moderateScale(14),
    color: theme.colors.textTertiary,
    fontFamily: theme.typography.fontFamily.regular,
  },
  bookBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  bookBarDivider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#EFE3CC',
  },
  selectedServiceText: {
    fontSize: 15,
    fontFamily: 'Mukta-Regular',
    color: '#3D362E',
  },
  bookBtnSubmit: {
    width: 162,
    height: 44,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnSubmitText: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 25,
  },

  // Photos Section
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#9A5A12',
  },
  photosScroll: {
    paddingHorizontal: 18,
    gap: 10,
  },
  photoCard: {
    width: 84,
    height: 84,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 24,
    fontFamily: theme.typography.fontFamily.bold,
    color: 'rgba(42, 37, 32, 0.25)',
  },

  // Reviews Section
  ratingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 16,
    gap: 12,
  },
  largeRatingText: {
    fontSize: moderateScale(36),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: '#2A2520',
  },
  ratingStarsCol: {
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  starSpace: {
    marginRight: 2,
  },
  ratingSubtext: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#8A7C66',
  },
  reviewCard: {
    marginHorizontal: 18,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 18,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewAvatarText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: '#9A5A12',
  },
  reviewMeta: {
    flex: 1,
  },
  reviewAuthor: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#2A2520',
  },
  reviewDate: {
    fontSize: moderateScale(11),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#8A7C66',
    marginTop: 1,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B5F4E',
    lineHeight: 20,
  },

  // Map Section
  mapContainer: {
    marginHorizontal: 18,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EFE3CC',
    marginBottom: 10,
  },
  mapGrid: {
    flex: 1,
    backgroundColor: '#E8EFE9',
    position: 'relative',
  },
  mapPark: {
    position: 'absolute',
    left: '10%',
    top: '20%',
    width: '40%',
    height: '50%',
    backgroundColor: '#D3E2D8',
    borderRadius: 12,
  },
  mapRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
    height: 12,
    backgroundColor: '#FFFFFF',
  },
  mapRoadV: {
    position: 'absolute',
    left: '60%',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: '#FFFFFF',
  },
  mapPinContainer: {
    position: 'absolute',
    left: '56%',
    top: '30%',
  },
  addressText: {
    marginHorizontal: 18,
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#2A2520',
    marginBottom: 20,
  },

  // Gallery Styles
  galleryContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryPhoto: {
    width: 300,
    height: 300,
    borderRadius: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  galleryCloseText: {
    color: '#2A2520',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
});

export default BusinessProfileScreen;
