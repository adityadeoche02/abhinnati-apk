import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, RefreshControl, Image, TextInput, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  Heart, 
  MessageCircle, 
  ChevronDown, 
  Bell, 
  Sparkles,
  Search,
  Home as HomeIcon,
  Sparkle,
  Columns,
  Plus,
  Car,
  Store,
  MoreHorizontal
} from 'lucide-react-native';
import Svg, { Rect, LinearGradient as SvgLinearGradient, Stop, Defs } from 'react-native-svg';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import { api } from '../../api/client';
import { CustomHomeIcon, CustomSearchIcon, CustomCalendarIcon, CustomProfileIcon } from '../../components/common/Icons';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../../components/common/LanguageModal';
import { SwitchAreaBottomSheet } from '../../components/common/SwitchAreaBottomSheet';
import { likeSyncService } from '../../services/likeSyncService';
import { RootStackParamList } from '../../navigation/types';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ResidentMain'>;

const bakeryBanner = require('../../../assets/bakery_banner.png');

const formatRelativeTime = (dateStr?: string, isMr?: boolean): string => {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return isMr ? 'आताच' : 'Just now';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return isMr ? 'आताच' : 'Just now';
    if (diffMins < 60) return isMr ? `${diffMins} मि. पूर्वी` : `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return isMr ? `${diffHours} ता. पूर्वी` : `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return isMr ? `${diffDays} दि. पूर्वी` : `${diffDays}d ago`;

    return date.toLocaleDateString(isMr ? 'mr-IN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (err) {
    return '';
  }
};

interface MixedFeedItem {
  id: string;
  feedType: 'post' | 'ad';
  
  // Post properties
  authorName?: string;
  avatar?: string;
  location?: string;
  tag?: string;
  tagType?: 'local_issue' | 'ask';
  content?: string;
  likes?: number;
  commentsCount?: number;
  likedBy?: string[];
  createdAt?: string;

  // Business properties
  businessNameEn?: string;
  businessNameMr?: string;
  categorySlug?: string;
  categoryNameEn?: string;
  categoryNameMr?: string;
  descriptionEn?: string;
  descriptionMr?: string;
  ratingAvg?: number;
  reviewsCount?: number;
  imageUrl?: string | null;
  distanceVal?: number;
  verified?: boolean;
}

