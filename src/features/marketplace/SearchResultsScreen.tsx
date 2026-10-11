import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/client';
import { CustomChevronLeft } from '../../components/common/Icons';
import { theme } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import SearchBar from '../../components/common/SearchBar';
import FilterChip from '../../components/common/FilterChip';
import BusinessCard from '../../components/common/BusinessCard';


type NavigationProp = StackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'SearchResults'>;

export const SearchResultsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { categorySlug, query } = route.params;
  const { preferredLanguage, activeArea, deviceGps } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState(query || (categorySlug === 'plumbing' ? 'Plumber' : ''));
  const [debouncedQuery, setDebouncedQuery] = useState(query || (categorySlug === 'plumbing' ? 'Plumber' : ''));
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [ratingFilter, setRatingFilter] = useState(false);
  const [verifiedFilter, setVerifiedFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'none'>('none');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const isMr = preferredLanguage === 'mr';
  const localityName = isMr ? activeArea?.name_mr : activeArea?.name_en;
  const displayLocality = localityName || t('marketplace.defaultLocality');

  const strings = {
    resultsCount: (count: number) =>
      t('marketplace.resultsCount', { count, locality: displayLocality }),
    noResults: t('marketplace.noResults'),
    noResultsSub: t('marketplace.noResultsSub'),
    view: t('marketplace.view'),
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async (pageNum = 1, isLoadMore = false) => {
    const targetAreaId = deviceGps?.id || activeArea?.id;
    if (!targetAreaId) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      let res: any;
      if (categorySlug && !debouncedQuery.trim()) {
        res = await api.getCategoryBusinesses(
          categorySlug,
          targetAreaId,
          sortBy,
          verifiedFilter,
          pageNum,
          10
        );
      } else {
        res = await api.searchBusinesses(
          debouncedQuery.trim() || '*',
          targetAreaId,
          pageNum,
          10
        );
      }

      const fetchedList = res.businesses || [];
      
      // Apply filters on client-side if query didn't filter ratings
      let processedList = fetchedList;
      if (ratingFilter) {
        processedList = processedList.filter((v: any) => v.ratingAvg >= 4.0);
      }

      if (isLoadMore) {
        setVendors((prev) => [...prev, ...processedList]);
      } else {
        setVendors(processedList);
      }

      setPage(res.pagination?.page || 1);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('[SearchResultsScreen] Error loading vendors:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categorySlug, debouncedQuery, sortBy, verifiedFilter, activeArea, deviceGps, ratingFilter]);

  useEffect(() => {
    loadData(1, false);
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      loadData(page + 1, true);
    }
  };

  const handleSearchSubmit = () => {
    loadData(1, false);
  };

  const toggleRatingFilter = () => {
    setRatingFilter((prev) => !prev);
  };

  const toggleVerifiedFilter = () => {
    setVerifiedFilter((prev) => !prev);
  };

  const toggleSortFilter = () => {
    const nextSort = sortBy === 'none' ? 'rating' : sortBy === 'rating' ? 'distance' : 'none';
    setSortBy(nextSort);
  };

  const getLogoBg = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('anil')) return ['#F6E2C4', '#EFD3AE'];
    if (lowerName.includes('sai')) return ['#E8EFE9', '#D5E5DA'];
    if (lowerName.includes('mahesh')) return ['#EFE2F0', '#E0D0E8'];
    if (lowerName.includes('quick')) return ['#F6E2C4', '#EAD0B0'];
    return ['#F6E2C4', '#EFD3AE'];
  };

  const handleTabPress = (tabName: 'Home' | 'Explore' | 'Bookings' | 'Profile') => {
    const screenMap = {
      Home: 'MyArea',
      Explore: 'Explore',
      Bookings: 'BookingsList',
      Profile: 'Profile',
    };
    navigation.navigate('ResidentMain', { screen: screenMap[tabName] } as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Navigation Header Arrow */}
      <View style={styles.navigationHeader}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <CustomChevronLeft size={24} color="#2A2520" strokeWidth={3} />
        </Pressable>
      </View>

      {/* Search Input Row */}
      <View style={styles.searchRow}>
        <SearchBar
          placeholder={t('marketplace.searchShortPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
        />
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <FilterChip label={t('marketplace.filters')} isStaticLabel={true} />

        <FilterChip
          label={t('marketplace.filterRating')}
          isActive={ratingFilter}
          onPress={toggleRatingFilter}
          showStar={true}
        />

        <FilterChip
          label={t('marketplace.filterVerified')}
          isActive={verifiedFilter}
          onPress={toggleVerifiedFilter}
        />

        <FilterChip
          label={t('marketplace.filterSort')}
          isActive={sortBy !== 'none'}
          onPress={toggleSortFilter}
        />
      </View>

      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.resultsCount}>
            {strings.resultsCount(vendors.length)}
          </Text>

          <FlatList
            data={vendors}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BusinessCard
                layout="list"
                title={isMr ? item.businessNameMr : item.businessNameEn}
                category={isMr ? item.categoryNameMr : item.categoryNameEn}
                distance={`${item.distanceVal?.toFixed(1)} ${t('marketplace.kmSuffix')}`}
                rating={item.ratingAvg}
                reviewsCount={item.reviewsCount}
                isVerified={item.verified}
                thumbnailColors={getLogoBg(item.businessNameEn)}
                onPress={() => navigation.navigate('BusinessProfile', { vendorId: item.id })}
                showViewButton={true}
                viewButtonText={strings.view}
                style={styles.cardSpacing}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.orange]} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{ paddingVertical: 10 }} size="small" color={theme.colors.orange} />
              ) : (
                <View style={styles.bottomSpacer} />
              )
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>{strings.noResults}</Text>
                <Text style={styles.emptySubtitle}>{strings.noResultsSub}</Text>
              </View>
            }
            removeClippedSubviews={true}
            initialNumToRender={5}
            windowSize={8}
            maxToRenderPerBatch={5}
          />
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
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 30,
    marginTop: 66,
  },
  backBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  searchRow: {
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 0,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    marginTop: 24,
    marginBottom: 0,
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    marginTop: 6,
  },
  resultsCount: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 22,
    color: '#8A7C66',
    marginTop: 18,
    marginBottom: 0,
  },
  listContent: {
    paddingBottom: 20,
  },
  cardSpacing: {
    marginBottom: 10,
  },
  bottomSpacer: {
    height: 110,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.charcoal,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});

export default SearchResultsScreen;
