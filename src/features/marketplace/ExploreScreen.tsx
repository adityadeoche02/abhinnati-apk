import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  CategoryHomeIcon,
  CategoryFoodIcon,
  CategoryHealthIcon,
  CategoryBeautyIcon,
  CategoryAutoIcon,
  CategoryEducationIcon,
  CategoryShoppingIcon,
  CategoryProfessionalIcon,
  CategoryPetsIcon,
  CategoryConstructionIcon,
  CategoryEventsIcon,
  CategoryFitnessIcon,
  CategoryAgricultureIcon,
  CategoryElectricalIcon,
  CategoryGardeningIcon,
  CategoryPhotographyIcon,
  CategorySecurityIcon,
  CategoryLogisticsIcon,
  CategoryDairyIcon,
  CategoryBooksIcon,
} from '../../components/common/CategoryIcons';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../../components/common/LanguageModal';
import { SwitchAreaBottomSheet } from '../../components/common/SwitchAreaBottomSheet';
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import CategoryCard from '../../components/common/CategoryCard';
import BusinessCard from '../../components/common/BusinessCard';
import { api } from '../../api/client';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const categoryIconMap: Record<string, React.FC<any>> = {
  plumbing: CategoryHomeIcon,
  food: CategoryFoodIcon,
  cleaning: CategoryBeautyIcon,
  electric: CategoryAutoIcon,
  legal: CategoryProfessionalIcon,
};