export const MyAreaFeedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { preferredLanguage, activeArea, user } = useAuthStore();
  const isMr = preferredLanguage === 'mr';
  const localityName = isMr ? activeArea?.name_mr : activeArea?.name_en;
  const { setBookingVendor, setBookingService } = useBookingStore();

  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isAreaSheetVisible, setIsAreaSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [postsList, setPostsList] = useState<MixedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [heartAnimPostId, setHeartAnimPostId] = useState<string | null>(null);
  const lastTapMap = useRef<Record<string, number>>({});

  const categories = [
    { id: 'home', label_en: 'Home', label_mr: 'घर', icon: HomeIcon, slug: 'plumbing', bg: '#FDECD4' },
    { id: 'events', label_en: 'Events', label_mr: 'कार्यक्रम', icon: Sparkles, slug: 'food', bg: '#FDECD4' },
    { id: 'beauty', label_en: 'Beauty', label_mr: 'सौंदर्य', icon: Sparkle, slug: 'cleaning', bg: '#FDECD4' },
    { id: 'tutors', label_en: 'Tutors', label_mr: 'शिक्षक', icon: Columns, slug: 'legal', bg: '#FDECD4' },
    { id: 'health', label_en: 'Health', label_mr: 'आरोग्य', icon: Plus, slug: 'plumbing', bg: '#FDECD4' },
    { id: 'auto', label_en: 'Auto', label_mr: 'ऑटो', icon: Car, slug: 'electric', bg: '#FDECD4' },
    { id: 'stores', label_en: 'Stores', label_mr: 'दुकानें', icon: Store, slug: 'food', bg: '#FDECD4' },
    { id: 'more', label_en: 'More', label_mr: 'अधिक', icon: MoreHorizontal, slug: 'plumbing', bg: '#FDECD4' },
  ];

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    setSearchQuery('');
    navigation.navigate('SearchResults', { query });
  };

  const handleCategoryPress = (slug: string) => {
    navigation.navigate('SearchResults', { categorySlug: slug });
  };

  const loadPosts = async () => {
    try {
      const areaId = activeArea?.id || 'e2c0e8a7-3df8-4bf8-b9a3-5c21f7b8c7a1';

      // 1. Fetch community posts
      const res = await api.getPosts(areaId);
      const postsData = Array.isArray(res) ? res : (res && res.success && res.data ? res.data : (res && res.data ? res.data : []));
      
      const mappedPosts: MixedFeedItem[] = postsData.map((post: any) => ({
        id: post.id,
        feedType: 'post',
        authorName: post.authorName || 'Resident User',
        avatar: post.authorAvatar || post.authorName?.[0] || 'U',
        location: isMr ? 'वांद्रे पश्चिम' : 'Bandra West',
        tag: post.tag || 'Community',
        tagType: post.tagType || 'local_issue',
        content: post.content || post.content_en || post.content_mr || '',
        likes: post.likes || 0,
        commentsCount: post.commentsCount || 0,
        likedBy: post.likedBy || [],
        createdAt: post.createdAt,
      }));

      // 2. Fetch nearby businesses (ads)
      let mappedAds: MixedFeedItem[] = [];
      try {
        const resEmpty = await api.getEmptyFeed(areaId);
        const businessesData = resEmpty?.businesses || [];

        // Sort newest first
        const sortedBiz = [...businessesData].sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        // Filter: Keep only those created in the last 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        let filteredBiz = sortedBiz.filter((biz: any) => {
          const created = biz.createdAt ? new Date(biz.createdAt).getTime() : 0;
          return created >= thirtyDaysAgo;
        });

        // Fallback: If no businesses were registered in the last 30 days, use the newest 5
        if (filteredBiz.length === 0) {
          filteredBiz = sortedBiz.slice(0, 5);
        } else {
          filteredBiz = filteredBiz.slice(0, 5);
        }

        mappedAds = filteredBiz.map((biz: any) => ({
          id: biz.id,
          feedType: 'ad',
          businessNameEn: biz.businessNameEn,
          businessNameMr: biz.businessNameMr,
          categorySlug: biz.categorySlug,
          categoryNameEn: biz.categoryNameEn,
          categoryNameMr: biz.categoryNameMr,
          descriptionEn: biz.descriptionEn,
          descriptionMr: biz.descriptionMr,
          ratingAvg: biz.ratingAvg,
          reviewsCount: biz.reviewsCount,
          imageUrl: biz.imageUrl,
          distanceVal: biz.distanceVal,
          verified: biz.verified !== undefined ? biz.verified : true,
        }));
      } catch (bizErr) {
        console.warn('Error loading business ads for feed:', bizErr);
      }

      // 3. Intersperse ads into posts list (1 ad after every 2 posts)
      const combined: MixedFeedItem[] = [];
      let adIndex = 0;
      for (let i = 0; i < mappedPosts.length; i++) {
        combined.push(mappedPosts[i]);
        if ((i + 1) % 2 === 0 && adIndex < mappedAds.length) {
          combined.push(mappedAds[adIndex]);
          adIndex++;
        }
      }

      // If posts run out but ads remain, append them
      while (adIndex < mappedAds.length && combined.length < 15) {
        combined.push(mappedAds[adIndex]);
        adIndex++;
      }

      setPostsList(combined);
    } catch (err) {
      console.error('Error loading posts:', err);
      setPostsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeArea]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLikePost = (postId: string) => {
    const activeUserId = user?.id || 'current-user';

    // 1. Optimistic Update: Update the UI state immediately
    let actionType: 'like' | 'unlike' = 'like';
    
    setPostsList(prev =>
      prev.map(post => {
        if (post.id === postId) {
          const likedBy = post.likedBy || [];
          const likes = post.likes || 0;
          const hasLiked = likedBy.includes(activeUserId);
          actionType = hasLiked ? 'unlike' : 'like';

          const newLikedBy = hasLiked
            ? likedBy.filter(id => id !== activeUserId)
            : [...likedBy, activeUserId];
          const newLikesCount = hasLiked ? Math.max(0, likes - 1) : likes + 1;

          return {
            ...post,
            likes: newLikesCount,
            likedBy: newLikedBy,
          };
        }
        return post;
      })
    );

    // 2. Queue in Sync Service for background processing & offline retry
    likeSyncService.queueLikeAction(postId, activeUserId, actionType);
  };

  const handlePostPress = (postId: string) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    const lastTap = lastTapMap.current[postId] || 0;
    const activeUserId = user?.id || 'current-user';

    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      // Double tap! Like the post (Instagram style: only add, no toggle unlike)
      const post = postsList.find(p => p.id === postId);
      if (post) {
        const likedBy = post.likedBy || [];
        const hasLiked = likedBy.includes(activeUserId);
        if (!hasLiked) {
          handleLikePost(postId);
        }
        
        // Show big heart flash animation overlay
        setHeartAnimPostId(postId);
        setTimeout(() => {
          setHeartAnimPostId(null);
        }, 800);
      }
      lastTapMap.current[postId] = 0;
    } else {
      // Single tap (delay slightly to allow double tap to register)
      lastTapMap.current[postId] = now;
      setTimeout(() => {
        if (lastTapMap.current[postId] === now) {
          navigation.navigate('PostDetail', { postId });
        }
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const handleBookVendor = () => {
    setBookingVendor('vendor-aai', "Aai's Bakery");
    setBookingService({
      id: 'srv-aai-1',
      name_mr: 'सानुकूल केक ऑर्डर',
      name_en: 'Custom Cake Order',
      price: 600,
      duration_mins: 120,
      description_mr: 'वाढदिवस, लग्न किंवा इतर कोणत्याही खास प्रसंगासाठी कस्टमाइज्ड केक.',
      description_en: 'Order customized cakes for birthdays, weddings, or any special occasions.',
    });
    navigation.navigate('Booking', { vendorId: 'vendor-aai' });
  };

  const handleViewVendor = () => {
    navigation.navigate('BusinessProfile', { vendorId: 'vendor-aai' });
  };

  const renderHeader = useCallback(() => {
    return (
      <View>
        {/* Header Action Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => setIsAreaSheetVisible(true)} style={styles.areaDropdown}>
            <Text style={styles.areaName}>{localityName || 'Bandra West'}</Text>
            <ChevronDown size={14} color="#8A7C66" strokeWidth={2.5} style={styles.dropdownArrow} />
          </Pressable>

          <View style={styles.headerActions}>
            {/* Language Selector Button */}
            <Pressable onPress={() => setIsLangModalVisible(true)} style={styles.langBtn}>
              <Text style={styles.langText}>{preferredLanguage === 'mr' ? 'म' : 'EN'}</Text>
            </Pressable>

            {/* Notification Bell */}
            <Pressable onPress={() => navigation.navigate('Alerts')} style={styles.bellBtn}>
              <Bell size={18} color="#E58A2B" fill="#E58A2B" />
            </Pressable>
          </View>
        </View>

        {/* Create Post Section */}
        <Pressable onPress={() => navigation.navigate('CreatePost')} style={styles.createPostContainer}>
          <View style={styles.createPostAvatar}>
            <Text style={styles.createPostAvatarText}>S</Text>
          </View>
          <Text style={styles.createPostPlaceholder}>{t('feed.createPostPlaceholder')}</Text>
        </Pressable>

        {/* Featured Business Card (Spotlight Card) */}
        <View style={styles.spotlightCard}>
          {/* Badge: New in your area */}
          <View style={styles.spotlightBadge}>
            <Sparkles
              size={12}
              color="#9A5A12"
              style={styles.spotlightBadgeStar}
            />
            <Text style={styles.spotlightBadgeText}>{t('feed.newInYourArea')}</Text>
          </View>

          {/* SVG linear gradient cover banner */}
          <Svg width={329} height={118} style={styles.spotlightBanner}>
            <Defs>
              <SvgLinearGradient id="spotlightGrad" x1="0%" y1="0%" x2="90%" y2="100%">
                <Stop offset="0%" stopColor="#F6E2C4" stopOpacity="1" />
                <Stop offset="71.43%" stopColor="#EFD3AE" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect width={329} height={118} rx={14} fill="url(#spotlightGrad)" />
          </Svg>

          {/* Business Name verification line */}
          <View style={styles.spotlightInfoRow}>
            <Text style={styles.spotlightTitle}>Aai’s Bakery</Text>
            <VerifiedBadge size={16} style={styles.spotlightVerifiedBadge} />
          </View>

          {/* Subtitle */}
          <Text style={styles.spotlightSubtitle}>Bakery · {t('feed.justJoined')} · 0.4 km</Text>

          {/* Side-by-side Action Buttons */}
          <View style={styles.spotlightButtonRow}>
            <Pressable onPress={handleViewVendor} style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>{t('bookings.viewBtn')}</Text>
            </Pressable>
            <Pressable onPress={handleBookVendor} style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>{t('bookings.bookBtn')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }, [localityName, preferredLanguage, navigation, isMr]);

  const renderPostItem = useCallback(({ item }: { item: MixedFeedItem }) => {
    if (item.feedType === 'ad') {
      const bizName = isMr ? item.businessNameMr : item.businessNameEn;
      const bizCat = isMr ? item.categoryNameMr : item.categoryNameEn;
      const distance = item.distanceVal?.toFixed(1) || '0.4';
      
      const handleAdBook = () => {
        setBookingVendor(item.id, bizName || '');
        navigation.navigate('Booking', { vendorId: item.id });
      };

      const handleAdView = () => {
        navigation.navigate('BusinessProfile', { vendorId: item.id });
      };

      return (
        <View style={styles.spotlightCard}>
          {/* Badge: New in your area */}
          <View style={styles.spotlightBadge}>
            <Sparkles
              size={12}
              color="#9A5A12"
              style={styles.spotlightBadgeStar}
            />
            <Text style={styles.spotlightBadgeText}>{t('feed.newInYourArea')}</Text>
          </View>

          <Svg width={329} height={118} style={styles.spotlightBanner}>
            <Defs>
              <SvgLinearGradient id={`adGrad-${item.id}`} x1="0%" y1="0%" x2="90%" y2="100%">
                <Stop offset="0%" stopColor="#F6E2C4" stopOpacity="1" />
                <Stop offset="71.43%" stopColor="#EFD3AE" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect width={329} height={118} rx={14} fill={`url(#adGrad-${item.id})`} />
          </Svg>

          <View style={styles.spotlightInfoRow}>
            <Text style={styles.spotlightTitle}>{bizName}</Text>
            {item.verified && <VerifiedBadge size={16} style={styles.spotlightVerifiedBadge} />}
          </View>

          <Text style={styles.spotlightSubtitle}>
            {bizCat} · {t('feed.justJoined')} · {distance} km
          </Text>

          <View style={styles.spotlightButtonRow}>
            <Pressable onPress={handleAdView} style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>{t('bookings.viewBtn')}</Text>
            </Pressable>
            <Pressable onPress={handleAdBook} style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>{t('bookings.bookBtn')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const hasLiked = item.likedBy?.includes(user?.id || 'current-user') || false;
    return (
      <Pressable onPress={() => handlePostPress(item.id)} style={styles.postCard}>
        {heartAnimPostId === item.id && (
          <View style={styles.heartOverlay}>
            <Heart size={48} color="#DA2525" fill="#DA2525" />
          </View>
        )}
        <View style={styles.postHeader}>
          <View style={styles.postAuthorRow}>
            <View style={styles.postAvatar}>
              <Text style={styles.postAvatarText}>{item.avatar}</Text>
            </View>
            <View>
              <Text style={styles.postAuthorName}>{item.authorName}</Text>
              <Text style={styles.postLocality}>
                {item.location}
                {item.createdAt ? ` • ${formatRelativeTime(item.createdAt, isMr)}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.postTag}>
            <Text style={styles.postTagText}>{item.tag}</Text>
          </View>
        </View>

        <Text style={styles.postContent} numberOfLines={2}>
          {item.content}
        </Text>

        <View style={styles.postFooter}>
          <Pressable 
            onPress={(e) => {
              e.stopPropagation();
              handleLikePost(item.id);
            }} 
            style={styles.postFooterItem}
          >
            <Heart
              size={14}
              color={hasLiked ? '#DA2525' : '#6B5F4E'}
              fill={hasLiked ? '#DA2525' : 'transparent'}
            />
            <Text style={styles.postFooterText}>{t('feed.likesCount', { count: item.likes || 0 })}</Text>
          </Pressable>
          <View style={styles.postFooterItem}>
            <MessageCircle size={14} color="#6B5F4E" />
            <Text style={styles.postFooterText}>{t('feed.commentsCount', { count: item.commentsCount || 0 })}</Text>
          </View>
        </View>
      </Pressable>
    );
  }, [postsList, user, heartAnimPostId, isMr]);


  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={postsList}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={renderPostItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E58A2B" />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        initialNumToRender={4}
        windowSize={6}
        updateCellsBatchingPeriod={50}
      />


      <LanguageModal
        visible={isLangModalVisible}
        onClose={() => setIsLangModalVisible(false)}
        currentLanguage={preferredLanguage}
        onSelectLanguage={async lang => {
          await useAuthStore.getState().setLanguage(lang);
        }}
      />

      <SwitchAreaBottomSheet
        visible={isAreaSheetVisible}
        onClose={() => setIsAreaSheetVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC', // EXACT Figma frame fill background
  },
  listContent: {
    paddingTop: 66,
    paddingBottom: 110, // allows scrolling past floating tab bar
  },
  headerTitleContainer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: 'Mukta-Regular',
    fontSize: 16,
    color: '#A0A0A0', // grey color of Figma frame name
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#EFE3CC',
    marginHorizontal: 18,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#2A2520',
    height: '100%',
    padding: 0,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    fontSize: 14,
    color: '#6B5F4E',
    marginBottom: 12,
    paddingHorizontal: 18,
  },
  categoriesScroll: {
    paddingHorizontal: 18,
    gap: 16,
  },
  categoryItem: {
    width: 64,
    alignItems: 'center',
  },
  catIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLabel: {
    fontSize: 11,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#3D362E',
    textAlign: 'center',
    width: 70,
  },
  areaDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  areaName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#2A2520',
  },
  dropdownArrow: {
    marginLeft: 8,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langBtn: {
    width: 40,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0CFB0',
    backgroundColor: '#FBF6EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#6B5F4E',
  },
  bellBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostContainer: {
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 9,
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE3CC',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  createPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostAvatarText: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#9A5A12',
  },
  createPostPlaceholder: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
  },
  spotlightCard: {
    marginHorizontal: 18,
    marginTop: 9,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE3CC',
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#292421',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  spotlightBadge: {
    width: 115,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FBE7CC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  spotlightBadgeStar: {
    width: 11,
    height: 11,
    marginRight: 5,
  },
  spotlightBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#9A5A12',
  },
  spotlightBanner: {
    width: 329,
    height: 118,
    borderRadius: 12,
    backgroundColor: '#FBE7CC',
    marginBottom: 12,
  },
  spotlightInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  spotlightTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#2A2520',
  },
  spotlightVerifiedBadge: {
    marginLeft: 6,
  },
  spotlightSubtitle: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    marginBottom: 12,
  },
  spotlightButtonRow: {
    flexDirection: 'row',
    gap: 9,
  },
  viewBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8C29A',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#2A2520',
  },
  bookBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2A2520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#FFFFFF',
  },
  postCard: {
    marginHorizontal: 18,
    marginBottom: 16,
    height: 156,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFE3CC',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  postAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#9A5A12',
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Mukta-SemiBold',
    color: '#2A2520',
  },
  postLocality: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
  },
  postTag: {
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1E7D5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  postTagText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Mukta-Medium',
    color: '#6B5F4E',
  },
  postContent: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#3D362E',
    lineHeight: 18,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 'auto',
  },
  postFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postFooterText: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
  },

  heartOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    zIndex: 99,
  },
});

export default MyAreaFeedScreen;
