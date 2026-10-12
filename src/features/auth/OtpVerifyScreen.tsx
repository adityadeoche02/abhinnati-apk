import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, Platform, ActivityIndicator, Keyboard, ScrollView, BackHandler } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { api, USE_MOCK_API } from '../../api/client';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'OtpVerify'>;
type RouteProps = RouteProp<RootStackParamList, 'OtpVerify'>;

export const OtpVerifyScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { t } = useTranslation();
  const { preferredLanguage, login } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState(route.params?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setOtpCode('');
      setError('');
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation as any).navigate('LanguageSelect');
      }
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [step, navigation]);

  const otpInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const isMr = preferredLanguage === 'mr';
  const otpLength = 6;

  useEffect(() => {
    if (route.params?.phone && route.params.phone.length === 10) {
      handleSendOtp(route.params.phone);
    }
  }, [route.params?.phone]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const strings = {
    phoneTitle: t('auth.enterPhoneTitle'),
    phoneSub: t('auth.enterPhoneSub'),
    phonePlaceholder: t('auth.phonePlaceholder'),
    smsRates: t('auth.smsRatesNotice'),
    otpTitle: t('auth.verifyNumberTitle'),
    otpSub: t('auth.verifyNumberSub', { count: otpLength }),
    btnSend: t('common.continue'),
    btnVerify: t('auth.verifyBtn'),
    invalidPhone: t('auth.invalidPhone'),
    invalidOtp: t('auth.invalidOtp', { count: otpLength }),
    apiError: t('common.somethingWentWrong'),
    resendPrefix: t('auth.resendCode') + ' ',
    resendAction: t('auth.resendCode'),
  };

  const getMaskedPhone = (phone: string) => {
    if (phone.length < 10) return `+91 ${phone}`;
    const start = phone.slice(0, 2);
    const end = phone.slice(7);
    return `+91 ${start}••• ••${end}`;
  };

  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async (phoneOverride?: any) => {
    const rawPhone = (typeof phoneOverride === 'string') ? phoneOverride : phoneNumber;
    const checkPhone = rawPhone.trim();
    if (checkPhone.length !== 10 || isNaN(Number(checkPhone))) {
      setError(strings.invalidPhone);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formattedPhone = `+91${checkPhone}`;
      const res = await api.requestOtp(formattedPhone);
      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        setStep('otp');
        setTimer(30);
      } else {
        setError(strings.apiError);
      }
    } catch (err: any) {
      setError(err?.message || strings.apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: any) => {
    const activeCode = (typeof codeOverride === 'string') ? codeOverride : otpCode;
    if (activeCode.length !== otpLength || isNaN(Number(activeCode))) {
      setError(strings.invalidOtp);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formattedPhone = `+91${phoneNumber}`;
      const res = await api.verifyOtp(sessionId, activeCode, formattedPhone);
      if (res.success) {
        let userId = `user-${Date.now()}`;
        let role: 'resident' | 'vendor' = res.role as any;
        let name = isMr ? 'अनामिक रहिवासी' : 'Resident Guest';

        if (phoneNumber === '9999999999') {
          userId = 'user-patil-owner';
          role = 'vendor';
          name = isMr ? 'पाटील प्लंबर (व्यावसायिक)' : 'Patil Plumbing (Owner)';
        }

        await login({ id: userId, name, phone: formattedPhone, role }, res.isNewUser);
        navigation.replace('NameSelect');
      } else {
        setError(strings.apiError);
      }
    } catch (err: any) {
      setError(err?.message || strings.apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setOtpCode('');
    setTimer(30);
    await handleSendOtp();
  };

  const activeDotIndex = step === 'phone' ? 1 : 2; // 2nd dot active for phone step, 3rd dot active for OTP step
  const dotCount = 6;

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      
      {/* Header Row - Fixed at top */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={20}
          accessibilityLabel="Go back"
        >
          <View style={styles.backChevron} />
        </Pressable>
        <Text style={styles.title}>
          {step === 'phone' ? strings.phoneTitle : strings.otpTitle}
        </Text>
      </View>

      <View style={styles.flex}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {step === 'phone' ? (
            /* PHONE INPUT SCREEN VIEW */
            <View style={styles.content}>
              <Text style={styles.subtitle}>{strings.phoneSub}</Text>

              <Pressable onPress={() => phoneInputRef.current?.focus()} style={styles.inputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <View style={styles.separator} />
                <TextInput
                  ref={phoneInputRef}
                  value={phoneNumber}
                  onChangeText={(val) => {
                    setError('');
                    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 10);
                    setPhoneNumber(cleaned);
                  }}
                  placeholder={strings.phonePlaceholder}
                  placeholderTextColor="#A89A82"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.phoneInput}
                  autoFocus
                />
              </Pressable>

              <Text style={styles.ratesNote}>{strings.smsRates}</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          ) : (
            /* OTP VERIFICATION SCREEN VIEW */
            <View style={styles.content}>
              <Text style={styles.subtitle}>{strings.otpSub}{getMaskedPhone(phoneNumber)}</Text>

              <TextInput
                ref={otpInputRef}
                value={otpCode}
                onChangeText={(val) => {
                  setError('');
                  const cleaned = val.replace(/[^0-9]/g, '').slice(0, otpLength);
                  setOtpCode(cleaned);
                  if (cleaned.length === otpLength) setTimeout(() => handleVerifyOtp(cleaned), 400);
                }}
                keyboardType="number-pad"
                maxLength={otpLength}
                style={styles.hiddenTextInput}
                autoFocus
              />

              <Pressable onPress={() => otpInputRef.current?.focus()} style={styles.otpRow}>
                {Array.from({ length: otpLength }).map((_, index) => {
                  const digit = otpCode[index] || '';
                  const isFocused = otpCode.length === index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        { width: otpLength === 6 ? 48 : 79 },
                        isFocused && styles.otpBoxFocused,
                        digit !== '' && styles.otpBoxFilled,
                      ]}
                    >
                      <Text style={styles.otpDigit}>{digit}</Text>
                    </View>
                  );
                })}
              </Pressable>

              <View style={styles.resendWrapper}>
                {timer > 0 ? (
                  <Text style={styles.resendTimer}>{strings.resendPrefix}0:{String(timer).padStart(2, '0')}</Text>
                ) : (
                  <Pressable onPress={handleResend}>
                    <Text style={styles.resendLink}>{strings.resendAction}</Text>
                  </Pressable>
                )}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}

          <View style={{ flex: 1 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            onPress={step === 'phone' ? handleSendOtp : handleVerifyOtp}
            disabled={loading || (step === 'phone' && phoneNumber.length < 9) || (step === 'otp' && otpCode.length < otpLength)}
            style={[styles.submitButton, { opacity: loading || (step === 'phone' && phoneNumber.length < 9) || (step === 'otp' && otpCode.length < otpLength) ? 0.5 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {step === 'phone' ? strings.btnSend : strings.btnVerify}
              </Text>
            )}
          </Pressable>

          {/* Pagination Indicators */}
          <View style={styles.indicatorWrapper}>
            {Array.from({ length: dotCount }).map((_, idx) => (
              <View key={idx} style={[styles.dot, activeDotIndex === idx ? styles.activeDot : styles.inactiveDot]} />
            ))}
          </View>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF6EC' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 8, paddingBottom: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backChevron: { width: 9, height: 9, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#2A2520', transform: [{ rotate: '45deg' }] },
  title: { flex: 1, fontFamily: 'Mukta-SemiBold', fontWeight: '700', fontSize: 22, color: '#2A2520', marginRight: 16 },
  content: { paddingHorizontal: 22, paddingTop: 140 },
  subtitle: { fontFamily: 'Mukta-Regular', fontWeight: '400', fontSize: 14, lineHeight: 21, color: '#6B5F4E', marginBottom: 8 },
  inputContainer: { height: 54, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0CFB0', borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  countryCode: { fontFamily: 'Mukta-SemiBold', fontWeight: '600', fontSize: 22, color: '#2A2520', paddingHorizontal: 16 },
  separator: { width: 1, height: 28, backgroundColor: '#E0CFB0' },
  phoneInput: { flex: 1, fontFamily: 'Mukta-Regular', fontWeight: '400', fontSize: 22, color: '#2A2520', letterSpacing: 2, paddingHorizontal: 16, height: '100%' },
  ratesNote: { fontFamily: 'Mukta-Regular', fontWeight: '400', fontSize: 12, color: '#A89A82', marginBottom: 8 },
  errorText: { fontSize: 13, fontFamily: 'Mukta-Regular', color: '#C0392B', marginTop: 8 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 14 },
  otpBox: { height: 54, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E0CFB0', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  otpBoxFocused: { borderWidth: 2, borderColor: '#E58A2B' },
  otpBoxFilled: { borderColor: '#E0CFB0' },
  otpDigit: { fontFamily: 'Mukta-SemiBold', fontWeight: '600', fontSize: 22, color: '#2A2520' },
  hiddenTextInput: { position: 'absolute', width: 0, height: 0, opacity: 0 },
  resendWrapper: { height: 22, justifyContent: 'center' },
  resendTimer: { fontFamily: 'Mukta-Regular', fontSize: 13, color: '#8A7C66' },
  resendLink: { fontFamily: 'Mukta-SemiBold', fontWeight: '600', fontSize: 13, color: '#E58A2B' },
  footer: { paddingHorizontal: 22, paddingBottom: 56, paddingTop: 12 },
  submitButton: { width: '100%', height: 54, backgroundColor: '#2A2520', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  submitButtonText: { fontFamily: 'Mukta-SemiBold', fontWeight: '600', fontSize: 16, color: '#FFFFFF' },
  indicatorWrapper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { height: 7, borderRadius: 4 },
  activeDot: { width: 20, backgroundColor: '#E58A2B' },
  inactiveDot: { width: 7, backgroundColor: '#E0CFB0' },
});

export default OtpVerifyScreen;
