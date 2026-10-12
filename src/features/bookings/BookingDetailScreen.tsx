import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Booking } from '../../api/mockData';
import { CustomChevronLeft } from '../../components/common/Icons';
import Svg, { Path } from 'react-native-svg';

type NavigationProp = StackNavigationProp<RootStackParamList, 'BookingDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'BookingDetail'>;

const RatingStar: React.FC<{ size?: number; color?: string; fill?: string }> = ({
  size = 28,
  color = '#D8C29A',
  fill = 'transparent'
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke={color}
      strokeWidth={1.8}
      fill={fill}
      strokeLinejoin="round"
    />
  </Svg>
);

export const BookingDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;
  const { preferredLanguage, user } = useAuthStore();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [canModify, setCanModify] = useState(true);

  useEffect(() => {
    if (!booking) return;

    const checkTimeLimit = () => {
      let cancelUntilTime = 0;
      if (booking.cancelUntil) {
        cancelUntilTime = new Date(booking.cancelUntil).getTime();
      } else {
        // Fallback: 5 minutes after creation
        cancelUntilTime = new Date(booking.createdAt).getTime() + (5 * 60 * 1000);
      }

      const currentTime = new Date().getTime();

      if (currentTime >= cancelUntilTime) {
        setCanModify(false);
      } else {
        setCanModify(true);
        // Schedule a timeout to disable it exactly when cancelUntil is reached
        const remainingMs = cancelUntilTime - currentTime;
        const timer = setTimeout(() => {
          setCanModify(false);
        }, remainingMs);
        return () => clearTimeout(timer);
      }
    };

    checkTimeLimit();
    const interval = setInterval(checkTimeLimit, 10000);
    return () => {
      clearInterval(interval);
    };
  }, [booking]);

  const isMr = preferredLanguage === 'mr';

  const strings = {
    service: t('bookings.service'),
    amount: t('bookings.amount'),
    when: t('bookings.when'),
    payment: t('bookings.payment'),
    status: t('bookings.statusTitle'),
    bookingId: t('bookings.bookingId', { id: '' }).replace(': #', '').trim(),
    reschedule: t('bookings.reschedule'),
    cancel: t('bookings.cancelBooking'),
    bookAgain: t('bookings.bookAgain'),
    writeReview: t('bookings.writeReview'),
    infoText: t('bookings.infoText'),
    infoTextExpired: t('bookings.infoTextExpired'),
    ratingTitle: t('bookings.ratingTitle', { vendor: booking?.vendorName || "Aai's Bakery" }),
    ratingSubtitle: t('bookings.ratingSubtitle'),
    cancelConfirmTitle: t('bookings.cancelConfirmTitle'),
    cancelConfirmMsg: t('bookings.cancelConfirmMsg'),
    cancelYes: t('bookings.cancelYes'),
    cancelNo: t('bookings.cancelNo'),
    statusConfirmed: t('bookings.statusConfirmed'),
    statusPending: t('bookings.statusPending'),
    statusCompleted: t('bookings.statusCompleted'),
    statusCancelled: t('bookings.statusCancelled'),
    statusDeclined: t('bookings.statusDeclined'),
  };

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      const bookings = await api.getBookings(user?.id);
      const match = bookings.find((b: any) => b.id === bookingId);
      if (match) {
        setBooking(match);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetail();
  }, [bookingId]);

  const handleCancelBooking = () => {
    Alert.alert(
      strings.cancelConfirmTitle,
      strings.cancelConfirmMsg,
      [
        { text: strings.cancelNo, style: 'cancel' },
        {
          text: strings.cancelYes,
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const updated = await api.updateBookingStatus(bookingId, 'cancelled', 'completed');
              if (updated) {
                setBooking(updated);
                Alert.alert(isMr ? 'बुकिंग रद्द केली' : 'Booking cancelled successfully');
                navigation.goBack();
              }
            } catch (err) {
              console.error(err);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'accepted': return strings.statusConfirmed;
      case 'pending': return strings.statusPending;
      case 'completed': return strings.statusCompleted;
      case 'cancelled': return strings.statusCancelled;
      case 'declined': return strings.statusDeclined;
      default: return status;
    }
  };

  const getPaymentLabel = (b: Booking) => {
    const statusText = b.paymentStatus === 'paid' ? (isMr ? 'भरलेले' : 'Paid') : (isMr ? 'प्रलंबित' : 'Pending');
    const methodText = b.paymentMethod === 'upi' ? 'UPI' : b.paymentMethod === 'cod' ? 'COD' : b.paymentMethod.toUpperCase();
    return `${statusText} · ${methodText}`;
  };

  const formatBookingDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      const weekday = date.toLocaleDateString(isMr ? 'mr-IN' : 'en-US', { weekday: 'short' });
      const day = date.getDate();
      const month = date.toLocaleDateString(isMr ? 'mr-IN' : 'en-US', { month: 'short' });
      return `${weekday}, ${day} ${month} · ${timeStr}`;
    } catch {
      return `${dateStr} · ${timeStr}`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#E58A2B" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'left', 'right']}>
        <Text style={styles.errorText}>बुकिंग आढळली नाही!</Text>
      </SafeAreaView>
    );
  }

  const isUpcoming = booking.status === 'pending' || booking.status === 'accepted';
  const isCompleted = booking.status === 'completed';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={15}>
          <CustomChevronLeft size={20} color="#2A2520" strokeWidth={3} />
          <Text style={styles.backText}>{booking.vendorName}</Text>
        </Pressable>
      </View>

      {/* Header Divider */}
      <View style={styles.headerDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Detail Card Container */}
        <View style={styles.detailCard}>
          {/* Row 1: Service */}
          <View style={styles.row}>
            <Text style={styles.label}>{strings.service}</Text>
            <Text style={styles.value}>{booking.serviceName}</Text>
          </View>
          <View style={styles.cardDivider} />

          {/* Row 2: Amount */}
          <View style={styles.row}>
            <Text style={styles.label}>{strings.amount}</Text>
            <Text style={styles.value}>₹{booking.price}</Text>
          </View>
          <View style={styles.cardDivider} />

          {/* Row 3: When */}
          <View style={styles.row}>
            <Text style={styles.label}>{strings.when}</Text>
            <Text style={styles.value}>{formatBookingDate(booking.bookingDate, booking.bookingTime)}</Text>
          </View>
          <View style={styles.cardDivider} />

          {/* Row 4: Payment */}
          <View style={styles.row}>
            <Text style={styles.label}>{strings.payment}</Text>
            <Text style={styles.value}>{getPaymentLabel(booking)}</Text>
          </View>
          <View style={styles.cardDivider} />

          {/* Row 5: Booking Status */}
          <View style={styles.row}>
            <Text style={styles.label}>{strings.status}</Text>
            <Text style={[styles.value, styles.statusText, 
              booking.status === 'accepted' && { color: '#2E7D52' },
              booking.status === 'pending' && { color: '#854F0B' },
              booking.status === 'completed' && { color: '#2A2520' }
            ]}>
              {getStatusLabel(booking.status)}
            </Text>
          </View>
          <View style={styles.cardDivider} />

          {/* Row 6: Booking ID */}
          <View style={styles.row}>
            <Text style={styles.label}>{strings.bookingId}</Text>
            <Text style={styles.value}>
              {booking.id.startsWith('book-') ? `#${booking.id.substring(5, 12)}` : `#${booking.id}`}
            </Text>
          </View>
        </View>

        {/* Conditional Layout Section */}
        {isUpcoming && (
          /* Upcoming: Render Info Banner */
          <View style={[styles.infoBanner, !canModify && { backgroundColor: '#F9ECE2' }]}>
            <View style={[styles.bulletDot, !canModify && { backgroundColor: '#E58A2B' }]} />
            <Text style={[styles.infoText, !canModify && { color: '#854F0B' }]}>
              {canModify ? strings.infoText : strings.infoTextExpired}
            </Text>
          </View>
        )}

        {isCompleted && (
          /* Completed: Render rating banner */
          <View style={styles.ratingBanner}>
            <Text style={styles.ratingTitle}>{strings.ratingTitle}</Text>
            <Text style={styles.ratingSubtitle}>{strings.ratingSubtitle}</Text>
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= userRating;
                return (
                  <Pressable
                    key={star}
                    onPress={() => {
                      setUserRating(star);
                      navigation.navigate('WriteReview', { bookingId: booking.id, initialRating: star, businessName: booking.vendorName });
                    }}
                    style={styles.starBox}
                  >
                    <RatingStar 
                      size={28} 
                      color={isActive ? '#E58A2B' : '#D8C29A'} 
                      fill={isActive ? '#E58A2B' : 'transparent'} 
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Buttons Action Bar */}
      {isUpcoming && (
        <View style={styles.actionBar}>
          <Pressable 
            onPress={() => canModify && navigation.navigate('Booking', { vendorId: booking.vendorId })} 
            style={[styles.btnSecondary, !canModify && { opacity: 0.5 }]}
            disabled={!canModify}
          >
            <Text style={styles.btnSecondaryText}>{strings.reschedule}</Text>
          </Pressable>
          <Pressable 
            onPress={() => canModify && handleCancelBooking()} 
            style={[styles.btnSecondary, styles.borderDanger, !canModify && { opacity: 0.5 }]}
            disabled={!canModify}
          >
            <Text style={[styles.btnSecondaryText, styles.textDanger]}>{strings.cancel}</Text>
          </Pressable>
        </View>
      )}

      {isCompleted && (
        <View style={styles.actionBar}>
          <Pressable onPress={() => navigation.navigate('Booking', { vendorId: booking.vendorId })} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>{strings.bookAgain}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('WriteReview', { bookingId: booking.id, businessName: booking.vendorName })} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>{strings.writeReview}</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FBF6EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    color: '#6B5F4E',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 98,
    backgroundColor: '#FBF6EC',
    zIndex: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 22,
    top: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    marginLeft: 6,
    lineHeight: 25,
  },
  headerDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 98,
    height: 1,
    backgroundColor: '#EFE3CC',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 114, // 98 header + 16 padding
    paddingBottom: 120,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 38,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
  },
  value: {
    fontSize: 14,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
  },
  statusText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F2EAD9',
    width: '100%',
  },
  infoBanner: {
    width: '100%',
    height: 52,
    backgroundColor: '#FBF1E2',
    borderRadius: 12,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#9A5A12',
    marginRight: 9,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    flex: 1,
  },
  ratingBanner: {
    width: '100%',
    backgroundColor: '#FDF1DF',
    borderWidth: 1,
    borderColor: '#D8C29A',
    borderRadius: 20,
    marginTop: 22,
    padding: 16,
  },
  ratingTitle: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    lineHeight: 25,
  },
  ratingSubtitle: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    lineHeight: 20,
  },
  starContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  starBox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 28,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 9,
  },
  btnSecondary: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8C29A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  borderDanger: {
    borderColor: '#E3B5AE',
  },
  textDanger: {
    color: '#C0392B',
  },
  btnPrimary: {
    flex: 1,
    height: 44,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 13,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BookingDetailScreen;
