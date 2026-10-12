import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import BrandLogo from '../../components/common/BrandLogo';

type NavigationProp = StackNavigationProp<RootStackParamList, 'LanguageSelect'>;

export const LanguageSelectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { preferredLanguage, setLanguage } = useAuthStore();
  const [selectedLang, setSelectedLang] = useState<'mr' | 'en'>(preferredLanguage);

  const handleSelectLang = async (lang: 'mr' | 'en') => {
    setSelectedLang(lang);
    await setLanguage(lang);
  };

  const handleContinue = () => {
    // Navigate to OTP verify
    navigation.navigate('OtpVerify', { phone: '' });
  };

  return (
    <View style={styles.container}>
      {/* Top / Center Content */}
      <View style={styles.content}>
        
        {/* Brand Logo Header */}
        <View style={styles.logoWrapper}>
          <BrandLogo size={166} />
        </View>

        {/* Section Label */}
        <Text style={styles.sectionLabel}>{t('auth.selectLanguageTitle')}</Text>

        {/* Language Selection List */}
        <View style={styles.listContainer}>
          {/* Marathi (Selected by Default) */}
          <Pressable
            onPress={() => handleSelectLang('mr')}
            style={[
              styles.optionCard,
              selectedLang === 'mr' ? styles.selectedCard : styles.unselectedCard,
            ]}
          >
            <Text style={[styles.langText, selectedLang === 'mr' && styles.selectedLangText]}>
              {t('auth.marathi')}
            </Text>
            {selectedLang === 'mr' ? (
              <Check size={20} color="#E58A2B" strokeWidth={3} />
            ) : (
              <View style={styles.radioOutline} />
            )}
          </Pressable>

          {/* English */}
          <Pressable
            onPress={() => handleSelectLang('en')}
            style={[
              styles.optionCard,
              selectedLang === 'en' ? styles.selectedCard : styles.unselectedCard,
            ]}
          >
            <Text style={[styles.langText, selectedLang === 'en' && styles.selectedLangText]}>
              {t('auth.english')}
            </Text>
            {selectedLang === 'en' ? (
              <Check size={20} color="#E58A2B" strokeWidth={3} />
            ) : (
              <View style={styles.radioOutline} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Footer / CTA and Page Indicators */}
      <View style={styles.footer}>
        <Button
          title={t('common.continue')}
          onPress={handleContinue}
          style={styles.btn}
          textStyle={styles.btnText}
        />

        {/* Onboarding Indicators */}
        <View style={styles.indicatorContainer}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC', // Cream background from Figma spec
  },
  content: {
    flex: 1,
    paddingHorizontal: horizontalScale(22), // 393 - 2*22 = 349 content width matching button layout perfectly
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: verticalScale(40),
  },
  logoWrapper: {
    marginTop: verticalScale(50),
    marginBottom: verticalScale(70),
  },
  sectionLabel: {
    fontSize: moderateScale(13),
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: '500',
    color: '#6B5F4E', // Muted label color
    alignSelf: 'flex-start',
    marginBottom: verticalScale(12),
    paddingHorizontal: horizontalScale(4),
  },
  listContainer: {
    width: '100%',
    gap: verticalScale(12),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52, // Exact Height 52px
    borderRadius: 13, // Exact Radius 13px
    paddingHorizontal: horizontalScale(16),
  },
  selectedCard: {
    borderWidth: 1.5, // 1.5px border
    borderColor: '#E58A2B', // Marigold border
    backgroundColor: '#FDF1DF', // Exact marigold-soft-bg (#FDF1DF)
  },
  unselectedCard: {
    borderWidth: 1, // 1px border
    borderColor: '#E0CFB0', // Exact Border Color (#E0CFB0)
    backgroundColor: '#FFFFFF', // White background
  },
  langText: {
    fontSize: moderateScale(15),
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: '500',
    color: '#2A2520', // Charcoal text color
  },
  selectedLangText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: '700',
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1, // 1px border
    borderColor: '#E0CFB0',
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 56,
    paddingTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  btn: {
    width: '100%',
    height: 54,
    backgroundColor: '#2A2520',
    borderRadius: 14,
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 7, // width: 7px
    height: 7, // height: 7px
    borderRadius: 4, // border-radius: 4px
    backgroundColor: '#E0CFB0', // Inactive color: #E0CFB0
  },
  activeDot: {
    width: 20, // width: 20px
    height: 7, // height: 7px
    borderRadius: 4, // border-radius: 4px
    backgroundColor: '#E58A2B', // Active marigold
  },
});

export default LanguageSelectScreen;

