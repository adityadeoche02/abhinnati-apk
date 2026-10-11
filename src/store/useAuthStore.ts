import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Area } from '../api/mockData';
import { api } from '../api/client';
import i18n from '../i18n';

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: 'resident' | 'vendor' | 'admin';
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  preferredLanguage: 'mr' | 'en';
  activeArea: Area | null;
  tempArea: Area | null;
  deviceGps: Area | null;
  userMode: 'resident' | 'vendor'; // Toggle layout state
  isLoading: boolean;
  isNewUser: boolean;
  vendorProfile: any | null;
  
  initializeAuth: () => Promise<void>;
  setLanguage: (lang: 'mr' | 'en') => Promise<void>;
  setActiveArea: (area: Area) => Promise<void>;
  setDeviceGps: (area: Area | null) => Promise<void>;
  setTempArea: (area: Area | null) => void;
  setUserMode: (mode: 'resident' | 'vendor') => Promise<void>;
  setIsNewUser: (val: boolean) => Promise<void>;
  login: (userProfile: UserProfile, isNewUser?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  fetchVendorProfile: () => Promise<void>;
}

const STORAGE_KEYS = {
  USER: 'abhinnati_store_user',
  LANG: 'abhinnati_store_lang',
  AREA: 'abhinnati_store_area',
  MODE: 'abhinnati_store_mode',
  NEW_USER: 'abhinnati_store_new_user',
  GPS: 'abhinnati_store_gps',
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  preferredLanguage: 'mr',
  activeArea: null,
  tempArea: null,
  deviceGps: null,
  userMode: 'resident',
  isLoading: true,
  isNewUser: true,
  vendorProfile: null,

  initializeAuth: async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const storedLang = await AsyncStorage.getItem(STORAGE_KEYS.LANG);
      const storedArea = await AsyncStorage.getItem(STORAGE_KEYS.AREA);
      const storedMode = await AsyncStorage.getItem(STORAGE_KEYS.MODE);
      const storedNewUser = await AsyncStorage.getItem(STORAGE_KEYS.NEW_USER);
      const storedGps = await AsyncStorage.getItem(STORAGE_KEYS.GPS);

      const userObj = storedUser ? JSON.parse(storedUser) : null;
      let vendorProfile = null;
      if (userObj) {
        try {
          vendorProfile = await api.getVendorByUserId(userObj.id);
        } catch (e) {
          console.warn('[initializeAuth] Failed to load vendor profile:', e);
        }
      }

      const initialLang = (storedLang as 'mr' | 'en') || 'mr';
      await i18n.changeLanguage(initialLang);

      set({
        user: userObj,
        isAuthenticated: !!storedUser,
        preferredLanguage: initialLang,
        activeArea: storedArea ? JSON.parse(storedArea) : null,
        deviceGps: storedGps ? JSON.parse(storedGps) : null,
        tempArea: null,
        userMode: (storedMode as 'resident' | 'vendor') || 'resident',
        isNewUser: storedNewUser === null ? true : storedNewUser === 'true',
        vendorProfile,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setLanguage: async (lang: 'mr' | 'en') => {
    await AsyncStorage.setItem(STORAGE_KEYS.LANG, lang);
    await i18n.changeLanguage(lang);
    set({ preferredLanguage: lang });
  },

  setActiveArea: async (area: Area) => {
    await AsyncStorage.setItem(STORAGE_KEYS.AREA, JSON.stringify(area));
    set({ activeArea: area });
  },

  setDeviceGps: async (area: Area | null) => {
    if (area) {
      await AsyncStorage.setItem(STORAGE_KEYS.GPS, JSON.stringify(area));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.GPS);
    }
    set({ deviceGps: area });
  },

  setTempArea: (area: Area | null) => {
    set({ tempArea: area });
  },

  setUserMode: async (mode: 'resident' | 'vendor') => {
    await AsyncStorage.setItem(STORAGE_KEYS.MODE, mode);
    if (mode === 'vendor') {
      const state = useAuthStore.getState();
      if (state.user) {
        try {
          const profile = await api.getVendorByUserId(state.user.id);
          set({ vendorProfile: profile });
        } catch (e) {
          console.warn('[setUserMode] Failed to fetch vendor profile:', e);
        }
      }
    }
    set({ userMode: mode });
  },

  setIsNewUser: async (val: boolean) => {
    await AsyncStorage.setItem(STORAGE_KEYS.NEW_USER, val ? 'true' : 'false');
    set({ isNewUser: val });
  },

  login: async (userProfile: UserProfile, isNewUserVal = true) => {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userProfile));
    await AsyncStorage.setItem(STORAGE_KEYS.NEW_USER, isNewUserVal ? 'true' : 'false');
    const mode = userProfile.role === 'vendor' ? 'vendor' : 'resident';
    await AsyncStorage.setItem(STORAGE_KEYS.MODE, mode);

    let vendorProfile = null;
    try {
      vendorProfile = await api.getVendorByUserId(userProfile.id);
    } catch (e) {
      console.warn('[login] Failed to load vendor profile:', e);
    }

    set({
      user: userProfile,
      isAuthenticated: true,
      userMode: mode,
      isNewUser: isNewUserVal,
      vendorProfile,
    });
  },

  logout: async () => {
    await AsyncStorage.removeItem('abhinnati_auth_token');
    await AsyncStorage.removeItem('abhinnati_refresh_token');
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.MODE);
    await AsyncStorage.removeItem(STORAGE_KEYS.NEW_USER);
    await AsyncStorage.removeItem('abhinnati_store_new_user');
    await AsyncStorage.removeItem(STORAGE_KEYS.AREA);
    await AsyncStorage.removeItem(STORAGE_KEYS.GPS);
    await AsyncStorage.removeItem('@abhinnati_like_sync_queue');

    set({
      user: null,
      isAuthenticated: false,
      activeArea: null,
      deviceGps: null,
      userMode: 'resident',
      isNewUser: true,
      vendorProfile: null,
    });
  },

  fetchVendorProfile: async () => {
    const user = useAuthStore.getState().user;
    if (user) {
      try {
        const profile = await api.getVendorByUserId(user.id);
        const currentProfile = useAuthStore.getState().vendorProfile;
        
        // MOCK PROTECT: If the frontend has already forced firstApprovedLogin to false 
        // (because the backend setup endpoints are missing), prevent the backend from resetting it to true.
        if (currentProfile?.firstApprovedLogin === false && profile.firstApprovedLogin === true) {
          profile.firstApprovedLogin = false;
        }

        set({ vendorProfile: profile });
      } catch (err) {
        console.warn('[fetchVendorProfile] Failed to fetch vendor profile:', err);
      }
    }
  },
}));

export default useAuthStore;
