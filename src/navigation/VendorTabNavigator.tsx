import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';
import { CustomHomeIcon, CustomCalendarIcon, CustomProfileIcon } from '../components/common/Icons';
import { VendorTabParamList } from './types';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';

// Import screens
import VendorDashboardScreen from '../features/vendor/VendorDashboardScreen';
import ManageServicesScreen from '../features/vendor/ManageServicesScreen';
import BookingRequestsScreen from '../features/vendor/BookingRequestsScreen';
import VendorProfileScreen from '../features/vendor/VendorProfileScreen';

const Tab = createBottomTabNavigator<VendorTabParamList>();

const CustomVendorTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  const { t } = useTranslation();
  const { preferredLanguage } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  // Responsive container width: standard ~361px, responsive across devices
  const containerWidth = Math.min(Math.max(windowWidth - 32, 320), 380);
  const tabWidth = containerWidth / 4;
  const capsuleMargin = 4;
  const capsuleWidth = tabWidth - (capsuleMargin * 2);

  const translateX = useSharedValue(state.index * tabWidth + capsuleMargin);

  useEffect(() => {
    translateX.value = withTiming(state.index * tabWidth + capsuleMargin, {
      duration: 250,
      easing: Easing.inOut(Easing.ease),
    });
  }, [state.index, tabWidth, capsuleMargin]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const getIcon = (routeName: string, isFocused: boolean) => {
    const size = 20;
    const iconColor = isFocused ? '#2A2520' : '#3D362E';

    switch (routeName) {
      case 'VendorDashboard':
        return <CustomHomeIcon isFocused={isFocused} size={size} />;
      case 'VendorBookings':
        return <CustomCalendarIcon isFocused={isFocused} size={size} />;
      case 'ManageServices':
        return <Menu size={size} color={iconColor} strokeWidth={isFocused ? 2.4 : 2.0} />;
      case 'VendorProfile':
        return <CustomProfileIcon isFocused={isFocused} size={size} />;
      default:
        return null;
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case 'VendorDashboard':
        return t('tabs.vendorDashboard');
      case 'VendorBookings':
        return t('tabs.vendorBookings');
      case 'ManageServices':
        return t('tabs.vendorServices');
      case 'VendorProfile':
        return t('tabs.vendorProfile');
      default:
        return '';
    }
  };

  return (
    <View
      style={[
        styles.tabBarWrapper,
        {
          width: containerWidth,
          bottom: Math.max(insets.bottom, 18) + 8,
        },
      ]}
    >
      <View style={styles.tabBarContainer}>
        {/* Animated Capsule Background behind active tab */}
        <Animated.View
          pointerEvents="none"
          style={[styles.activeCapsule, { width: capsuleWidth }, animatedStyle]}
        />

        {/* 4 Tabs Row */}
        <View style={styles.tabsRow}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                android_ripple={{ color: 'transparent' }}
              >
                <View style={styles.iconContainer}>
                  {getIcon(route.name, isFocused)}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
                >
                  {getLabel(route.name)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export const VendorTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomVendorTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="VendorDashboard" component={VendorDashboardScreen} />
      <Tab.Screen name="VendorBookings" component={BookingRequestsScreen} />
      <Tab.Screen name="ManageServices" component={ManageServicesScreen} />
      <Tab.Screen name="VendorProfile" component={VendorProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    height: 70,
    alignSelf: 'center',
    zIndex: 9999,
  },
  tabBarContainer: {
    width: '100%',
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFE3CC',
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  activeCapsule: {
    position: 'absolute',
    height: 60,
    top: 5,
    borderRadius: 30,
    backgroundColor: '#D0D0D0',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#6B5F4E',
    textAlign: 'center',
  },
  activeTabLabel: {
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    color: '#2A2520',
  },
  inactiveTabLabel: {
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#6B5F4E',
  },
});

export default VendorTabNavigator;
