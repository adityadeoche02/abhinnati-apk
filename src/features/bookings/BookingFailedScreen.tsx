import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowRight, RefreshCw, XCircle } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';

type NavigationProp = StackNavigationProp<RootStackParamList, 'BookingFailed'>;

export const BookingFailedScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { preferredLanguage, activeArea } = useAuthStore();
  const {
    selectedVendorId,
    selectedVendorName,
    selectedService,
    selectedDate,
    selectedTime,
    notes,
    clearBookingState,
  } = useBookingStore();

  const [loading, setLoading] = useState(false);
  const isMr = preferredLanguage === 'mr';

  const strings = {
    title: t('bookings.paymentFailedTitle'),
    subtitle: t('bookings.paymentFailedSub'),
    cardHeader: t('bookings.transactionSummary'),
    service: t('bookings.serviceLabel'),
    vendor: t('bookings.vendorLabel'),
    price: t('bookings.priceLabel'),
    codTitle: t('bookings.codTitle'),
    codDesc: t('bookings.codDesc'),
    btnCod: t('bookings.btnCod'),
    btnRetry: t('bookings.btnRetry'),
    btnCancel: t('bookings.btnCancelBooking'),
    bookingError: t('bookings.bookingError'),
  };

  const handleRetryPayment = () => {
    // Navigate back to payment gateway to retry online payment
    navigation.navigate('PaymentGateway');
  };

  const handlePlaceCodBooking = async () => {
    if (!selectedVendorId || !selectedService || !selectedDate || !selectedTime || !activeArea) return;
    
    setLoading(true);
    try {
      // Place booking via COD
      const newBooking = await api.createBooking({
        vendorId: selectedVendorId,
        vendorName: selectedVendorName || 'व्यावसायिक',
        serviceId: selectedService.id,
        serviceName: isMr ? selectedService.name_mr : selectedService.name_en,
        price: selectedService.price,
        bookingDate: selectedDate,
        bookingTime: selectedTime,
        notes: notes || '',
        paymentMethod: 'cod',
      });

      // Clear search / booking store
      clearBookingState();

      // Navigate directly to success with booking id
      navigation.replace('BookingSuccess', { bookingId: newBooking.id });
    } catch (err) {
      console.error(err);
      alert(strings.bookingError);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = () => {
    clearBookingState();
    navigation.navigate('ResidentMain');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Error Header */}
        <View style={styles.headerContainer}>
          <View style={styles.errorIconCircle}>
            <AlertCircle size={48} color={theme.colors.danger} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>{strings.title}</Text>
          <Text style={styles.subtitle}>{strings.subtitle}</Text>
        </View>

        {/* Failed summary */}
        {selectedService && (
          <Card style={styles.infoCard}>
            <Text style={styles.cardHeader}>{strings.cardHeader}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>{strings.vendor}</Text>
              <Text style={styles.value}>{selectedVendorName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{strings.service}</Text>
              <Text style={styles.value}>{isMr ? selectedService.name_mr : selectedService.name_en}</Text>
            </View>
            <View style={[styles.row, styles.noBorder]}>
              <Text style={styles.label}>{strings.price}</Text>
              <Text style={styles.priceValue}>₹{selectedService.price}</Text>
            </View>
          </Card>
        )}

        {/* COD Toggle Box */}
        <Card style={styles.codCard}>
          <View style={styles.codHeaderRow}>
            <Text style={styles.codTitle}>{strings.codTitle}</Text>
          </View>
          <Text style={styles.codDesc}>{strings.codDesc}</Text>
          <Button
            title={strings.btnCod}
            onPress={handlePlaceCodBooking}
            loading={loading}
            style={styles.codBtn}
            textStyle={styles.codBtnText}
          />
        </Card>
      </View>

      {/* Footer Retry / Cancel Options */}
      <View style={styles.footer}>
        <Button
          title={strings.btnRetry}
          onPress={handleRetryPayment}
          style={styles.retryBtn}
        />
        <Button
          title={strings.btnCancel}
          onPress={handleCancelBooking}
          variant="secondary"
          style={styles.cancelBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  content: {
    flex: 1,
    paddingHorizontal: horizontalScale(18),
    paddingTop: verticalScale(24),
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  errorIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.dangerBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  title: {
    fontSize: moderateScale(22),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
    marginBottom: verticalScale(6),
  },
  subtitle: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: horizontalScale(16),
  },
  infoCard: {
    padding: horizontalScale(16),
    marginBottom: verticalScale(16),
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
  },
  cardHeader: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
    marginBottom: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    paddingBottom: verticalScale(6),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  noBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: theme.colors.charcoal,
  },
  priceValue: {
    fontSize: moderateScale(15),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
  },
  codCard: {
    padding: horizontalScale(16),
    borderColor: theme.colors.border,
    borderWidth: 1.5,
    backgroundColor: '#FAF0DE', // slightly warmer cream tint
  },
  codHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  codTitle: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.marigoldTintText,
  },
  codDesc: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    marginBottom: verticalScale(12),
    lineHeight: 18,
  },
  codBtn: {
    backgroundColor: theme.colors.marigold,
    height: verticalScale(42),
    borderRadius: 10,
    width: '100%',
  },
  codBtnText: {
    fontSize: moderateScale(13),
  },
  footer: {
    paddingHorizontal: horizontalScale(18),
    paddingBottom: verticalScale(24),
    gap: verticalScale(10),
  },
  retryBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
});

export default BookingFailedScreen;
