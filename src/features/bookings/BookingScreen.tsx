import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Clock, MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { CustomChevronLeft } from '../../components/common/Icons';
import { useBookingStore } from '../../store/useBookingStore';
import { api } from '../../api/client';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import InputField from '../../components/common/InputField';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Booking'>;
type RouteProps = RouteProp<RootStackParamList, 'Booking'>;

interface DateItem {
  dateString: string; // YYYY-MM-DD
  dayLabel: string;   // e.g. "सोम", "मंग" or "Mon", "Tue"
  dayNumber: string;  // e.g. "18"
}

const TIME_SLOTS = [
  { time: '10:00', available: true },
  { time: '12:30', available: true },
  { time: '4:00', available: true },
  { time: '5:30', available: true },
  { time: '6:00', available: true },
  { time: '7:30', available: true },
];

export const BookingScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { preferredLanguage } = useAuthStore();
  const {
    selectedVendorId,
    selectedVendorName,
    selectedService,
    selectedDate,
    selectedTime,
    notes,
    setBookingDateTime,
    setNotes,
  } = useBookingStore();

  const [dateList, setDateList] = useState<DateItem[]>([]);
  const [localNotes, setLocalNotes] = useState(notes);
  const [slotsList, setSlotsList] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const isMr = preferredLanguage === 'mr';
  const strings = {
    back: t('common.back'),
    title: t('bookings.chooseSlot'),
    serviceHeader: t('bookings.selectedService'),
    dateHeader: t('bookings.dateHeader'),
    timeHeader: t('bookings.timeHeader'),
    notesHeader: t('bookings.notesHeader'),
    notesPlaceholder: t('bookings.notesPlaceholder'),
    btnPay: t('bookings.btnContinue'),
    noSlots: t('bookings.noSlots'),
  };

  // Generate next 3 days for the calendar layout to match Figma
  useEffect(() => {
    const dates: DateItem[] = [];
    const mrDays = ['रवि', 'सोम', 'मंग', 'बुध', 'गुरू', 'शुक्र', 'शनी'];
    const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${date}`;
      
      const dayLabel = isMr ? mrDays[d.getDay()] : enDays[d.getDay()];
      const dayNumber = String(d.getDate());
      
      dates.push({ dateString, dayLabel, dayNumber });
    }
    
    setDateList(dates);
    
    // Auto-select today
    if (!selectedDate && dates.length > 0) {
      setBookingDateTime(dates[0].dateString, selectedTime || '');
    }
  }, []);

  useEffect(() => {
    if (!selectedDate || !selectedVendorId) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.getAvailableSlots(selectedVendorId, selectedDate);
        setSlotsList(res.data || []);
      } catch (err) {
        console.warn('Failed to load slots from backend:', err);
        setSlotsList([
          { time: '10:00', available: true },
          { time: '12:30', available: true },
          { time: '4:00', available: true },
          { time: '5:30', available: true },
          { time: '6:00', available: true },
          { time: '7:30', available: true },
        ]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedVendorId]);



  const handleSelectDate = (dateString: string) => {
    setBookingDateTime(dateString, ''); // Reset time when date changes
  };

  const handleSelectTime = (time: string) => {
    if (selectedDate) {
      setBookingDateTime(selectedDate, time);
    }
  };

  const handleProceedToPayment = () => {
    setNotes(localNotes);
    navigation.navigate('PaymentGateway');
  };

  if (!selectedService) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>{t('bookings.noServiceSelected')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Navigation Header */}
      <View style={styles.navigationHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <CustomChevronLeft size={20} color="#2A2520" strokeWidth={3} />
          <Text style={styles.headerTitle}>{strings.title}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Flat Service summary header */}
        <View style={styles.summaryContainer}>
          <Text style={styles.serviceName}>{isMr ? selectedService.name_mr : selectedService.name_en}</Text>
          <Text style={styles.vendorName}>{selectedVendorName}</Text>
        </View>

        {/* Date Selector */}
        <Text style={styles.sectionTitle}>{strings.dateHeader}</Text>
        <View style={styles.dateGrid}>
          {dateList.map((item) => {
            const isSelected = selectedDate === item.dateString;
            return (
              <Pressable
                key={item.dateString}
                onPress={() => handleSelectDate(item.dateString)}
                style={[
                  styles.dateChip,
                  isSelected && styles.selectedDateChip,
                ]}
              >
                <Text style={[styles.dateText, isSelected && styles.selectedDateText]}>
                  {item.dayLabel} {item.dayNumber}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Time Slots Selector */}
        <Text style={styles.sectionTitle}>{strings.timeHeader}</Text>
        <View style={styles.slotGrid}>
          {slotsLoading ? (
            <View style={{ width: '100%', paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color="#E58A2B" />
            </View>
          ) : slotsList.length === 0 ? (
            <View style={{ width: '100%', paddingVertical: 14, paddingHorizontal: 18 }}>
              <Text style={{ fontSize: 13, color: '#8A7C66', fontFamily: theme.typography.fontFamily.medium }}>
                {strings.noSlots}
              </Text>
            </View>
          ) : (
            slotsList.map((slot) => {
              const isSelected = selectedTime === slot.time;
              const isAvailable = slot.available;
              
              return (
                <Pressable
                  key={slot.time}
                  onPress={() => isAvailable && handleSelectTime(slot.time)}
                  disabled={!isAvailable}
                  style={[
                    styles.slotChip,
                    isSelected && styles.selectedSlotChip,
                    !isAvailable && styles.disabledSlotChip,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotText,
                      isSelected && styles.selectedSlotText,
                      !isAvailable && styles.disabledSlotText,
                    ]}
                  >
                    {slot.time}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Footer Payment Proceed CTA */}
      <View style={styles.footer}>
        <Button
          title={strings.btnPay}
          onPress={handleProceedToPayment}
          disabled={!selectedDate || !selectedTime}
          style={styles.btn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
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
    fontSize: moderateScale(17),
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    color: '#2A2520',
    lineHeight: 28,
    marginLeft: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  summaryContainer: {
    marginTop: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  serviceName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    color: '#2A2520',
    lineHeight: 23,
    marginBottom: 4,
  },
  vendorName: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#8A7C66',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
    color: '#6B5F4E',
    lineHeight: 22,
    marginLeft: 18,
    marginTop: 14,
    marginBottom: 8,
  },
  dateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  dateChip: {
    width: 113,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0CFB0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateChip: {
    backgroundColor: '#E58A2B',
    borderWidth: 0,
  },
  dateText: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B5F4E',
    lineHeight: 22,
  },
  selectedDateText: {
    color: '#2A2520',
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  slotChip: {
    width: 113,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0CFB0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedSlotChip: {
    backgroundColor: '#E58A2B',
    borderWidth: 0,
  },
  disabledSlotChip: {
    backgroundColor: theme.colors.board,
    borderColor: theme.colors.board,
    opacity: 0.5,
  },
  slotText: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B5F4E',
    lineHeight: 22,
  },
  selectedSlotText: {
    color: '#2A2520',
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  disabledSlotText: {
    color: theme.colors.textTertiary,
  },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  btn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2A2520',
  },
});

export default BookingScreen;