export const ExploreScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { preferredLanguage, activeArea, setLanguage } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [isAreaSheetVisible, setIsAreaSheetVisible] = useState(false);

  // API States
  const [exploreData, setExploreData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Pagination states for Search
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isMr = preferredLanguage === 'mr';
  const localityName = isMr ? activeArea?.name_mr : activeArea?.name_en;
  const displayLocality = localityName || (isMr ? 'वांद्रे पश्चिम' : 'Bandra West');

  const strings = {
    searchPlaceholder: t('marketplace.searchServicePlaceholder'),
    browseTitle: t('marketplace.browseCategories'),
    popularTitle: t('marketplace.popularNearYou'),
    noResults: t('marketplace.noProvidersFound'),
    errorText: t('marketplace.failedToLoad'),
    retryBtn: t('common.retry'),
    loadingText: t('common.loading'),
  };

  // 1. Fetch explore home screen data
  const fetchExplore = useCallback(async () => {
    try {
      setHasError(false);
      const data = await api.getExplore();
      setExploreData(data);
    } catch (error) {
      console.error('[ExploreScreen] Error fetching explore:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExplore();
  }, [fetchExplore, activeArea]);

  // 2. Debounce query state change
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Search businesses fetch execution
  const executeSearch = useCallback(async (query: string, page: number, loadMore = false) => {
    if (!query.trim()) return;

    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setHasError(false);
      }

      const res = await api.searchBusinesses(query, activeArea?.id, page, 10);
      if (loadMore) {
        setSearchResults((prev) => [...prev, ...(res.businesses || [])]);
      } else {
        setSearchResults(res.businesses || []);
      }
      setSearchPage(res.pagination?.page || 1);
      setSearchTotalPages(res.pagination?.totalPages || 1);
    } catch (error) {
      console.error('[ExploreScreen] Error executing search:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeArea]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      executeSearch(debouncedQuery, 1, false);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, executeSearch]);

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    navigation.navigate('SearchResults', { query: searchQuery.trim() });
  };

  const handleCategoryPress = (slug: string) => {
    navigation.navigate('SearchResults', { categorySlug: slug });
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (searchQuery.trim()) {
      await executeSearch(debouncedQuery, 1, false);
    } else {
      await fetchExplore();
    }
    setIsRefreshing(false);
  };

  const loadMoreSearch = () => {
    if (searchQuery.trim() && searchPage < searchTotalPages && !isLoadingMore) {
      executeSearch(debouncedQuery, searchPage + 1, true);
    }
  };

  const getCategoryIcon = (slug: string) => {
    return categoryIconMap[slug] || CategoryShoppingIcon;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
          <Text style={styles.loadingText}>{strings.loadingText}</Text>
        </View>
      );
    }

    if (hasError) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{strings.errorText}</Text>
          <Pressable style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>{strings.retryBtn}</Text>
          </Pressable>
        </View>
      );
    }

    if (searchQuery.trim()) {
      if (searchResults.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>{strings.noResults}</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BusinessCard
              layout="list"
              title={isMr ? item.businessNameMr : item.businessNameEn}
              category={isMr ? item.categoryNameMr : item.categoryNameEn}
              distance={`${item.distanceVal?.toFixed(1)} km`}
              rating={item.ratingAvg}
              reviewsCount={item.reviewsCount}
              isVerified={item.verified}
              onPress={() => navigation.navigate('BusinessProfile', { vendorId: item.id })}
              showViewButton={false}
            />
          )}
          onEndReached={loadMoreSearch}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator style={{ paddingVertical: 15 }} size="small" color={theme.colors.orange} />
            ) : null
          }
          contentContainerStyle={styles.listContainer}
        />
      );
    }

    const categoriesList = exploreData?.categories || [];
    const popularVendorsList = exploreData?.popularBusinesses || [];

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.colors.orange]} />
        }
      >
        {/* Browse Categories Title */}
        <Text style={styles.sectionTitle}>{strings.browseTitle}</Text>

        {/* Categories Grid */}
        <View style={styles.gridContainer}>
          {categoriesList.map((cat: any) => (
            <CategoryCard
              key={cat.id}
              label={isMr ? cat.name_mr : cat.name_en}
              icon={getCategoryIcon(cat.slug)}
              onPress={() => handleCategoryPress(cat.slug)}
            />
          ))}
        </View>

        {/* Popular near you Section */}
        <Text style={styles.sectionTitle}>{strings.popularTitle}</Text>

        {/* Popular near you List */}
        <View style={styles.listContainer}>
          {popularVendorsList.map((vendor: any) => (
            <BusinessCard
              key={vendor.id}
              layout="list"
              title={isMr ? vendor.businessNameMr : vendor.businessNameEn}
              category={isMr ? vendor.categoryNameMr : vendor.categoryNameEn}
              distance={isMr ? `${vendor.distanceVal?.toFixed(1)} किमी` : `${vendor.distanceVal?.toFixed(1)} km`}
              rating={vendor.ratingAvg}
              reviewsCount={vendor.reviewsCount}
              isVerified={vendor.verified}
              onPress={() => navigation.navigate('BusinessProfile', { vendorId: vendor.id })}
              showViewButton={false}
            />
          ))}
        </View>

        <View style={styles.spacingBottom} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Header
        localityName={displayLocality}
        preferredLanguage={preferredLanguage}
        onLocalityPress={() => setIsAreaSheetVisible(true)}
        onLanguagePress={() => setIsLangModalVisible(true)}
        onNotificationsPress={() => navigation.navigate('Alerts')}
        langButtonBackground={theme.colors.white}
      />

      {/* Search Bar Input */}
      <View style={{ paddingHorizontal: 18, marginTop: 12 }}>
        <SearchBar
          placeholder={strings.searchPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          containerStyle={styles.searchBarContainer}
        />
      </View>

      <View style={{ flex: 1 }}>{renderContent()}</View>

      <LanguageModal
        visible={isLangModalVisible}
        onClose={() => setIsLangModalVisible(false)}
        currentLanguage={preferredLanguage}
        onSelectLanguage={async (lang) => {
          await setLanguage(lang);
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
    backgroundColor: '#FBF6EC',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  searchBarContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.semiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 23,
    color: '#6B5F4E',
    marginBottom: 7,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
    rowGap: 14,
  },
  listContainer: {
    paddingHorizontal: 18,
    gap: 10,
    marginTop: 4,
  },
  spacingBottom: {
    height: 110,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B5F4E',
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.medium,
    color: '#D9534F',
    marginBottom: 15,
  },
  retryBtn: {
    backgroundColor: theme.colors.orange,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFF',
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.regular,
    color: '#8A7C66',
  },
});

export default ExploreScreen;
