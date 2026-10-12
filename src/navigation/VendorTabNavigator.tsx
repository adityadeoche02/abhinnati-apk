import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
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

  const getIcon = (routeName: string, isFocused: boolean) => {
    const size = 22;
    const activeColor = '#E58A2B';
    const inactiveColor = '#A89A82';
    const color = isFocused ? activeColor : inactiveColor;

    switch (routeName) {
      case 'VendorDashboard':
        return <CustomHomeIcon isFocused={isFocused} size={size} />;
      case 'VendorBookings':
        return <CustomCalendarIcon isFocused={isFocused} size={size} />;
      case 'ManageServices':
        return <Menu size={size} color={color} />;
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
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 16), height: Math.max(insets.bottom, 16) + 66 }]}>
      <View style={styles.tabBarContainer}>
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
            >
              <View style={styles.iconContainer}>
                {getIcon(route.name, isFocused)}
              </View>
              <Text style={[
                styles.tabLabel,
                isFocused ? styles.activeTabLabel : styles.inactiveTabLabel
              ]}>
                {getLabel(route.name)}
              </Text>
            </Pressable>
          );
        })}
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#EFE3CC',
    justifyContent: 'center',
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    width: '100%',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
  activeTabLabel: {
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
    color: '#E58A2B',
  },
  inactiveTabLabel: {
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#A89A82',
  },
});

export default VendorTabNavigator;
