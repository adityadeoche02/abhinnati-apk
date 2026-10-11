import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { api } from '../../api/client';
import { Booking } from '../../api/mockData';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList, 'BookingSuccess'>;
type RouteProps = RouteProp<RootStackParamList, 'BookingSuccess'>;

export const BookingSuccessScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { bookingId } = route.params;
  const { preferredLanguage, user } = useAuthStore();

  const [booking, setBooking] = useState<Booking | null>(null);

  const isMr = preferredLanguage === 'mr';

  const strings = {
    title: t('bookings.bookingRequestedTitle'),
    notified: t('bookings.vendorNotifiedSub'),
    btnBack: t('bookings.btnBackToArea'),
    btnView: t('bookings.btnViewBooking'),
    loading: t('bookings.loadingDetails'),
  };

  const rosetteScale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const bookings = await api.getBookings(user?.id);
        const b = bookings.find((item: Booking) => item.id === bookingId);
        if (b) {
          setBooking(b);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchBooking();

    // Trigger premium animations
    rosetteScale.value = withSpring(1, { damping: 12, stiffness: 90 });
    opacity.value = withDelay(250, withSpring(1));
  }, [bookingId]);

  const rosetteAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rosetteScale.value }],
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      alignItems: 'center',
    };
  });

  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E58A2B" />
        <Text style={styles.loadingText}>{strings.loading}</Text>
      </View>
    );
  }

  const formatTimeSlot = (time: string) => {
    if (time === '10:00') return '10:00 AM';
    if (time === '12:30') return '12:30 PM';
    if (time === '4:00') return '4:00 PM';
    if (time === '5:30') return '5:30 PM';
    if (time === '6:00') return '6:00 PM';
    if (time === '7:30') return '7:30 PM';
    return time;
  };

  const getFormattedDateLong = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const daysMr = ['रवि', 'सोम', 'मंग', 'बुध', 'गुरू', 'शुक्र', 'शनी'];
      
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthsMr = [
        'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 
        'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'
      ];

      const dayLabel = isMr ? daysMr[dateObj.getDay()] : daysEn[dateObj.getDay()];
      const monthLabel = isMr ? monthsMr[dateObj.getMonth()] : monthsEn[dateObj.getMonth()];
      const dayNum = dateObj.getDate();
      
      // The design shows "Tue, 25 Jun"
      const shortMonthEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return isMr ? `${dayLabel}, ${dayNum} ${monthLabel}` : `${dayLabel}, ${dayNum} ${shortMonthEn[dateObj.getMonth()]}`;
    } catch {
      return dateStr;
    }
  };

  const formattedDate = getFormattedDateLong(booking.bookingDate);
  const formattedTime = formatTimeSlot(booking.bookingTime);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.viewport}>
        
        <View style={styles.mainContent}>
          {/* Success Rosette (Frame 84x84) */}
          <Animated.View style={[styles.rosette, rosetteAnimatedStyle]}>
            <Svg width={37} height={30} viewBox="0 0 37 30">
              <Path
                d="M4 14.5l9 9L33 4"
                stroke="#2E7D52"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={contentAnimatedStyle}>
            {/* Booking Confirmed Title */}
            <Text style={styles.title}>{strings.title}</Text>

            {/* Vendor Name */}
            <Text style={styles.vendorName}>{booking.vendorName}</Text>
            
            {/* Details String description */}
            <Text style={styles.detailsText}>
              {formattedDate} · {formattedTime} · {booking.serviceName}
            </Text>

            {/* Divider Frame line */}
            <View style={styles.divider} />

            {/* notified label */}
            <Text style={styles.notifiedText}>{strings.notified}</Text>
          </Animated.View>
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={() => navigation.navigate('ResidentMain')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>{strings.btnBack}</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('BookingDetail', { bookingId })}
            style={styles.viewButton}
          >
            <Text style={styles.viewButtonText}>{strings.btnView}</Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5EE', // Matching Figma background closer
  },
  viewport: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 140,
    paddingBottom: 40,
  },
  rosette: {
    width: 84,
    height: 84,
    backgroundColor: '#E3F2E9', // Lighter green from figma
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Mukta-Bold', // Use Bold for closer match to design
    fontWeight: '700',
    fontSize: 24,
    color: '#242220',
    textAlign: 'center',
    marginBottom: 16,
  },
  vendorName: {
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    fontSize: 16,
    color: '#524F4B',
    textAlign: 'center',
    marginBottom: 4,
  },
  detailsText: {
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 14,
    color: '#524F4B',
    textAlign: 'center',
    marginBottom: 32,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5DCD2',
    marginBottom: 32,
  },
  notifiedText: {
    fontFamily: 'Mukta-Regular',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 22,
    color: '#8A857E',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 78,
    gap: 16,
  },
  backButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8C29A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#242220',
  },
  viewButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#242220',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F5EE',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Mukta-Medium',
    color: '#524F4B',
    marginTop: 12,
  },
});

export default BookingSuccessScreen;
