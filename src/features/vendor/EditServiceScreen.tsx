import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { RootStackParamList } from '../../navigation/types';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { Vendor, Service } from '../../api/mockData';

type NavigationProp = StackNavigationProp<RootStackParamList, 'EditService'>;
type RouteProps = RouteProp<RootStackParamList, 'EditService'>;

export const EditServiceScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { serviceId } = route.params || {};
  const { user, preferredLanguage } = useAuthStore();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [serviceNameMr, setServiceNameMr] = useState('');
  const [serviceNameEn, setServiceNameEn] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [descMr, setDescMr] = useState('');
  const [descEn, setDescEn] = useState('');

  const isMr = preferredLanguage === 'mr';

  const strings = {
    back: t('common.back'),
    editTitle: t('vendor.editServiceTitle'),
    addTitle: t('vendor.addServiceTitle'),
    nameMrLabel: t('vendor.serviceNameMr'),
    nameEnLabel: t('vendor.serviceNameEn'),
    priceLabel: t('vendor.priceRs'),
    durationLabel: t('vendor.durationMins'),
    descMrLabel: t('vendor.descMr'),
    descEnLabel: t('vendor.descEn'),
    btnSave: t('vendor.saveServiceBtn'),
    fillAll: t('vendor.fillAllFields'),
    loading: t('bookings.loadingDetails'),
    noVendor: t('vendor.noVendorProfile'),
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const v = await api.getVendorByUserId(user.id);
        if (v) {
          setVendor(v);
          if (serviceId) {
            const match = v.services.find((s: any) => s.id === serviceId);
            if (match) {
              setServiceNameMr(match.name_mr);
              setServiceNameEn(match.name_en);
              setPrice(String(match.price));
              setDuration(String(match.duration_mins));
              setDescMr(match.description_mr);
              setDescEn(match.description_en);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, serviceId]);

  const handleSave = async () => {
    if (
      !serviceNameMr.trim() ||
      !serviceNameEn.trim() ||
      !price.trim() ||
      !duration.trim() ||
      !vendor
    ) {
      Alert.alert(isMr ? 'त्रुटी' : 'Error', strings.fillAll);
      return;
    }

    setSaving(true);
    try {
      const updated = await api.saveService(vendor.id, {
        id: serviceId || undefined,
        name_mr: serviceNameMr,
        name_en: serviceNameEn,
        price: Number(price),
        duration_mins: Number(duration),
        description_mr: descMr,
        description_en: descEn,
      });

      if (updated) {
        navigation.goBack();
      }
    } catch (err) {
      console.error(err);
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

  if (!vendor) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{strings.noVendor}</Text>
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
        <Text style={styles.headerTitle}>
          {serviceId ? strings.editTitle : strings.addTitle}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <InputField
          label={strings.nameMrLabel}
          placeholder="उदा. सामान्य नळ दुरुस्ती"
          value={serviceNameMr}
          onChangeText={setServiceNameMr}
          containerStyle={styles.inputSpacing}
        />

        <InputField
          label={strings.nameEnLabel}
          placeholder="e.g. Pipe Leakage Fix"
          value={serviceNameEn}
          onChangeText={setServiceNameEn}
          containerStyle={styles.inputSpacing}
        />

        <View style={styles.horizontalInputs}>
          <InputField
            label={strings.priceLabel}
            placeholder="300"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            containerStyle={[styles.inputSpacing, styles.flexInput]}
          />

          <InputField
            label={strings.durationLabel}
            placeholder="60"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            containerStyle={[styles.inputSpacing, styles.flexInput, { marginLeft: 10 }]}
          />
        </View>

        <InputField
          label={strings.descMrLabel}
          placeholder="उदा. गळती बंद करणे आणि वॉटर पाईप जोडणे..."
          value={descMr}
          onChangeText={setDescMr}
          multiline
          numberOfLines={3}
          style={styles.descInput}
          containerStyle={styles.inputSpacing}
        />

        <InputField
          label={strings.descEnLabel}
          placeholder="e.g. general pipe leakage fix and connector replacement..."
          value={descEn}
          onChangeText={setDescEn}
          multiline
          numberOfLines={3}
          style={styles.descInput}
          containerStyle={styles.inputSpacing}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={strings.btnSave}
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
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
  inputSpacing: {
    marginBottom: verticalScale(12),
  },
  horizontalInputs: {
    flexDirection: 'row',
  },
  flexInput: {
    flex: 1,
  },
  descInput: {
    height: verticalScale(60),
    textAlignVertical: 'top',
    paddingTop: verticalScale(8),
  },
  footer: {
    padding: horizontalScale(18),
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  saveBtn: {
    width: '100%',
  },
});

export default EditServiceScreen;
