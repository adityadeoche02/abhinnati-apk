import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Phone, Calendar, Clock, CreditCard, FileText, Check, X, Navigation, Play, CheckCircle } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Tag from '../../components/common/Tag';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Booking } from '../../api/mockData';

type NavigationProp = StackNavigationProp<RootStackParamList, 'BookingAction'>;
type RouteProps = RouteProp<RootStackParamList, 'BookingAction'>;

export const BookingActionScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;
  const { preferredLanguage, user } = useAuthStore();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isMr = preferredLanguage === 'mr';

  const strings = {
    back: t('common.back'),
    title: t('vendor.orderDetailsTitle'),
    clientSection: t('vendor.clientInfo'),
    serviceSection: t('vendor.serviceDetails'),
    paymentSection: t('vendor.paymentDetails'),
    btnCall: t('vendor.btnCallClient'),
    btnAccept: t('vendor.btnAcceptRequest'),
    btnDecline: t('vendor.btnDeclineRequest'),
    lblDate: t('vendor.dateLabel'),
    lblTime: t('vendor.timeSlotLabel'),
    lblNotes: t('vendor.notesLabel'),
    lblPayment: t('vendor.methodLabel'),
    lblAmount: t('vendor.totalAmountLabel'),
    statusLabel: t('vendor.currentStatusLabel'),
    trackingLabel: t('vendor.trackingStageLabel'),
    loading: t('bookings.loadingDetails'),
    paymentCod: t('vendor.codPayment'),
    paymentOnline: t('vendor.onlinePayment'),
    declineConfirm: t('vendor.declineConfirmMsg'),
    declineTitle: t('vendor.declineTitle'),
    cancel: t('common.cancel'),
    decline: t('vendor.reject'),
    stageEnRoute: t('vendor.stageStartTravel'),
    stageInProgress: t('vendor.stageStartWork'),
    stageCompleted: t('vendor.stageMarkDone'),
    trackingOrdered: t('vendor.trackingApproved'),
    trackingEnRoute: t('vendor.trackingEnRoute'),
    trackingInProgress: t('vendor.trackingInProgress'),
    trackingCompleted: t('vendor.trackingJobDone'),
  };

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      if (user) {
        const v = await api.getVendorByUserId(user.id);
        if (v) {
          const all = await api.getBookings(undefined, v.id);
          const match = all.find((b: any) => b.id === bookingId);
          if (match) {
            setBooking(match);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookingDetails();
  }, [bookingId]);

  const handleCall = () => {
    if (!booking) return;
    Linking.openURL(`tel:${booking.userPhone}`);
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const updated = await api.updateBookingStatus(bookingId, 'accepted', 'ordered');
      if (updated) {
        setBooking(updated);
        Alert.alert(isMr ? 'ऑर्डर स्वीकारली' : 'Order Accepted', isMr ? 'बुकिंग यशस्वीरित्या स्वीकारली गेली आहे.' : 'The booking has been successfully accepted.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      strings.declineTitle,
      strings.declineConfirm,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.decline,
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await api.updateBookingStatus(bookingId, 'declined');
              if (updated) {
                setBooking(updated);
                navigation.goBack();
              }
            } catch (err) {
              console.error(err);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateTracking = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      let nextTracking: Booking['trackingStatus'] = 'ordered';
      let status: Booking['status'] = 'accepted';

      if (booking.trackingStatus === 'ordered') {
        nextTracking = 'en_route';
      } else if (booking.trackingStatus === 'en_route') {
        nextTracking = 'in_progress';
      } else if (booking.trackingStatus === 'in_progress') {
        nextTracking = 'completed';
        status = 'completed';
      }

      const updated = await api.updateBookingStatus(bookingId, status, nextTracking);
      if (updated) {
        setBooking(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getTrackingLabel = (tracking: Booking['trackingStatus']) => {
    switch (tracking) {
      case 'ordered': return strings.trackingOrdered;
      case 'en_route': return strings.trackingEnRoute;
      case 'in_progress': return strings.trackingInProgress;
      case 'completed': return strings.trackingCompleted;
      default: return tracking;
    }
  };

  const getTrackingButtonTitle = (tracking: Booking['trackingStatus']) => {
    switch (tracking) {
      case 'ordered': return strings.stageEnRoute;
      case 'en_route': return strings.stageInProgress;
      case 'in_progress': return strings.stageCompleted;
      default: return '';
    }
  };

  const getTrackingIcon = (tracking: Booking['trackingStatus']) => {
    switch (tracking) {
      case 'ordered': return <Navigation size={16} color={theme.colors.white} />;
      case 'en_route': return <Play size={16} color={theme.colors.white} />;
      case 'in_progress': return <CheckCircle size={16} color={theme.colors.white} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.marigold} />
        <Text style={styles.loadingText}>{strings.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>ऑर्डर सापडली नाही!</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.charcoal} />
          <Text style={styles.backText}>{strings.back}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{strings.title}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <Card style={[styles.statusCard, booking.status === 'completed' && styles.statusCompleted]}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{strings.statusLabel}</Text>
            <Tag 
              text={booking.status.toUpperCase()} 
              variant={booking.status === 'completed' ? 'success' : booking.status === 'accepted' ? 'spotlight' : 'local_issue'} 
            />
          </View>
          {booking.status === 'accepted' && (
            <View style={[styles.statusRow, { marginTop: 10 }]}>
              <Text style={styles.statusLabel}>{strings.trackingLabel}</Text>
              <Tag text={getTrackingLabel(booking.trackingStatus)} variant="neutral" />
            </View>
          )}
        </Card>

        {/* Client details card */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionHeader}>{strings.clientSection}</Text>
          <Text style={styles.clientName}>{booking.userName}</Text>
          <Text style={styles.clientPhone}>{booking.userPhone}</Text>
          
          <Button 
            title={strings.btnCall} 
            onPress={handleCall}
            variant="secondary"
            style={styles.callBtn}
          />
        </Card>

        {/* Booking details card */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionHeader}>{strings.serviceSection}</Text>
          <Text style={styles.serviceName}>{booking.serviceName}</Text>
          
          <View style={styles.detailRow}>
            <Calendar size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>{strings.lblDate}</Text>
            <Text style={styles.detailValue}>{booking.bookingDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>{strings.lblTime}</Text>
            <Text style={styles.detailValue}>{booking.bookingTime}</Text>
          </View>

          {booking.notes ? (
            <View style={styles.notesBox}>
              <FileText size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
              <Text style={styles.detailLabel}>{strings.lblNotes}</Text>
              <Text style={styles.notesValue}>{booking.notes}</Text>
            </View>
          ) : null}
        </Card>

        {/* Payment details card */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionHeader}>{strings.paymentSection}</Text>
          
          <View style={styles.detailRow}>
            <CreditCard size={16} color={theme.colors.textSecondary} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>{strings.lblPayment}</Text>
            <Text style={styles.detailValue}>
              {booking.paymentMethod === 'cod' ? strings.paymentCod : strings.paymentOnline}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.amountLabel}>{strings.lblAmount}</Text>
            <Text style={styles.amountValue}>₹{booking.price}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        {booking.status === 'pending' ? (
          <View style={styles.footerActionRow}>
            <Button
              title={strings.btnDecline}
              onPress={handleDecline}
              variant="danger"
              disabled={actionLoading}
              style={styles.actionBtnHalf}
            />
            <Button
              title={strings.btnAccept}
              onPress={handleAccept}
              loading={actionLoading}
              style={[styles.actionBtnHalf, { backgroundColor: theme.colors.success }]}
            />
          </View>
        ) : booking.status === 'accepted' && booking.trackingStatus !== 'completed' ? (
          <Button
            title={getTrackingButtonTitle(booking.trackingStatus)}
            onPress={handleUpdateTracking}
            loading={actionLoading}
            style={styles.actionBtnFull}
            textStyle={styles.btnTextIcon}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
  },
  loadingText: {
    marginTop: 12,
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textSecondary,
  },
  header: {
    paddingHorizontal: horizontalScale(18),
    height: verticalScale(50),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: horizontalScale(80),
  },
  backText: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.charcoal,
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.charcoal,
  },
  placeholder: {
    width: horizontalScale(80),
  },
  scrollContent: {
    padding: horizontalScale(18),
    paddingBottom: verticalScale(100),
  },
  statusCard: {
    padding: horizontalScale(16),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  statusCompleted: {
    borderColor: theme.colors.successBg,
    backgroundColor: theme.colors.successBg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    padding: horizontalScale(16),
    marginVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  sectionHeader: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: verticalScale(10),
  },
  clientName: {
    fontSize: moderateScale(16),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
  },
  clientPhone: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    marginTop: verticalScale(12),
    height: verticalScale(38),
  },
  serviceName: {
    fontSize: moderateScale(16),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
    marginBottom: verticalScale(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(6),
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textTertiary,
    width: horizontalScale(80),
  },
  detailValue: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: theme.colors.charcoal,
  },
  notesBox: {
    flexDirection: 'row',
    marginTop: verticalScale(10),
    backgroundColor: theme.colors.cream,
    padding: horizontalScale(10),
    borderRadius: 8,
  },
  notesValue: {
    flex: 1,
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  amountLabel: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
  },
  amountValue: {
    fontSize: moderateScale(18),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.marigold,
    marginLeft: 'auto',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: horizontalScale(18),
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnHalf: {
    flex: 1,
    height: verticalScale(46),
  },
  actionBtnFull: {
    width: '100%',
    height: verticalScale(46),
    backgroundColor: theme.colors.charcoal,
  },
  btnTextIcon: {
    fontSize: moderateScale(14),
  },
});

export default BookingActionScreen;
