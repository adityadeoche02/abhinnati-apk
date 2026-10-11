import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, ActivityIndicator, Pressable, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Star } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Vendor } from '../../api/mockData';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ReviewReply'>;
type RouteProps = RouteProp<RootStackParamList, 'ReviewReply'>;

export const ReviewReplyScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { reviewId, userName, commentText } = route.params;
  const { user, preferredLanguage } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const isMr = preferredLanguage === 'mr';

  const strings = {
    back: t('common.back'),
    title: t('vendor.reviewReplyTitle'),
    reviewHeader: t('vendor.customerReviewHeader'),
    replyLabel: t('vendor.yourReply'),
    placeholderReply: t('vendor.typeReplyPlaceholder'),
    btnSubmit: t('vendor.sendReplyBtn'),
    fillAll: t('vendor.pleaseEnterReply'),
    loading: t('bookings.loadingDetails'),
    noVendor: t('vendor.noVendorProfile'),
  };

  const [review, setReview] = useState<any | null>(null);

  useEffect(() => {
    const loadReview = async () => {
      try {
        setLoading(true);
        const res = await api.getReviewById(reviewId);
        if (res.success && res.data) {
          setReview(res.data);
          if (res.data.reply) {
            setReplyText(res.data.reply);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadReview();
  }, [reviewId]);

  const handleSubmit = async () => {
    if (!replyText.trim()) {
      Alert.alert(isMr ? 'त्रुटी' : 'Error', strings.fillAll);
      return;
    }

    setSaving(true);
    try {
      const res = await api.postReviewReply(reviewId, replyText);
      if (res.success) {
        Alert.alert(isMr ? 'प्रतिसाद जतन केला' : 'Reply Saved', isMr ? 'अभिप्राय प्रतिसाद यशस्वीरित्या पाठवला गेला.' : 'The review reply was successfully submitted.');
        navigation.goBack();
      }
    } catch (err) {
      console.error(err);
      Alert.alert(isMr ? 'त्रुटी' : 'Error', isMr ? 'प्रतिसाद जतन करण्यात अडचण आली.' : 'Failed to save reply.');
    } finally {
      setSaving(false);
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

  if (!review) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{isMr ? 'पुनरावलोकन आढळले नाही.' : 'Review not found.'}</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Customer Review Detail */}
        <Text style={styles.sectionHeader}>{strings.reviewHeader}</Text>
        <Card style={styles.reviewCard}>
          <View style={styles.reviewHeaderRow}>
            <Text style={styles.reviewerName}>{userName}</Text>
            {review && <Text style={styles.reviewDate}>{review.date}</Text>}
          </View>
          
          {review && (
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  color={s <= review.rating ? theme.colors.marigold : theme.colors.border}
                  fill={s <= review.rating ? theme.colors.marigold : 'transparent'}
                />
              ))}
            </View>
          )}

          <Text style={styles.reviewText}>{commentText}</Text>
        </Card>

        {/* Reply composer field */}
        <Text style={[styles.sectionHeader, { marginTop: 20 }]}>{strings.replyLabel}</Text>
        <TextInput
          placeholder={strings.placeholderReply}
          placeholderTextColor={theme.colors.textMuted || theme.colors.textTertiary}
          value={replyText}
          onChangeText={setReplyText}
          style={styles.replyInput}
          multiline
          numberOfLines={6}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={strings.btnSubmit}
          onPress={handleSubmit}
          loading={saving}
          style={styles.submitBtn}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
  },
  loadingText: {
    marginTop: 10,
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
    paddingHorizontal: horizontalScale(18),
    paddingVertical: verticalScale(14),
  },
  sectionHeader: {
    fontSize: moderateScale(12),
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: verticalScale(10),
  },
  reviewCard: {
    padding: horizontalScale(14),
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  reviewHeaderRow: {
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
  replyInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 12,
    padding: horizontalScale(12),
    fontSize: moderateScale(14),
    fontFamily: theme.typography.fontFamily.regular,
    color: '#2A2520',
    minHeight: verticalScale(120),
    textAlignVertical: 'top',
  },
  footer: {
    padding: horizontalScale(18),
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  submitBtn: {
    width: '100%',
  },
});

export default ReviewReplyScreen;
