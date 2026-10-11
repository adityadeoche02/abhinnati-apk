import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomHomeIcon, CustomSearchIcon, CustomCalendarIcon, CustomProfileIcon } from '../components/common/Icons';
import { ResidentTabParamList } from './types';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../features/marketplace/ExploreScreen';
import BookingsListScreen from '../features/bookings/BookingsListScreen';
import ProfileDashboardScreen from '../features/bookings/ProfileDashboardScreen';

const Tab = createBottomTabNavigator<ResidentTabParamList>();

const capsulePositions = [5, 86, 168, 250];

const CustomTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  const { t } = useTranslation();
  const { preferredLanguage } = useAuthStore();
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(capsulePositions[0]);

  useEffect(() => {
    translateX.value = withTiming(capsulePositions[state.index], {
      duration: 250,
      easing: Easing.inOut(Easing.ease),
    });
  }, [state.index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const getIcon = (routeName: string, isFocused: boolean) => {
    const size = 20;

    switch (routeName) {
      case 'MyArea':
        return <CustomHomeIcon isFocused={isFocused} size={size} />;
      case 'Explore':
        return <CustomSearchIcon isFocused={isFocused} size={size} />;
      case 'BookingsList':
        return <CustomCalendarIcon isFocused={isFocused} size={size} />;
      case 'Profile':
        return <CustomProfileIcon isFocused={isFocused} size={size} />;
      default:
        return null;
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case 'MyArea':
        return t('tabs.home');
      case 'Explore':
        return t('tabs.explore');
      case 'BookingsList':
        return t('tabs.bookings');
      case 'Profile':
        return t('tabs.profile');
      default:
        return '';
    }
  };

  return (
    <View style={[styles.tabBarWrapper, { bottom: Math.max(insets.bottom, 18) + 8 }]}>
      <View style={styles.tabBarContainer}>
        {/* Animated Capsule Background behind icons */}
        <Animated.View style={[styles.activeCapsule, animatedStyle]} />

        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
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

          const leftPos = capsulePositions[index];

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tabButton, { left: leftPos }]}
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

export const ResidentTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="MyArea" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="BookingsList" component={BookingsListScreen} />
      <Tab.Screen name="Profile" component={ProfileDashboardScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    width: 361,
    height: 70,
    alignSelf: 'center',
    zIndex: 9999,
  },
  tabBarContainer: {
    width: 361,
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
    width: 106,
    height: 60,
    top: 5,
    borderRadius: 30,
    backgroundColor: '#D0D0D0',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButton: {
    position: 'absolute',
    width: 106,
    height: 60,
    top: 5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
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

export default ResidentTabNavigator;
