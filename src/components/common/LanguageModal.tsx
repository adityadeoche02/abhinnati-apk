import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../constants/theme';
import { horizontalScale, verticalScale, moderateScale } from '../../hooks/useScale';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  currentLanguage: 'mr' | 'en';
  onSelectLanguage: (lang: 'mr' | 'en') => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  onClose,
  currentLanguage,
  onSelectLanguage,
}) => {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<'mr' | 'en'>(currentLanguage);

  const isMr = currentLanguage === 'mr';
  const strings = {
    title: t('auth.selectLanguageTitle'),
    subtitle: isMr ? 'संपूर्ण ॲपवर लागू होते.' : 'Applies across the whole app.',
    tipText: isMr ? 'तुम्ही सेटिंग्जमध्ये हे कधीही बदलू शकता.' : 'You can change this anytime in Settings.',
    doneBtn: t('common.done'),
  };
  
  // Shared values for Reanimated animations
  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Animate entering on visible transition
  useEffect(() => {
    if (visible) {
      setSelectedLang(currentLanguage);
      backdropOpacity.value = 0;
      sheetTranslateY.value = SCREEN_HEIGHT;
      
      backdropOpacity.value = withTiming(1, {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      sheetTranslateY.value = withTiming(0, {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }, [visible, currentLanguage]);

  // Animate exiting and then call onClose
  const animateClose = (callback?: () => void) => {
    backdropOpacity.value = withTiming(0, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    sheetTranslateY.value = withTiming(
      SCREEN_HEIGHT,
      {
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
      (finished) => {
        if (finished) {
          if (callback) {
            runOnJS(callback)();
          }
          runOnJS(onClose)();
        }
      }
    );
  };

  const handleDone = () => {
    animateClose(() => {
      onSelectLanguage(selectedLang);
    });
  };

  // Pan gesture definition for drag down swipe to close
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        sheetTranslateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(animateClose)();
      } else {
        sheetTranslateY.value = withTiming(0, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  // Animated style mappings
  const animatedBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sheetTranslateY.value }],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={() => animateClose()}
      animationType="none"
    >
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[styles.modalBackdrop, animatedBackdropStyle]}>
          {/* Tap outside backdrop area closes sheet */}
          <Pressable style={styles.backdropPressable} onPress={() => animateClose()} />

          {/* Bottom Sheet Card container */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.bottomSheet, animatedSheetStyle]}>
              {/* Drag Handle bar */}
              <View style={styles.handleBar} />

              <Text style={styles.title}>{strings.title}</Text>
              <Text style={styles.subtitle}>{strings.subtitle}</Text>

              {/* Marathi selection row */}
              <Pressable
                onPress={() => setSelectedLang('mr')}
                style={[
                  styles.optionCard,
                  selectedLang === 'mr' ? styles.optionCardActive : styles.optionCardInactive,
                ]}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionLabel}>मराठी</Text>
                  <Text style={styles.optionSublabel}>Marathi - default</Text>
                </View>
                <View style={styles.optionRight}>
                  {selectedLang === 'mr' ? (
                    <Svg width={16} height={12} viewBox="0 0 16 12" fill="none">
                      <Path
                        d="M1.5 6L5.5 10L14.5 1.5"
                        stroke="#E58A2B"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  ) : (
                    <View style={styles.radioCircle} />
                  )}
                </View>
              </Pressable>

              {/* English selection row */}
              <Pressable
                onPress={() => setSelectedLang('en')}
                style={[
                  styles.optionCard,
                  selectedLang === 'en' ? styles.optionCardActive : styles.optionCardInactive,
                ]}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionLabel}>English</Text>
                  <Text style={styles.optionSublabel}>इंग्रजी</Text>
                </View>
                <View style={styles.optionRight}>
                  {selectedLang === 'en' ? (
                    <Svg width={16} height={12} viewBox="0 0 16 12" fill="none">
                      <Path
                        d="M1.5 6L5.5 10L14.5 1.5"
                        stroke="#E58A2B"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  ) : (
                    <View style={styles.radioCircle} />
                  )}
                </View>
              </Pressable>

              <Text style={styles.tipText}>{strings.tipText}</Text>

              {/* Done Button CTA */}
              <Pressable onPress={handleDone} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>{strings.doneBtn}</Text>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 23, 20, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C4B49C',
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#6B5F4E',
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionCardActive: {
    borderColor: '#E58A2B',
    backgroundColor: '#FDF1DF',
  },
  optionCardInactive: {
    borderColor: '#EFE3CC',
    backgroundColor: '#FFFFFF',
  },
  optionLeft: {
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 17,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  optionSublabel: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
    marginTop: 1,
  },
  optionRight: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C2B193',
    backgroundColor: 'transparent',
  },
  tipText: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
    marginTop: 8,
    marginBottom: 18,
  },
  doneBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2A2520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
});

export default LanguageModal;
