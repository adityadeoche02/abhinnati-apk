import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Alert, ScrollView, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/useAuthStore';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomChevronLeft, CustomChevronRight } from '../../components/common/Icons';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface CustomSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({ value, onValueChange }) => {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[
        styles.switchContainer,
        { backgroundColor: value ? '#2A2520' : '#D8CDB8' }
      ]}
    >
      <View
        style={[
          styles.switchCircle,
          { left: value ? 18 : 2 }
        ]}
      />
    </Pressable>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { preferredLanguage, logout } = useAuthStore();

  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [areaActivity, setAreaActivity] = useState(true);
  const [promotions, setPromotions] = useState(false);

  const isMr = preferredLanguage === 'mr';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('ResidentMain');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [navigation]);

  const strings = {
    title: isMr ? 'सेटिंग्ज' : 'Settings',
    notifications: isMr ? 'सूचना' : 'Notifications',
    bookingUpdates: isMr ? 'बुकिंग अपडेट्स' : 'Booking updates',
    areaActivity: isMr ? 'विभाग हालचाली' : 'Area activity',
    promotions: isMr ? 'प्रमोशन्स' : 'Promotions',
    account: isMr ? 'खाते' : 'Account',
    privacy: isMr ? 'गोपनीयता आणि डेटा' : 'Privacy & data',
    deleteAccount: isMr ? 'खाते हटवा' : 'Delete account',
    logout: isMr ? 'बाहेर पडा' : 'Log out',
    version: 'Abhinnati v1.0.0',
    deleteConfirmTitle: isMr ? 'खाते हटवायचे?' : 'Delete Account?',
    deleteConfirmMsg: isMr ? 'तुम्हाला खात्री आहे की तुम्हाला तुमचे खाते कायमचे हटवायचे आहे?' : 'Are you sure you want to permanently delete your account?',
    logoutConfirmTitle: isMr ? 'बाहेर पडायचे?' : 'Log Out?',
    logoutConfirmMsg: isMr ? 'तुम्हाला खात्री आहे की तुम्हाला लॉग आउट करायचे आहे?' : 'Are you sure you want to log out?',
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      strings.deleteConfirmTitle,
      strings.deleteConfirmMsg,
      [
        { text: isMr ? 'नाही' : 'Cancel', style: 'cancel' },
        {
          text: isMr ? 'होय, हटवा' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert(isMr ? 'खाते हटवले' : 'Account deleted successfully');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      strings.logoutConfirmTitle,
      strings.logoutConfirmMsg,
      [
        { text: isMr ? 'नाही' : 'Cancel', style: 'cancel' },
        {
          text: isMr ? 'होय, बाहेर पडा' : 'Log out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.navigate('Splash');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={15}>
          <CustomChevronLeft size={20} color="#2A2520" strokeWidth={3} />
          <Text style={styles.backText}>{strings.title}</Text>
        </Pressable>
      </View>

      {/* Header Divider */}
      <View style={styles.headerDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section: Notifications */}
        <Text style={styles.sectionLabel}>{strings.notifications}</Text>
        <View style={styles.notificationsCard}>
          {/* Row 1: Booking updates */}
          <View style={styles.row}>
            <Text style={styles.rowText}>{strings.bookingUpdates}</Text>
            <CustomSwitch value={bookingUpdates} onValueChange={setBookingUpdates} />
          </View>
          <View style={styles.cardDivider} />

          {/* Row 2: Area activity */}
          <View style={styles.row}>
            <Text style={styles.rowText}>{strings.areaActivity}</Text>
            <CustomSwitch value={areaActivity} onValueChange={setAreaActivity} />
          </View>
          <View style={styles.cardDivider} />

          {/* Row 3: Promotions */}
          <View style={styles.row}>
            <Text style={styles.rowText}>{strings.promotions}</Text>
            <CustomSwitch value={promotions} onValueChange={setPromotions} />
          </View>
        </View>

        {/* Section: Account */}
        <Text style={[styles.sectionLabel, styles.marginSection]}>{strings.account}</Text>
        <View style={styles.accountCard}>
          {/* Row 1: Privacy & data */}
          <Pressable onPress={() => Alert.alert('Privacy & data placeholder')} style={styles.rowPressable}>
            <Text style={styles.rowText}>{strings.privacy}</Text>
            <CustomChevronRight size={14} color="#C9A877" strokeWidth={3.5} />
          </Pressable>
          <View style={styles.cardDivider} />

          {/* Row 2: Delete account */}
          <Pressable onPress={handleDeleteAccount} style={styles.rowPressable}>
            <Text style={[styles.rowText, styles.textDanger]}>{strings.deleteAccount}</Text>
          </Pressable>
        </View>

        {/* Version Info */}
        <Text style={styles.versionText}>{strings.version}</Text>
      </ScrollView>

      {/* Log out button */}
      <View style={styles.footer}>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>{strings.logout}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 98,
    backgroundColor: '#FBF6EC',
    zIndex: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 22,
    top: 58,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
    marginLeft: 6,
    lineHeight: 25,
  },
  headerDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 98,
    height: 1,
    backgroundColor: '#EFE3CC',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 116, // aligns Notifications title to Y=116 layout coords
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#6B5F4E',
    marginBottom: 4,
    lineHeight: 22,
  },
  marginSection: {
    marginTop: 26, // aligns Account title to Y=316 layout coords
  },
  notificationsCard: {
    width: 357,
    height: 150,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  accountCard: {
    width: 357,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 25,
  },
  rowPressable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 25,
  },
  rowText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#2A2520',
    lineHeight: 25,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F2EAD9',
    width: '100%',
  },
  textDanger: {
    color: '#C0392B',
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#A89A82',
    marginTop: 24, // aligns Version to Y=464 layout coords
    lineHeight: 20,
  },
  switchContainer: {
    width: 40,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  switchCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 28, // positions logout btn to top 724 / bottom 28 layout coords
    left: 18,
    right: 18,
  },
  logoutBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 15,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#C0392B',
    lineHeight: 25,
  },
});

export default SettingsScreen;
