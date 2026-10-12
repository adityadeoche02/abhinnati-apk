import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { mockDb } from './mockDb';

export const USE_MOCK_API = false;

const API_BASE_URL = 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios token injector interceptor (for real API mode)
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('abhinnati_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error loading token in interceptor:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

import { useNetworkStore } from '../store/useNetworkStore';

export const checkConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(API_BASE_URL + '/categories', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.status === 200 || res.status === 404;
  } catch (err) {
    return false;
  }
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Always reject so caller UI catch/finally blocks execute and clear loading spinners
    return Promise.reject(error);
  }
);

/**
 * Unified fetcher that switches between mock database and network API depending on USE_MOCK_API flag.
 * Keeps screen implementations completely clean and decoupled from the active backend state.
 */
export const api = {
  // Auth
  requestOtp: async (phone: string): Promise<{ success: boolean; sessionId: string }> => {
    // ── MOCK MODE ──────────────────────────────────────────────────────────────
    if (USE_MOCK_API) {
      await new Promise(r => setTimeout(r, 600)); // simulate network delay
      const fakeSessionId = `mock-session-${Date.now()}`;
      console.log(`[MOCK] OTP sent to ${phone}. Session: ${fakeSessionId}. Code: 123456`);
      return { success: true, sessionId: fakeSessionId };
    }
    // ── REAL API ───────────────────────────────────────────────────────────────
    try {
      const response = await apiClient.post('/auth/request-otp', { phone_number: phone });
      const payload = response.data?.data || response.data;
      return {
        success: response.data?.success ?? payload?.success ?? true,
        sessionId: payload?.sessionId || payload?.id || '',
      };
    } catch (err: any) {
      console.error('[client] requestOtp failed:', err);
      throw new Error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to request OTP');
    }
  },

  verifyOtp: async (sessionId: string, code: string, phone: string): Promise<{ success: boolean; token: string; isNewUser: boolean; role: string }> => {
    // ── MOCK MODE ──────────────────────────────────────────────────────────────
    if (USE_MOCK_API) {
      await new Promise(r => setTimeout(r, 600)); // simulate network delay
      if (code !== '123456') {
        throw new Error('Invalid OTP. Use 123456 for testing.');
      }
      // Check known test numbers
      let role: string = 'resident';
      let isNewUser = false;
      if (phone === '+919999999999') {
        role = 'vendor';
        isNewUser = false;
      } else if (phone === '+911234567890') {
        role = 'resident';
        isNewUser = false;
      } else {
        isNewUser = true;
        role = 'resident';
      }
      const fakeToken = `mock-token-${Date.now()}`;
      await AsyncStorage.setItem('abhinnati_auth_token', fakeToken);
      return { success: true, token: fakeToken, isNewUser, role };
    }
    // ── REAL API ───────────────────────────────────────────────────────────────
    try {
      const response = await apiClient.post('/auth/verify-otp', { session_id: sessionId, code });
      const payload = response.data?.data || response.data;
      const token = payload?.token || payload?.accessToken || '';
      if (token) {
        await AsyncStorage.setItem('abhinnati_auth_token', token);
      }
      return {
        success: response.data?.success ?? payload?.success ?? true,
        token,
        isNewUser: payload?.isNewUser ?? false,
        role: payload?.role || payload?.user?.role || 'resident',
      };
    } catch (err: any) {
      console.error('[client] verifyOtp failed:', err);
      throw new Error(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to verify OTP');
    }
  },

  updateProfile: async (profileData: { name?: string; language?: string; activeAreaId?: string; activeArea?: any; profileImage?: string | null }): Promise<{ success: boolean; data?: any; error?: string }> => {
    // ── MOCK MODE ── always resolve locally when mock is enabled
    if (USE_MOCK_API) {
      await new Promise(r => setTimeout(r, 500));
      return {
        success: true,
        data: {
          displayName: profileData.name || '',
          fullName: profileData.name || '',
          profileImage: profileData.profileImage || null,
        },
      };
    }

    // ── REAL API ───────────────────────────────────────────────────────────────
    if (profileData.name !== undefined) {
      try {
        const response = await apiClient.post('/user/profile', {
          fullName: profileData.name,
          profileImage: profileData.profileImage || undefined
        });
        return response.data;
      } catch (err: any) {
        console.error('[client] Onboarding updateProfile failed:', err);
        return {
          success: false,
          error: err.response?.data?.error || err.message || 'Failed to save profile'
        };
      }
    }

    const response = await apiClient.patch('/user/profile', profileData);
    return response.data;
  },

  getAreas: async () => {
    if (USE_MOCK_API) {
      return await mockDb.getAreas();
    }
    const response = await apiClient.get('/areas');
    return response.data.data || response.data;
  },

  // Explore Screen Modules
  getExplore: async () => {
    if (USE_MOCK_API) {
      const categories = await mockDb.getCategories();
      const allVendors = await mockDb.getVendors('area-1'); // Default to area-1 for mock
      const popularBusinesses = allVendors.filter(v => v.ratingAvg && v.ratingAvg >= 4.0).slice(0, 5);
      return { categories, popularBusinesses };
    }
    const response = await apiClient.get('/explore');
    return response.data.data;
  },

  searchBusinesses: async (q: string, areaId?: string, page = 1, limit = 10) => {
    if (USE_MOCK_API) {
      return [];
    }
    const response = await apiClient.get('/search', { params: { q, area_id: areaId, page, limit } });
    return response.data.data;
  },

  // Categories
  getCategories: async () => {
    if (USE_MOCK_API) {
      return await mockDb.getCategories?.() ?? [];
    }
    const response = await apiClient.get('/categories');
    return response.data.data;
  },

  // Category Businesses
  getCategoryBusinesses: async (categoryId: string, areaId?: string, sortBy = 'none', verified = false, page = 1, limit = 10) => {
    if (USE_MOCK_API) {
      return [];
    }
    const response = await apiClient.get(`/categories/${categoryId}/businesses`, {
      params: { area_id: areaId, sort: sortBy, verified, page, limit }
    });
    return response.data.data;
  },

  // Vendors
  getVendors: async (areaId: string, categorySlug?: string) => {
    if (USE_MOCK_API) {
      return [];
    }
    const response = await apiClient.get('/marketplace/vendors', { params: { area_id: areaId, category: categorySlug } });
    return response.data;
  },

  getVendorById: async (id: string) => {
    if (USE_MOCK_API) {
      return await mockDb.getVendorByUserId(id);
    }
    const response = await apiClient.get(`/businesses/${id}`);
    return response.data.data;
  },

  updateUserArea: async (areaId: string) => {
    if (USE_MOCK_API) {
      await new Promise(r => setTimeout(r, 300));
      return { success: true };
    }
    const response = await apiClient.put('/user/area', { areaId });
    return response.data.data;
  },

  getVendorByUserId: async (userId: string) => {
    if (USE_MOCK_API) {
      return await mockDb.getVendorByUserId(userId);
    }
    const response = await apiClient.get(`/vendor/profile`);
    return response.data;
  },

  registerVendor: async (vendorData: any) => {
    if (USE_MOCK_API) {
      return await mockDb.registerVendor(vendorData);
    }
    const response = await apiClient.post('/vendor/kyc', vendorData);
    return response.data;
  },

  updateVendorVacationMode: async (vendorId: string, isFullyBooked: boolean) => {
    if (USE_MOCK_API) {
      return await mockDb.updateVendorVacationMode(vendorId, isFullyBooked);
    }
    const response = await apiClient.patch(`/vendor/profile/vacation`, { isFullyBooked });
    return response.data;
  },

  // Services
  saveService: async (vendorId: string, serviceData: any) => {
    if (USE_MOCK_API) {
      return await mockDb.saveVendorService(vendorId, serviceData);
    }
    const response = await apiClient.post('/vendor/services', serviceData);
    return response.data;
  },

  deleteService: async (vendorId: string, serviceId: string) => {
    if (USE_MOCK_API) {
      return await mockDb.deleteVendorService(vendorId, serviceId);
    }
    const response = await apiClient.delete(`/vendor/services/${serviceId}`);
    return response.data;
  },

  getEmptyFeed: async (areaId: string) => {
    if (USE_MOCK_API) {
      return { data: [], message: 'No posts yet' };
    }
    const response = await apiClient.get('/community/empty-feed', { params: { area_id: areaId } });
    return response.data;
  },

  // Feed posts
  getPosts: async (areaId: string) => {
    if (USE_MOCK_API) {
      return await mockDb.getPosts?.(areaId) ?? { data: [], total: 0 };
    }
    const response = await apiClient.get('/community/feed', { params: { area_id: areaId } });
    return response.data;
  },

  createPost: async (postData: any) => {
    if (USE_MOCK_API) {
      return await mockDb.createPost?.(postData) ?? { success: true, data: { id: `post-${Date.now()}`, ...postData } };
    }
    const response = await apiClient.post('/community/posts', postData);
    return response.data;
  },

  likePost: async (postId: string, userId: string) => {
    if (USE_MOCK_API) {
      return { success: true };
    }
    const response = await apiClient.post(`/community/posts/${postId}/like`);
    return response.data;
  },

  unlikePost: async (postId: string, userId: string) => {
    if (USE_MOCK_API) {
      return { success: true };
    }
    const response = await apiClient.delete(`/community/posts/${postId}/like`);
    return response.data;
  },

  getLikes: async (postId: string) => {
    if (USE_MOCK_API) {
      return { data: [], count: 0 };
    }
    const response = await apiClient.get(`/community/posts/${postId}/like`);
    return response.data;
  },

  // Comments
  getComments: async (postId: string) => {
    if (USE_MOCK_API) {
      return { data: [], total: 0 };
    }
    const response = await apiClient.get(`/community/posts/${postId}/comments`);
    return response.data;
  },

  addComment: async (postId: string, authorName: string, content: string) => {
    if (USE_MOCK_API) {
      return { success: true, data: { id: `comment-${Date.now()}`, postId, authorName, content } };
    }
    const response = await apiClient.post(`/community/posts/${postId}/comments`, { authorName, content });
    return response.data;
  },

  // Bookings
  getBookings: async (userId?: string, vendorId?: string) => {
    if (USE_MOCK_API) {
      return await mockDb.getBookings(userId, vendorId);
    }
    const response = await apiClient.get('/bookings', { params: { user_id: userId, vendor_id: vendorId } });
    return response.data;
  },

  createBooking: async (bookingData: any) => {
    if (USE_MOCK_API) {
      return await mockDb.createBooking(bookingData);
    }
    const response = await apiClient.post('/bookings', bookingData);
    return response.data;
  },

  updateBookingStatus: async (bookingId: string, status: string, trackingStatus?: string) => {
    if (USE_MOCK_API) {
      return await mockDb.updateBookingStatus(bookingId, status as any, trackingStatus as any);
    }
    const response = await apiClient.patch(`/bookings/${bookingId}`, { status, trackingStatus });
    return response.data;
  },

  submitReview: async (bookingId: string, rating: number, commentText: string) => {
    if (USE_MOCK_API) {
      return await mockDb.submitReview(bookingId, rating, commentText);
    }
    const response = await apiClient.post(`/bookings/${bookingId}/review`, { rating, text: commentText });
    return response.data;
  },

  submitReviewReply: async (vendorId: string, reviewId: string, replyText: string) => {
    if (USE_MOCK_API) {
      return await mockDb.submitReviewReply(vendorId, reviewId, replyText);
    }
    const response = await apiClient.post(`/vendor/reviews/${reviewId}/reply`, { reply: replyText });
    return response.data;
  },

  // Notifications
  getNotifications: async (userId: string) => {
    if (USE_MOCK_API) {
      return await mockDb.getNotifications(userId);
    }
    const response = await apiClient.get(`/notifications`, { params: { user_id: userId } });
    return response.data;
  },

  markNotificationsRead: async (userId: string) => {
    if (USE_MOCK_API) {
      return await mockDb.markNotificationsRead(userId);
    }
    const response = await apiClient.post(`/notifications/read`, { user_id: userId });
    return response.data;
  },

  adminApproveVendor: async (vendorId: string) => {
    if (USE_MOCK_API) {
      return await mockDb.adminApproveVendor(vendorId);
    }
    const response = await apiClient.post(`/admin/approve-vendor/${vendorId}`);
    return response.data.vendor;
  },

  updateVendorFirstTimeSetup: async (setupData: any) => {
    if (USE_MOCK_API) {
      return await mockDb.updateVendorFirstTimeSetup(setupData);
    }
    const response = await apiClient.post('/vendor/profile/setup', setupData);
    return response.data;
  },

  skipVendorFirstTimeSetup: async () => {
    if (USE_MOCK_API) {
      return await mockDb.skipVendorFirstTimeSetup();
    }
    const response = await apiClient.post('/vendor/profile/skip-setup');
    return response.data;
  },

  getAvailableSlots: async (vendorId: string, date: string) => {
    if (USE_MOCK_API) {
      return await mockDb.getAvailableSlots(vendorId, date);
    }
    const response = await apiClient.get(`/vendor/availability?vendorId=${vendorId}&date=${date}`);
    return response.data;
  },

  getVendorAvailability: async () => {
    if (USE_MOCK_API) {
      return await mockDb.getVendorAvailability();
    }
    const response = await apiClient.get(`/vendor/availability`);
    return response.data;
  },

  updateVendorAvailability: async (data: any) => {
    if (USE_MOCK_API) {
      return await mockDb.updateVendorWeeklyHoursAndRadius(data);
    }
    const response = await apiClient.put(`/vendor/availability`, data);
    return response.data;
  },

  updateVendorVacation: async (data: any) => {
    if (USE_MOCK_API) {
      return await mockDb.updateVendorVacation(data);
    }
    const response = await apiClient.put(`/vendor/vacation`, data);
    return response.data;
  },

  blockDate: async (date: string, reason?: string) => {
    if (USE_MOCK_API) {
      return await mockDb.blockDate({ date, reason });
    }
    const response = await apiClient.post(`/vendor/block-date`, { date, reason });
    return response.data;
  },

  unblockDate: async (date: string) => {
    if (USE_MOCK_API) {
      return await mockDb.unblockDate({ date });
    }
    const response = await apiClient.delete(`/vendor/block-date`, { data: { date } });
    return response.data;
  },

  blockSlot: async (date: string, startTime: string, endTime: string, reason?: string) => {
    if (USE_MOCK_API) {
      return await mockDb.blockSlot({ date, startTime, endTime, reason });
    }
    const response = await apiClient.post(`/vendor/block-slot`, { date, startTime, endTime, reason });
    return response.data;
  },

  unblockSlot: async (date: string, startTime: string, endTime: string) => {
    if (USE_MOCK_API) {
      return await mockDb.unblockSlot({ date, startTime, endTime });
    }
    const response = await apiClient.delete(`/vendor/block-slot`, { data: { date, startTime, endTime } });
    return response.data;
  },

  getVendorReviews: async (page = 1, limit = 10) => {
    if (USE_MOCK_API) {
      return await mockDb.getVendorReviews(page, limit);
    }
    const response = await apiClient.get(`/vendor/reviews?page=${page}&limit=${limit}`);
    return response.data;
  },

  getReviewById: async (reviewId: string) => {
    if (USE_MOCK_API) {
      return await mockDb.getReviewById(reviewId);
    }
    const response = await apiClient.get(`/vendor/reviews/${reviewId}`);
    return response.data;
  },

  postReviewReply: async (reviewId: string, reply: string) => {
    if (USE_MOCK_API) {
      return await mockDb.replyToReview(reviewId, reply);
    }
    const response = await apiClient.post(`/vendor/reviews/${reviewId}/reply`, { reply });
    return response.data;
  },

  getVendorNotifications: async () => {
    if (USE_MOCK_API) {
      return await mockDb.getVendorNotifications();
    }
    const response = await apiClient.get(`/vendor/notifications`);
    return response.data;
  },

  // Cloudinary File & Media Uploads
  uploadFile: async (
    fileData: string,
    type: 'profile' | 'kyc' | 'document' | 'business' | 'general' = 'general',
    resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'
  ): Promise<{ success: boolean; url: string; secure_url: string; public_id: string; isMock?: boolean }> => {
    if (USE_MOCK_API) {
      await new Promise(r => setTimeout(r, 600));
      const mockUrl = type === 'profile'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80'
        : type === 'document' || type === 'kyc'
        ? 'https://res.cloudinary.com/demo/raw/upload/sample.pdf'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80';
      return { success: true, url: mockUrl, secure_url: mockUrl, public_id: `mock_${Date.now()}`, isMock: true };
    }
    const response = await apiClient.post('/upload', { file: fileData, type, resourceType });
    return response.data;
  },

  uploadProfilePhoto: async (fileData: string): Promise<{ success: boolean; url: string; secure_url: string }> => {
    return api.uploadFile(fileData, 'profile', 'image');
  },

  uploadDocument: async (fileData: string, ext = 'pdf'): Promise<{ success: boolean; url: string; secure_url: string }> => {
    return api.uploadFile(fileData, 'document', ext.toLowerCase() === 'pdf' ? 'raw' : 'auto');
  },

  updateProfile: async (data: { name?: string; fullName?: string; profileImage?: string; language?: string }): Promise<any> => {
    if (USE_MOCK_API) {
      await new Promise(r => setTimeout(r, 400));
      return { success: true, message: 'Profile updated' };
    }
    const response = await apiClient.patch('/user/profile', data);
    return response.data;
  },
};
