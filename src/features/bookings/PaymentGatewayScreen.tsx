import React, { useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react-native';
import { CustomChevronLeft } from '../../components/common/Icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import { api } from '../../api/client';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList, 'PaymentGateway'>;

export const PaymentGatewayScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user, preferredLanguage } = useAuthStore();
  const {
    selectedVendorId,
    selectedVendorName,
    selectedService,
    selectedDate,
    selectedTime,
    notes,
    clearBookingState,
  } = useBookingStore();

  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'wallet'>('upi');

  const isMr = preferredLanguage === 'mr';
  const strings = {
    header: t('bookings.paymentHeader'),
    payUsing: t('bookings.payUsing'),
    upi: t('bookings.paymentUpi'),
    card: t('bookings.paymentCard'),
    wallet: t('bookings.paymentWallet'),
    totalLabel: t('bookings.totalLabel'),
    btnPay: t('bookings.btnPay'),
    processingText: t('bookings.processingPayment'),
  };

  const handlePayment = async () => {
    if (!selectedVendorId || !selectedService || !selectedDate || !selectedTime) {
      Alert.alert(
        isMr ? 'त्रुटी' : 'Error',
        isMr ? 'कृपया सेवा, तारीख आणि वेळ निवडा.' : 'Please select service, date, and time.'
      );
      return;
    }

    const finalVendorId = selectedVendorId;
    const finalVendorName = selectedVendorName || (isMr ? 'व्यवसायिक' : 'Vendor');
    const finalServiceId = selectedService.id;
    const finalServiceName = isMr ? selectedService.name_mr : selectedService.name_en;
    const finalPrice = selectedService.price || 0;
    const finalDate = selectedDate;
    const finalTime = selectedTime;

    setProcessing(true);
    // Simulate gateway delay
    await new Promise((r) => setTimeout(r, 1500));

    try {
      const newBooking = await api.createBooking({
        userId: user?.id,
        userName: user?.name || t('bookings.anonymousUser'),
        userPhone: user?.phone || '',
        vendorId: finalVendorId,
        vendorName: finalVendorName,
        serviceId: finalServiceId,
        serviceName: finalServiceName,
        price: finalPrice,
        bookingDate: finalDate,
        bookingTime: finalTime,
        notes: notes || undefined,
        paymentMethod: selectedMethod,
        transactionId: `pay_mock_${Date.now().toString().slice(-8)}`,
      });

      setProcessing(false);
      clearBookingState();
      navigation.replace('BookingSuccess', { bookingId: newBooking.id });
    } catch (err) {
      console.error(err);
      setProcessing(false);
      navigation.replace('BookingFailed');
    }
  };

  const finalPrice = selectedService?.price || 0;
  const finalServiceName = selectedService ? (isMr ? selectedService.name_mr : selectedService.name_en) : (isMr ? 'निवडलेली सेवा' : 'Selected Service');
  
  // Format Date and Time
  const formatTimeSlot = (time: string) => {
    if (time === '10:00') return '10:00 AM';
    if (time === '12:30') return '12:30 PM';
    if (time === '4:00') return '4:00 PM';
    if (time === '5:30') return '5:30 PM';
    if (time === '6:00') return '6:00 PM';
    if (time === '7:30') return '7:30 PM';
    return time;
  };

  const getFormattedDateLabel = (dateStr: string | null) => {
    if (!dateStr) return isMr ? 'मंग २५' : 'Tue 25';
    try {
      const dateObj = new Date(dateStr);
      const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const daysMr = ['रवि', 'सोम', 'मंग', 'बुध', 'गुरू', 'शुक्र', 'शनी'];
      
      const dayLabel = isMr ? daysMr[dateObj.getDay()] : daysEn[dateObj.getDay()];
      const dayNum = dateObj.getDate();
      return `${dayLabel} ${dayNum}`;
    } catch {
      return dateStr;
    }
  };

  const formattedDate = getFormattedDateLabel(selectedDate);
  const formattedTime = formatTimeSlot(selectedTime || '12:30');
  const serviceSummaryStr = `${finalServiceName} · ${formattedDate}, ${formattedTime}`;

  const renderOption = (method: 'upi' | 'card' | 'wallet', label: string) => {
    const isSelected = selectedMethod === method;
    return (
      <Pressable
        key={method}
        onPress={() => setSelectedMethod(method)}
        disabled={processing}
        style={[
          styles.optionCard,
          isSelected ? styles.selectedCard : styles.unselectedCard,
        ]}
      >
        <Text style={[
          styles.optionText,
          isSelected ? styles.selectedOptionText : styles.unselectedOptionText
        ]}>
          {label}
        </Text>
        
        {isSelected ? (
          <View style={styles.selectedEllipse}>
            <View style={styles.checkmarkIcon} />
          </View>
        ) : (
          <View style={styles.unselectedEllipse} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {processing ? (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#E58A2B" />
          <Text style={styles.processingText}>{strings.processingText}</Text>
          <View style={styles.secureBadge}>
            <ShieldCheck size={16} color="#2E7D52" />
            <Text style={styles.secureText}>PCI-DSS Compliant</Text>
          </View>
        </View>
      ) : (
        <View style={styles.viewport}>
          {/* Navigation Header */}
          <View style={styles.navigationHeader}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
              <CustomChevronLeft size={20} color="#2A2520" strokeWidth={3} />
              <Text style={styles.headerTitle}>{strings.header}</Text>
            </Pressable>
          </View>

          <View style={styles.content}>
            {/* Bill Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {serviceSummaryStr}
              </Text>
              <Text style={styles.servicePrice}>₹{finalPrice}</Text>
              
              <Text style={styles.totalLabel}>{strings.totalLabel}</Text>
              <Text style={styles.totalPrice}>₹{finalPrice}</Text>
            </View>

            {/* Pay Using Label */}
            <Text style={styles.payUsingLabel}>{strings.payUsing}</Text>

            {/* Payment Options list */}
            {renderOption('upi', strings.upi)}
            {renderOption('card', strings.card)}
            {renderOption('wallet', strings.wallet)}
          </View>

          {/* Bottom Pay CTA Button */}
          <View style={styles.footer}>
            <Pressable
              onPress={handlePayment}
              style={styles.payButton}
            >
              <Text style={styles.payButtonText}>
                {isMr ? `₹${finalPrice} ${strings.btnPay}` : `${strings.btnPay} ₹${finalPrice}`}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC', // Warm cream page background
  },
  viewport: {
    flex: 1,
    backgroundColor: '#FBF6EC',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  navigationHeader: {
    paddingTop: 66,
    paddingBottom: 24,
    backgroundColor: '#FBF6EC',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3CC',
  },
  backRow: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    lineHeight: 28,
    marginLeft: 6,
  },
  summaryCard: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 11,
    marginBottom: 24,
  },
  serviceName: {
    position: 'absolute',
    left: 12,
    top: 12,
    height: 20,
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 20,
    color: '#6B5F4E',
    right: 70,
  },
  servicePrice: {
    position: 'absolute',
    right: 12,
    top: 12,
    height: 20,
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 20,
    color: '#6B5F4E',
    textAlign: 'right',
  },
  totalLabel: {
    position: 'absolute',
    left: 12,
    top: 44,
    height: 22,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 22,
    color: '#2A2520',
  },
  totalPrice: {
    position: 'absolute',
    right: 12,
    top: 44,
    height: 22,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 22,
    color: '#2A2520',
    textAlign: 'right',
  },
  payUsingLabel: {
    height: 22,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 22,
    color: '#6B5F4E',
    marginBottom: 10,
  },
  optionCard: {
    height: 52,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  selectedCard: {
    backgroundColor: '#FCE9CD', // slightly darker orange fill so it is very visible
    borderWidth: 1.5,
    borderColor: '#E58A2B',
  },
  unselectedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0CFB0',
  },
  optionText: {
    position: 'absolute',
    left: 14,
    top: 14.5,
    height: 23,
    fontFamily: 'Mukta-Regular',
    fontSize: 14,
    lineHeight: 23,
  },
  selectedOptionText: {
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    color: '#2A2520',
  },
  unselectedOptionText: {
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    color: '#6B5F4E',
  },
  selectedEllipse: {
    position: 'absolute',
    right: 14,
    top: 17,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E58A2B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedEllipse: {
    position: 'absolute',
    right: 14,
    top: 17,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C2B193',
    backgroundColor: 'transparent',
  },
  checkmarkIcon: {
    width: 9,
    height: 5,
    borderLeftWidth: 1.6,
    borderBottomWidth: 1.6,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }],
    top: -1,
  },
  payButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 25,
    color: '#FFFFFF',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  processingText: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 14,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F0E8',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  secureText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#2E7D52',
  },
});

export default PaymentGatewayScreen;
