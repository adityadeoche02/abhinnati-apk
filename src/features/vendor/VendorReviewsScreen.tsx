import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Star, MessageSquare, CornerDownRight, Send } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Vendor, Review } from '../../api/mockData';

export const VendorReviewsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, preferredLanguage } = useAuthStore();
  
  const [vendor, setVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const isMr = preferredLanguage === 'mr';

  const strings = {
    back: t('common.back'),
    title: t('vendor.customerReviews'),
    ratingAvg: t('vendor.avgRating'),
    totalReviews: t('vendor.totalReviews'),
    emptyTitle: t('vendor.noReviewsYet'),
    replyLabel: t('vendor.yourReply'),
    btnReply: t('vendor.replyBtn'),
    placeholderReply: t('vendor.typeReplyPlaceholder'),
    btnSend: t('vendor.sendReplyBtn'),
    loading: t('bookings.loadingDetails'),
    noVendor: t('vendor.noVendorProfile'),
  };

  const loadReviews = async () => {
    try {
      const res = await api.getVendorReviews(1, 100);
      if (res.success) {
        setVendor({
          id: user?.id || 'vendor-aai',
          ratingAvg: res.ratingAvg || 4.5,
          reviewsCount: res.reviewsCount || 0,
          repliedCount: res.repliedCount || 0,
          reviews: res.reviews || [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadReviews();
    }, [user])
  );



  const renderReviewItem = ({ item }: { item: Review }) => {
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : (item.date || '');

    return (
      <Pressable
        onPress={() => navigation.navigate('ReviewReply', { 
          reviewId: item.id, 
          userName: item.userName, 
          commentText: item.text 
        })}
      >
        <Card style={styles.reviewCard}>
          {/* Rating and Name */}
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewerName}>{item.userName}</Text>
            <Text style={styles.reviewDate}>{dateStr}</Text>
          </View>

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                color={s <= item.rating ? theme.colors.marigold : theme.colors.border}
                fill={s <= item.rating ? theme.colors.marigold : 'transparent'}
              />
            ))}
          </View>

          <Text style={styles.reviewText}>{item.text}</Text>

          {/* Existing Reply */}
          {item.reply ? (
            <View style={styles.replyBox}>
              <CornerDownRight size={14} color={theme.colors.marigold} style={styles.replyArrow} />
              <View style={styles.replyContent}>
                <Text style={styles.replyLabel}>{strings.replyLabel}</Text>
                <Text style={styles.replyTextContent}>{item.reply}</Text>
              </View>
            </View>
          ) : (
            // Reply Button
            <View style={styles.replyTriggerBtn}>
              <MessageSquare size={14} color={theme.colors.marigold} />
              <Text style={styles.replyTriggerText}>{strings.btnReply}</Text>
            </View>
          )}
        </Card>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.marigold} />
        <Text style={styles.loadingText}>{strings.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!vendor) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{strings.noVendor}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.navigationHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.colors.charcoal} />
          <Text style={styles.backText}>{strings.back}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{strings.title}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlatList
        data={vendor.reviews}
        keyExtractor={item => item.id}
        renderItem={renderReviewItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryVal}>
                  {vendor.ratingAvg > 0 ? vendor.ratingAvg : 'नवीन'}
                </Text>
                <Text style={styles.summaryLabel}>{strings.ratingAvg}</Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.summaryCol}>
                <Text style={styles.summaryVal}>{vendor.reviewsCount}</Text>
                <Text style={styles.summaryLabel}>{strings.totalReviews}</Text>
              </View>

              <View style={styles.verticalDivider} />

              <View style={styles.summaryCol}>
                <Text style={styles.summaryVal}>{vendor.repliedCount || 0}</Text>
                <Text style={styles.summaryLabel}>{isMr ? 'उत्तर दिलेले' : 'Replied'}</Text>
              </View>
            </View>
          </Card>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{strings.emptyTitle}</Text>
          </View>
        }
      />
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
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textSecondary,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: horizontalScale(12),
    height: verticalScale(50),
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
    fontSize: moderateScale(theme.typography.sizes.h2),
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.charcoal,
  },
  headerPlaceholder: {
    width: horizontalScale(80),
  },
  listContent: {
    paddingHorizontal: horizontalScale(18),
    paddingVertical: verticalScale(14),
  },
  summaryCard: {
    padding: horizontalScale(16),
    marginBottom: verticalScale(14),
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: moderateScale(22),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
  },
  summaryLabel: {
    fontSize: moderateScale(11),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: verticalScale(36),
    backgroundColor: theme.colors.borderLight,
  },
  reviewCard: {
    padding: horizontalScale(14),
    marginVertical: verticalScale(6),
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.charcoal,
  },
  reviewDate: {
    fontSize: moderateScale(11),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textTertiary,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: verticalScale(4),
  },
  reviewText: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  replyBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream,
    padding: horizontalScale(10),
    borderRadius: 8,
    marginTop: verticalScale(10),
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'flex-start',
  },
  replyArrow: {
    marginRight: 8,
    marginTop: 2,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: moderateScale(11),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.marigold,
    marginBottom: 2,
  },
  replyTextContent: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  replyTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: verticalScale(10),
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.marigold,
  },
  replyTriggerText: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
    color: theme.colors.marigold,
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(10),
    gap: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: horizontalScale(10),
    paddingVertical: verticalScale(6),
    fontSize: moderateScale(12),
    minHeight: verticalScale(36),
    textAlignVertical: 'top',
  },
  composerSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.marigold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyTitle: {
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textSecondary,
  },
});

export default VendorReviewsScreen;
