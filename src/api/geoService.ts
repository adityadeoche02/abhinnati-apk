/**
 * geoService.ts
 *
 * Core GPS & reverse-geocoding service for Abhinnati.
 *
 * Stack:
 *  - react-native-geolocation-service  → real device GPS
 *  - OpenStreetMap Nominatim API       → free reverse geocode (no API key)
 *
 * Locality extraction priority (Nominatim address fields):
 *   suburb → neighbourhood → quarter → city_district → village → town → city
 *
 * Always returns a GeoResult. Never throws — all errors are caught internally
 * and surfaced via the `error` field so callers can show appropriate UI.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoAddress {
  locality: string;          // The clean area/locality name shown in the UI
  suburb: string | null;
  neighbourhood: string | null;
  city_district: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
  display_name: string | null; // Full formatted address from Nominatim
}

export interface GeoResult {
  success: boolean;
  latitude: number | null;
  longitude: number | null;
  address: GeoAddress | null;
  /** The single locality string shown in the search bar (e.g. "Kothrud") */
  localityLabel: string | null;
  error: 'permission_denied' | 'gps_unavailable' | 'geocode_failed' | 'offline' | null;
  errorMessage: string | null;
  matchedArea?: any | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'AbhinnatiiApp/1.0 (contact@abhinnati.com)';
const GPS_TIMEOUT_MS = 20000;
const GPS_MAX_AGE_MS = 10000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fields that Nominatim returns but should NEVER be used as the locality label.
 * These are too granular (road, building) or too broad (state, country, county).
 */
const EXCLUDED_FIELDS = new Set([
  'house_number',
  'building',
  'apartment',
  'society',
  'road',
  'street',
  'landmark',
  'postcode',
  'state',
  'country',
  'county',          // too broad for display
  'state_district', // too broad, handled as district fallback
  'country_code',
  'ISO3166-2-lvl4',
]);

/**
 * Extracts the most specific Area/Locality label from a Nominatim address object.
 *
 * Priority order (verified against real Indian Nominatim responses):
 *   locality      → explicit locality tag when present
 *   suburb        → area / sub-city locality  e.g. Koramangala East, Nigdi
 *   neighbourhood → smaller sub-area within a suburb
 *   city_district → administrative district within a city
 *   city          → fallback
 *   county        → regional fallback
 *   state_district→ administrative fallback
 */
function extractLocality(nominatimAddress: Record<string, string>): string | null {
  // Priority order per requirements
  const priority = [
    'locality',
    'suburb',
    'neighbourhood',
    'city_district',
    'city',
    // district fallback – try county first, then state_district
    'county',
    'state_district',
  ];
  for (const key of priority) {
    const value = nominatimAddress[key];
    if (value && value.trim().length > 0) {
      console.log(`[geoService] extractLocality: matched field="${key}" value="${value}"`);
      return value.trim();
    }
  }
  console.log('[geoService] extractLocality: no match found in priority chain');
  return null;
}

/**
 * Request Android location permission.
 * Returns true if granted, false otherwise.
 */
async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Abhinnati needs your location to find nearby services and your area.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Check if location permission is already granted (without prompting).
 */
async function checkLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
  } catch {
    return false;
  }
}

/**
 * Get device GPS coordinates.
 * Returns { latitude, longitude } or throws with a typed error.
 */
function getDeviceCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT_MS,
        maximumAge: GPS_MAX_AGE_MS,
        showLocationDialog: true,
        forceRequestLocation: true,
      }
    );
  });
}

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim.
 * zoom=16 gives street/neighbourhood level detail.
 * Returns the raw address object or null on failure.
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ address: Record<string, string>; display_name: string } | null> {
  try {
    const url = `${NOMINATIM_BASE}?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=16`;
    console.log(`[geoService] reverseGeocode URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      console.warn(`[geoService] reverseGeocode HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('[geoService] reverseGeocode raw response:', JSON.stringify(data?.address ?? {}, null, 2));

    if (!data || !data.address) return null;

    return {
      address: data.address,
      display_name: data.display_name || '',
    };
  } catch (err) {
    console.warn('[geoService] reverseGeocode network error:', err);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main entry point: request permission → get GPS → reverse geocode → extract locality.
 *
 * @param prompt  If true, shows the OS permission dialog if not yet granted.
 *                Pass false for a silent background update (e.g. HomeScreen refresh).
 */
export const geoService = {
  /**
   * Get the current device location with full address details.
   * Handles permissions, GPS errors, network errors, and offline mode gracefully.
   */
  getCurrentLocation: async (prompt = true): Promise<GeoResult> => {
    // ── Step 0: Mock Bypass ───────────────────────────────────────────────
    // Temporarily disabled to allow real GPS and real Reverse-Geocoding even in Mock Mode
    /*
    try {
      const { USE_MOCK_API } = require('./client');
      if (USE_MOCK_API) {
        console.log('[geoService] Mock API enabled: returning mock location instantly');
        await new Promise(r => setTimeout(r, 300)); // Brief natural delay
        const mockArea = {
          id: 'area-bandra-west',
          name_en: 'Bandra West',
          name_mr: 'वांद्रे पश्चिम',
          latitude: 19.0596,
          longitude: 72.8295,
          radius_km: 3.0,
          locality: 'Bandra West',
          city: 'Mumbai',
        };
        const mockAddress: GeoAddress = {
          locality: 'Bandra West',
          suburb: 'Bandra West',
          neighbourhood: null,
          city_district: null,
          city: 'Mumbai',
          state: 'Maharashtra',
          district: 'Mumbai Suburban',
          postcode: '400050',
          country: 'India',
          country_code: 'in',
          display_name: 'Bandra West, Mumbai, Maharashtra, India',
        };
        return {
          success: true,
          latitude: 19.0596,
          longitude: 72.8295,
          address: mockAddress,
          localityLabel: 'Bandra West',
          error: null,
          errorMessage: null,
          matchedArea: mockArea,
        };
      }
    } catch (e) {
      console.warn('[geoService] Failed to load USE_MOCK_API:', e);
    }
    */

    // ── Step 1: Permission ───────────────────────────────────────────────
    const hasPermission = prompt
      ? await requestLocationPermission()
      : await checkLocationPermission();

    if (!hasPermission) {
      console.log('[geoService] Permission denied by user.');
      return {
        success: false,
        latitude: null,
        longitude: null,
        address: null,
        localityLabel: null,
        error: 'permission_denied',
        errorMessage:
          'Location permission was denied. Please enable it in your device Settings to use this feature.',
      };
    }

    // ── Step 2: GPS Coordinates ──────────────────────────────────────────
    let latitude: number;
    let longitude: number;
    try {
      const coords = await getDeviceCoordinates();
      latitude = coords.latitude;
      longitude = coords.longitude;
      console.log(`[geoService] 📍 Raw GPS coordinates: lat=${latitude}, lon=${longitude}`);
    } catch (gpsError: any) {
      const isTimeout = gpsError?.code === 3;
      console.warn('[geoService] GPS error:', gpsError);
      return {
        success: false,
        latitude: null,
        longitude: null,
        address: null,
        localityLabel: null,
        error: 'gps_unavailable',
        errorMessage: isTimeout
          ? 'Location timed out. Make sure GPS is enabled and you have a clear sky view.'
          : 'Unable to get your current location. Please check that GPS is enabled.',
      };
    }

    // ── Step 3: Reverse Geocode ──────────────────────────────────────────
    const geocodeResult = await reverseGeocode(latitude, longitude);

    if (!geocodeResult) {
      console.warn('[geoService] Reverse geocode failed or returned no address.');
      return {
        success: true,
        latitude,
        longitude,
        address: null,
        localityLabel: null,
        error: 'geocode_failed',
        errorMessage:
          'Location detected but could not resolve the area name. Check your internet connection.',
      };
    }

    const rawAddress = geocodeResult.address;
    console.log('[geoService] Complete address fields:', rawAddress);

    // ── Step 4: Extract Locality ─────────────────────────────────────────
    const locality = extractLocality(rawAddress);
    console.log(`[geoService] Parsed locality: "${locality}"`);

    // ── Step 5: Operational Area Matching ────────────────────────────────
    // Try to match the GPS locality against the known operational areas.
    // This corrects cases where Nominatim returns a slightly different name
    // from what is stored in our database (e.g. "Kormangala East" vs "Koramangala").
    let bestMatchLocality: string | null = null;
    let matchedAreaObj: any | null = null;
    try {
      const { api } = require('./client');
      const knownAreas: Array<{ id: string; name_en: string; name_mr?: string; latitude?: number; longitude?: number }>
        = await api.getAreas();

      if (locality && knownAreas.length > 0) {
        const localityLower = locality.toLowerCase();

        // a) Try proximity match first (closest area within 6 km)
        const proximityMatches = knownAreas
          .map(a => {
            if (a.latitude == null || a.longitude == null) return { area: a, dist: Infinity };
            const dLat = a.latitude - latitude;
            const dLon = a.longitude - longitude;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);
            return { area: a, dist };
          })
          .filter(item => item.dist < 0.06); // ~6 km threshold

        proximityMatches.sort((a, b) => a.dist - b.dist);
        const closestProximityMatch = proximityMatches[0]?.area;

        // b) Try exact / prefix name match as fallback
        const nameMatch = knownAreas.find(
          a =>
            a.name_en.toLowerCase() === localityLower ||
            a.name_en.toLowerCase().startsWith(localityLower) ||
            localityLower.startsWith(a.name_en.toLowerCase())
        );

        if (closestProximityMatch) {
          bestMatchLocality = closestProximityMatch.name_en;
          matchedAreaObj = closestProximityMatch;
          console.log(`[geoService] Operational area closest proximity match: "${bestMatchLocality}"`);
        } else if (nameMatch) {
          bestMatchLocality = nameMatch.name_en;
          matchedAreaObj = nameMatch;
          console.log(`[geoService] Operational area name match: "${bestMatchLocality}"`);
        }
      }
    } catch (err) {
      console.log('[geoService] Operational area lookup skipped:', err);
    }

    // Final locality: prefer operational area match, then parsed locality, then city
    const finalLocality =
      bestMatchLocality ||
      locality ||
      rawAddress.city ||
      rawAddress.town ||
      'Unknown Area';

    console.log(`[geoService] ✅ Final search bar value: "📍 ${finalLocality}"`);

    // ── Step 6: Build structured address ─────────────────────────────────
    const address: GeoAddress = {
      locality: finalLocality,
      suburb: rawAddress.suburb || null,
      neighbourhood: rawAddress.neighbourhood || null,
      city_district: rawAddress.city_district || null,
      city: rawAddress.city || rawAddress.town || rawAddress.village || null,
      state: rawAddress.state || null,
      district: rawAddress.county || rawAddress.state_district || null,
      postcode: rawAddress.postcode || null,
      country: rawAddress.country || null,
      country_code: rawAddress.country_code || null,
      display_name: geocodeResult.display_name,
    };

    return {
      success: true,
      latitude,
      longitude,
      address,
      localityLabel: finalLocality,
      error: null,
      errorMessage: null,
      matchedArea: matchedAreaObj,
    };
  },

  /**
   * Silent background GPS update — does not prompt for permission.
   * Used in HomeScreen to silently refresh deviceGps.
   */
  silentUpdate: async (): Promise<GeoResult> => {
    return geoService.getCurrentLocation(false);
  },

  /**
   * Check if location permission is currently granted.
   */
  hasPermission: checkLocationPermission,

  /**
   * Request location permission only (without fetching location).
   * Returns true if granted.
   */
  requestPermission: requestLocationPermission,
};

export default geoService;
