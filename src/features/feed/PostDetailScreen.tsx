import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Share
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowRight, Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/client';
import { CustomChevronLeft } from '../../components/common/Icons';
import { Post, Comment } from '../../api/mockData';
import { likeSyncService } from '../../services/likeSyncService';
import { theme } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

type RouteProps = RouteProp<any, 'PostDetail'>;

export const PostDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { t } = useTranslation();
  const { postId } = (route.params as any) || {};
  const { user, preferredLanguage, activeArea } = useAuthStore();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [heartAnimVisible, setHeartAnimVisible] = useState(false);
  const lastTapRef = useRef<number>(0);

  const isMr = preferredLanguage === 'mr';
  const userId = user?.id || 'current-user';
  const authorName = user?.name || (isMr ? 'अनामिक रहिवासी' : 'Anonymous Resident');
  const localityName = isMr ? activeArea?.name_mr : activeArea?.name_en;

  const strings = {
    backText: t('feed.backText'),
    inputPlaceholder: t('feed.addCommentPlaceholder'),
    noComments: t('feed.noCommentsYet'),
    reply: t('feed.reply'),
  };

  const loadThreadData = async () => {
    try {
      const posts = await api.getPosts(activeArea?.id || 'area-bandra');
      const found = posts.find((p: Post) => p.id === postId);
      if (found) {
        setPost(found);
      }
      
      const threadComments = await api.getComments(postId);
      setComments(threadComments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThreadData();
  }, [postId]);

  const handleLike = () => {
    if (!post) return;

    const hasLiked = post.likedBy.includes(userId);
    const actionType = hasLiked ? 'unlike' : 'like';

    const newLikedBy = hasLiked
      ? post.likedBy.filter((id: string) => id !== userId)
      : [...post.likedBy, userId];
    const newLikesCount = hasLiked ? Math.max(0, post.likes - 1) : post.likes + 1;

    // 1. Optimistic Update: Update UI state immediately
    setPost({
      ...post,
      likes: newLikesCount,
      likedBy: newLikedBy,
    });

    // 2. Queue in Sync Service for background processing & offline retry
    likeSyncService.queueLikeAction(postId, userId, actionType);
  };

  const handlePostPress = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      if (!hasLiked) {
        handleLike();
      }
      setHeartAnimVisible(true);
      setTimeout(() => {
        setHeartAnimVisible(false);
      }, 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `Check out this post on Abhinnati: "${post.title_en || post.title_mr}"\n\nRead more at: http://abhinnati.com/feed/post/${post.id}`,
        url: `http://abhinnati.com/feed/post/${post.id}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const added = await api.addComment(postId, authorName, newComment.trim());
      setComments(prev => [...prev, added]);
      setNewComment('');
      if (post) {
        setPost({ ...post, commentsCount: post.commentsCount + 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCommentColors = (name: string) => {
    const uppercaseName = name.toUpperCase();
    if (uppercaseName.includes('MAHESH') || uppercaseName.includes('महेश')) {
      return { bg: '#E2F0EC', text: '#2D6B5E' };
    }
    // Default/Priya warm orange/peach
    return { bg: '#FBE7CC', text: '#9A5A12' };
  };

  const getTimeAgoString = (comment: Comment) => {
    const uppercaseName = comment.authorName.toUpperCase();
    if (uppercaseName.includes('MAHESH')) return '1h';
    if (uppercaseName.includes('PRIYA')) return '40m';
    
    // Otherwise calculate relative time dynamically
    const diffMs = Date.now() - new Date(comment.createdAt).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return isMr ? 'आता' : 'Just now';
    if (diffMins < 60) return `${diffMins}${isMr ? 'मि' : 'm'}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${isMr ? 'ता' : 'h'}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}${isMr ? 'दि' : 'd'}`;
  };

  const renderCommentItem = ({ item }: { item: Comment }) => {
    const colors = getCommentColors(item.authorName);
    const timeAgoStr = getTimeAgoString(item);
    return (
      <View style={styles.commentItem}>
        {/* Rounded initial avatar */}
        <View style={[styles.commentAvatar, { backgroundColor: colors.bg }]}>
          <Text style={[styles.commentAvatarText, { color: colors.text }]}>
            {item.authorName.charAt(0)}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.commentContentWrapper}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>
              {item.authorName}
              <Text style={styles.commentTime}>
                {` · ${timeAgoStr}`}
              </Text>
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
          
          {/* Reply Text Button */}
          <Pressable style={styles.replyBtn}>
            <Text style={styles.replyBtnText}>{strings.reply}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E58A2B" />
        </View>
      </SafeAreaView>
    );
  }

  const hasLiked = post ? post.likedBy.includes(userId) : false;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={15}>
            <CustomChevronLeft size={20} color="#2A2520" strokeWidth={3} />
            <Text style={styles.backText}>{strings.backText}</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.headerDivider} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            renderItem={renderCommentItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              post ? (
                <Pressable onPress={handlePostPress} style={styles.postSection}>
                  {heartAnimVisible && (
                    <View style={styles.heartOverlay}>
                      <Heart size={48} color="#DA2525" fill="#DA2525" />
                    </View>
                  )}
                  {/* Author Info & Tag Row */}
                  <View style={styles.authorRow}>
                    <View style={styles.authorLeft}>
                      <View style={[styles.avatar, { backgroundColor: '#FBE7CC' }]}>
                        <Text style={[styles.avatarText, { color: '#9A5A12' }]}>
                          {post.authorName.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>{post.authorName}</Text>
                        <Text style={styles.postTime}>
                          {`${localityName || 'Bandra West'} · 2h`}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Local Issue Tag */}
                    <View style={styles.tagContainer}>
                      <Text style={styles.tagText}>
                        {post.tag === 'local_issue' ? (isMr ? 'स्थानिक समस्या' : 'Local issue') : (isMr ? 'चर्चा' : 'Discussion')}
                      </Text>
                    </View>
                  </View>

                  {/* Body Content */}
                  <Text style={styles.postContent}>
                    {isMr ? post.content_mr : post.content_en}
                  </Text>

                  {/* Image or Simulated Image Placeholder */}
                  {post.imageUrl ? (
                    <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                  ) : post.tag === 'local_issue' ? (
                    <View style={styles.imagePlaceholder} />
                  ) : null}

                  {/* Engagement row */}
                  <View style={styles.statsRow}>
                    <Pressable onPress={handleLike} style={styles.statButton}>
                      <Heart 
                        size={18} 
                        color={hasLiked ? '#DA2525' : '#2A2520'} 
                        fill={hasLiked ? '#DA2525' : 'transparent'} 
                      />
                      <Text style={styles.statText}>
                        {t('feed.likesCount', { count: post.likes })}
                      </Text>
                    </Pressable>

                    <View style={styles.statButton}>
                      <MessageCircle size={18} color="#2A2520" />
                      <Text style={styles.statText}>
                        {t('feed.commentsCount', { count: post.commentsCount })}
                      </Text>
                    </View>

                    <Pressable style={styles.statButton} onPress={handleShare}>
                      <Share2 size={18} color="#2A2520" />
                      <Text style={styles.statText}>
                        {t('feed.sharePost')}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.divider} />
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>{strings.noComments}</Text>
              </View>
            }
          />

          {/* Composer bottom bar with Safe Area wrapper */}
          <SafeAreaView style={styles.composerWrapper} edges={['bottom']}>
            <View style={styles.composer}>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder={strings.inputPlaceholder}
                  placeholderTextColor="#A89A82"
                  value={newComment}
                  onChangeText={setNewComment}
                  style={styles.input}
                  multiline
                />
              </View>
              <Pressable
                onPress={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ArrowRight size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF6EC',
  },
  flex: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 98,
    paddingBottom: 20,
  },
  postSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  authorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#9A5A12',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  postTime: {
    fontSize: 13,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
    marginTop: 2,
  },
  tagContainer: {
    backgroundColor: '#FDF1DF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#9A5A12',
  },
  postContent: {
    fontSize: 16,
    fontFamily: 'Mukta-Regular',
    color: '#2A2520',
    lineHeight: 27,
    marginBottom: 14,
  },
  imagePlaceholder: {
    height: 160,
    backgroundColor: '#D2DFE6', // exact slate blue gray color
    borderRadius: 14,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Mukta-Medium',
    fontWeight: '500',
    color: '#3D362E',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFE3CC',
    marginTop: 8,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FBF6EC',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    fontSize: 14,
    fontFamily: 'Mukta-Bold',
    fontWeight: '700',
  },
  commentContentWrapper: {
    flex: 1,
  },
  commentHeader: {
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#2A2520',
  },
  commentTime: {
    fontSize: 12,
    fontFamily: 'Mukta-Regular',
    color: '#8A7C66',
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#3D362E',
    lineHeight: 20,
  },
  replyBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  replyBtnText: {
    fontSize: 12,
    fontFamily: 'Mukta-SemiBold',
    fontWeight: '600',
    color: '#8A7C66',
  },
  emptyComments: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 13,
    color: '#8A7C66',
    fontFamily: 'Mukta-Regular',
  },
  composerWrapper: {
    backgroundColor: '#FFFFFF',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFE3CC',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFE3CC',
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
  },
  input: {
    fontSize: 14,
    fontFamily: 'Mukta-Regular',
    color: '#2A2520',
    padding: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#A89A82',
  },
  heartOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    zIndex: 99,
  },
});

export default PostDetailScreen;
