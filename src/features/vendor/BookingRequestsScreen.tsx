import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import Card from '../../components/common/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Booking, Vendor } from '../../api/mockData';

type TabType = 'new' | 'accepted' | 'declined';

export const BookingRequestsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, preferredLanguage } = useAuthStore();
  const navigation = useNavigation<any>();
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isMr = preferredLanguage === 'mr';

  const strings = {
    title: t('bookings.title'),
    tabNew: t('vendor.bookingsTabNew'),
    tabAccepted: t('vendor.bookingsTabAccepted'),
    tabDeclined: t('vendor.bookingsTabDeclined'),
    emptyTitle: t('vendor.noBookingsTitle'),
    emptySub: t('vendor.noBookingsSub'),
    btnAccept: t('vendor.btnAcceptBooking'),
    btnDecline: t('vendor.btnDeclineBooking'),
    badgeNew: t('vendor.badgeNew'),
  };

  const loadVendorData = async () => {
    if (!user) return;
    try {
      const v = await api.getVendorByUserId(user.id);
      if (v) {
        setVendor(v);
        const data = await api.getBookings(undefined, v.id);
        setBookings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadVendorData();
    }, [user])
  );

  const handleAccept = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      const updated = await api.updateBookingStatus(bookingId, 'accepted', 'ordered');
      if (updated) {
        const allBookings = await api.getBookings(undefined, vendor?.id);
        setBookings(allBookings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    Alert.alert(
      isMr ? 'बुकिंग नाकारा' : 'Decline Booking',
      isMr ? 'आपण ही बुकिंग विनंती नाकारू इच्छिता का?' : 'Do you want to decline this booking request?',
      [
        { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
        {
          text: isMr ? 'नाकारा' : 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(bookingId);
            try {
              const updated = await api.updateBookingStatus(bookingId, 'declined');
              if (updated) {
                const allBookings = await api.getBookings(undefined, vendor?.id);
                setBookings(allBookings);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const getFilteredBookings = () => {
    switch (activeTab) {
      case 'new':
        return bookings.filter(b => b.status === 'pending');
      case 'accepted':
        return bookings.filter(b => b.status === 'accepted' || b.status === 'completed');
      case 'declined':
        return bookings.filter(b => b.status === 'declined' || b.status === 'cancelled');
      default:
        return [];
    }
  };

  const getAvatarColors = (name: string) => {
    if (name.includes('Rohan') || name.includes('रोहन')) {
      return { bg: '#E8EFE9', text: '#2E7D52' };
    }
    // Kavita / Default light peach
    return { bg: '#FDF1DF', text: '#9A5A12' };
  };

  const formatBookingDateText = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      return `${formattedDate} - ${timeStr}`;
    } catch {
      return `${dateStr} - ${timeStr}`;
    }
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const isActionLoading = actionLoadingId === item.id;
    const avatarColors = getAvatarColors(item.userName);

    return (
      <Card style={styles.bookingCard}>
        {/* Header Block */}
        <View style={styles.cardHeaderRow}>
          {/* Avatar bubble */}
          <View style={[styles.avatarBubble, { backgroundColor: avatarColors.bg }]}>
            <Text style={[styles.avatarText, { color: avatarColors.text }]}>
              {item.userName.charAt(0)}
            </Text>
          </View>

          {/* Details */}
          <View style={styles.clientDetails}>
            <View style={styles.titleAndBadgeRow}>
              <Text style={styles.clientName}>{item.userName}</Text>
              {item.status === 'pending' && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{strings.badgeNew}</Text>
                </View>
              )}
            </View>
            <Text style={styles.servicePriceText}>
              {`${item.serviceName} · ₹${item.price}`}
            </Text>
          </View>
        </View>

        {/* Date and Time row */}
        <Text style={styles.dateTimeText}>
          {formatBookingDateText(item.bookingDate, item.bookingTime)}
        </Text>

        {/* Action buttons (only for New tab) */}
        {activeTab === 'new' && (
          <View style={styles.actionBtnRow}>
            {/* Accept Button */}
            <Pressable
              onPress={() => handleAccept(item.id)}
              disabled={isActionLoading}
              style={[styles.actionBtn, styles.acceptBtn]}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptBtnText}>{strings.btnAccept}</Text>
              )}
            </Pressable>

            {/* Decline Button */}
            <Pressable
              onPress={() => handleDecline(item.id)}
              disabled={isActionLoading}
              style={[styles.actionBtn, styles.declineBtn]}
            >
              <Text style={styles.declineBtnText}>{strings.btnDecline}</Text>
            </Pressable>
          </View>
        )}
      </Card>
    );
  };

  const filteredData = getFilteredBookings();
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Page Title */}
      <Text style={styles.pageTitle}>{strings.title}</Text>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setActiveTab('new')}
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            {strings.tabNew}
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{pendingCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('accepted')}
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>
            {strings.tabAccepted}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('declined')}
          style={[styles.tab, activeTab === 'declined' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'declined' && styles.activeTabText]}>
            {strings.tabDeclined}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E58A2B" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{strings.emptyTitle}</Text>
              <Text style={styles.emptySub}>{strings.emptySub}</Text>
            </View>
          }
          removeClippedSubviews={true}
          initialNumToRender={5}
          windowSize={8}
          maxToRenderPerBatch={5}
        />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    color: '#2A2520',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FBF6EC',
    borderBottomWidth: 1,
    borderColor: '#EFE3CC',
    paddingHorizontal: 18,
    gap: 16,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#8A7C66',
  },
  activeTabText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  badgeCount: {
    backgroundColor: '#E58A2B', // orange badge count
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCountText: {
    fontSize: 10,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    paddingBottom: 120, // push content above bottom navigator
    flexGrow: 1,
  },
  bookingCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
  },
  clientDetails: {
    flex: 1,
  },
  titleAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  clientName: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  newBadge: {
    backgroundColor: '#FDF1DF', // light peach badge bg
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 11,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#9A5A12',
  },
  servicePriceText: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
  },
  dateTimeText: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
    marginBottom: 16,
    paddingLeft: 4, // align with content slightly
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#2A2520', // dark charcoal accept
  },
  acceptBtnText: {
    fontSize: 13,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
  },
  declineBtnText: {
    fontSize: 13,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 36,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    color: '#2A2520',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BookingRequestsScreen;
