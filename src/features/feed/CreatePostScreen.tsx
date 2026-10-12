import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  BackHandler
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/client';
import Svg, { Path } from 'react-native-svg';
import { CustomChevronLeft } from '../../components/common/Icons';

const FourPointStar: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = '#6B5F4E' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2"
        fill={color}
      />
    </Svg>
  );
};

export const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user, preferredLanguage, activeArea } = useAuthStore();

  const [content, setContent] = useState('');
  const [tag, setTag] = useState<string>('local_issue'); // default tag
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isMr = preferredLanguage === 'mr';
  const currentLocality = activeArea
    ? (isMr ? activeArea.name_mr : activeArea.name_en)
    : 'Bandra West';

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
    title: t('feed.newPostTitle'),
    subtitle: t('feed.postingTo', { area: currentLocality }),
    placeholder: t('feed.typeHere'),
    addPhoto: t('feed.addPhoto'),
    tagLocalIssue: t('feed.tagLocalIssue'),
    tagEvent: t('feed.tagEvent'),
    tagCelebration: t('feed.tagCelebration'),
    btnPost: t('feed.postBtn'),
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  const authorName = user?.name || 'Sneha P.';
  const avatarInitials = getInitials(authorName);

  const handleUploadImage = async () => {
    if (imageUrl) {
      setImageUrl(null);
      return;
    }
    setUploading(true);
    // Simulate image selection latency
    await new Promise((r) => setTimeout(r, 800));
    setImageUrl(
      'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=500&q=80'
    );
    setUploading(false);
  };

  const handlePost = async () => {
    if (!content.trim() || !activeArea) return;
    setSubmitting(true);
    try {
      const titleText = content.slice(0, 30);
      await api.createPost({
        authorId: user?.id || 'guest',
        authorName,
        areaId: activeArea.id,
        tag,
        title_mr: isMr ? titleText : '',
        title_en: isMr ? '' : titleText,
        content_mr: isMr ? content.trim() : '',
        content_en: isMr ? '' : content.trim(),
        imageUrl: imageUrl || undefined,
      });

      // Clear the onboarding new user state so they return to normal feed
      const { setIsNewUser } = useAuthStore.getState();
      await setIsNewUser(false);

      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert(
        isMr ? 'त्रुटी' : 'Error',
        isMr ? 'काहीतरी चुकीचे घडले.' : 'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={15} accessibilityLabel="Go back">
          <CustomChevronLeft size={20} color="#2A2520" strokeWidth={3} />
        </Pressable>
        <Text style={styles.headerTitle}>{strings.title}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Subtitle */}
      <Text style={styles.subtitleText}>{strings.subtitle}</Text>

      {/* Community Post Card */}
      <View style={styles.postCard}>
        {/* Author Header */}
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitials}</Text>
          </View>
          <Text style={styles.authorName}>{authorName}</Text>
        </View>

        {/* Input */}
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder={strings.placeholder}
          placeholderTextColor="#A89A82"
          multiline
          numberOfLines={8}
          style={styles.textInput}
          textAlignVertical="top"
        />

        {/* Add Photo Button / Image Preview */}
        <Pressable onPress={handleUploadImage} style={styles.addPhotoBtn}>
          {uploading ? (
            <ActivityIndicator size="small" color="#9A5A12" />
          ) : imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photoPreview} />
          ) : (
            <View style={styles.addPhotoInner}>
              <Plus size={10} color="#9A5A12" strokeWidth={3.5} />
              <Text style={styles.addPhotoText}>{strings.addPhoto}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Tag Selection Pills */}
      <View style={styles.tagRow}>
        {/* Local issue */}
        <Pressable
          onPress={() => setTag('local_issue')}
          style={[
            styles.tagPill,
            styles.tagPillLocalIssue,
            tag === 'local_issue' && styles.tagPillSelected
          ]}
        >
          <FourPointStar 
            size={12} 
            color={tag === 'local_issue' ? '#FFFFFF' : '#6B5F4E'} 
          />
          <Text style={[styles.tagText, tag === 'local_issue' && styles.tagTextSelected]}>
            {strings.tagLocalIssue}
          </Text>
        </Pressable>

        {/* Event */}
        <Pressable
          onPress={() => setTag('event')}
          style={[
            styles.tagPill,
            styles.tagPillEvent,
            tag === 'event' && styles.tagPillSelected
          ]}
        >
          <FourPointStar 
            size={12} 
            color={tag === 'event' ? '#FFFFFF' : '#6B5F4E'} 
          />
          <Text style={[styles.tagText, tag === 'event' && styles.tagTextSelected]}>
            {strings.tagEvent}
          </Text>
        </Pressable>

        {/* Celebration */}
        <Pressable
          onPress={() => setTag('celebration')}
          style={[
            styles.tagPill,
            styles.tagPillCelebration,
            tag === 'celebration' && styles.tagPillSelected
          ]}
        >
          <FourPointStar 
            size={12} 
            color={tag === 'celebration' ? '#FFFFFF' : '#6B5F4E'} 
          />
          <Text style={[styles.tagText, tag === 'celebration' && styles.tagTextSelected]}>
            {strings.tagCelebration}
          </Text>
        </Pressable>
      </View>

      {/* Submit Button */}
      <Pressable
        onPress={handlePost}
        disabled={!content.trim() || submitting}
        style={[
          styles.postBtn,
          (!content.trim() || submitting) && styles.postBtnDisabled
        ]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.postBtnText}>{strings.btnPost}</Text>
        )}
      </Pressable>
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
  },
  backBtn: {
    position: 'absolute',
    left: 22,
    top: 66,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    position: 'absolute',
    left: 52,
    top: 58,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 25,
    color: '#2A2520',
  },
  divider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 98,
    height: 1,
    backgroundColor: '#EFE3CC',
  },
  subtitleText: {
    position: 'absolute',
    left: 18,
    top: 113,
    height: 22,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 22,
    color: '#9A5A12',
  },
  postCard: {
    position: 'absolute',
    left: 18,
    top: 161,
    width: 357,
    height: 365,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 20,
    padding: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    marginBottom: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FBE7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 27,
    color: '#9A5A12',
    textAlign: 'center',
  },
  authorName: {
    marginLeft: 10,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 23,
    color: '#2A2520',
  },
  textInput: {
    fontFamily: 'Mukta-Regular',
    fontSize: 16,
    lineHeight: 27,
    color: '#2A2520',
    height: 250,
    padding: 0,
    marginTop: 8,
  },
  addPhotoBtn: {
    position: 'absolute',
    left: 256,
    top: 325,
    width: 85,
    height: 28,
    backgroundColor: '#FBF6EC',
    borderWidth: 1,
    borderColor: '#C9A877',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  addPhotoText: {
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 18,
    color: '#9A5A12',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  tagRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 552,
    height: 30,
  },
  tagPill: {
    position: 'absolute',
    height: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E0CFB0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tagPillLocalIssue: {
    left: 18,
    width: 88,
  },
  tagPillEvent: {
    left: 117,
    width: 62,
  },
  tagPillCelebration: {
    left: 190,
    width: 93,
  },
  tagPillSelected: {
    backgroundColor: '#2A2520',
    borderColor: '#2A2520',
  },
  tagText: {
    marginLeft: 4,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 20,
    color: '#6B5F4E',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  postBtn: {
    position: 'absolute',
    left: 18,
    top: 724,
    width: 357,
    height: 50,
    backgroundColor: '#2A2520',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnText: {
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 25,
    color: '#FFFFFF',
  },
});

export default CreatePostScreen;
