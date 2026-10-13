# Abhinnati Project — Mock Data Removal & Supabase Integration Report
`MOCK_DATA_REMOVAL_REPORT.md`

**Project:** Abhinnati (Hyperlocal Community & Service Marketplace)  
**Database:** Supabase PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com:5432`)  
**Backend:** Next.js 14/16 App Router, Prisma ORM v6.19.3, Clean Architecture  
**Mobile:** React Native (Expo SDK 52), TypeScript, Zustand, Mukta Devanagari  
**Current Phase:** Stage 5 (Group 2: Authenticated Write Operations Verified & Ready)  
**Mock Flag Status:** `USE_MOCK_API = true` (Preserved intact; controlled group cutover in progress)

---

## 1. Stage-by-Stage Progress Summary

| Stage | Description | Status | Details |
|---|---|---|---|
| **Stage 1** | Project & Database Audit | ✅ **Completed** | Full schema inventory, mock data mapping, Prisma client compiled (`@prisma/client v6.19.3`). |
| **Stage 2** | API Routes Implementation | ✅ **Completed** | 10 Next.js App Router handlers created under `backend/app/api/v1/` matching Clean Architecture. |
| **Stage 3** | Supabase Connection & Verification | ✅ **Completed** | Recovered project connection locally, configured `backend/.env`, verified DB ping (PG 17.11), 20 tables discovered, 3 migrations confirmed, schema verified up-to-date. |
| **Stage 4** | Authentication & Real API Verification | ✅ **Completed** | Auth hardening, mock token removal, production build verified (79/79 pages), 15/15 automated integration tests passed. |
| **Stage 5** | Controlled Mobile API Cutover | 🟢 **Groups 1 & 2 Complete** | **Group 1** (Read-Only: 10/10 tests passed) and **Group 2** (Authenticated Writes: 21/21 tests passed) fully implemented and verified against live Supabase PostgreSQL. |

---

## 2. Stage 5 Group 1: Contract Mapping & Audit

### 2.1 Read-Only Features Contract Mapping

| # | Frontend Function & Caller | Current Mock Behavior | Target Backend Route | Request Shape | Response Shape | Auth Required | Status |
|---|---|---|---|---|---|---|---|
| 1 | `api.getCategories` (`ExploreScreen.tsx`) | Returns `mockCategories` from `mockDb.ts` | `GET /api/v1/categories` | None | `{ success: true, data: Category[] }` (with `slug`, `nameMr`, `nameEn`, `name_mr`, `name_en`) | No | ✅ **Verified (Live DB)** |
| 2 | `api.getExplore` (`ExploreScreen.tsx`) | Returns local seed categories + popular vendors from `mockDb.ts` | `GET /api/v1/explore` | None | `{ success: true, data: { categories: Category[], popularBusinesses: Business[] } }` | No | ✅ **Verified (Live DB)** |
| 3 | `api.searchBusinesses` (`ExploreScreen.tsx`, `SearchResultsScreen.tsx`) | Returned empty array `[]` in mock mode | `GET /api/v1/search` | Query params: `q`, `locality`, `rating` | `{ success: true, data: VendorCard[], total: number }` | No | ✅ **Verified (Live DB)** |
| 4 | `api.getCategoryBusinesses` (`SearchResultsScreen.tsx`) | Returned empty array `[]` in mock mode | `GET /api/v1/categories/:id/businesses` | URL param `:id` (slug or UUID), query: `area_id` | `{ success: true, data: VendorCard[], total: number, category: Category }` | No | ✅ **Verified (Live DB)** |
| 5 | `api.getVendors` (`EmptyFeedScreen.tsx`) | Returned empty array `[]` in mock mode | `GET /api/v1/marketplace/vendors` | Query params: `area_id`, `category` | `{ success: true, data: VendorCard[] }` | No | ✅ **Verified (Live DB)** |
| 6 | `api.getVendorById` (`BusinessProfileScreen.tsx`) | Returns `mockVendors` from `mockDb.ts` | `GET /api/v1/businesses/:id` | URL param `:id` (vendor UUID or business UUID) | `{ success: true, data: VendorDetail }` with `services`, `reviews`, ratings | No | ✅ **Verified (Live DB)** |
| 7 | `api.getVendorByUserId` (`useAuthStore.ts`, `VendorDashboardScreen.tsx`) | Fallback to `mockDb.getVendorByUserId` | `GET /api/v1/vendors?userId=...` | Query param: `userId` | `{ success: true, data: Vendor }` | No | ✅ **Verified (Live DB)** |
| 8 | `api.getProfile` (`ProfileScreen.tsx`, `useAuthStore.ts`) | Mock user profile object | `GET /api/v1/user/profile` | Header: `Authorization: Bearer <jwt>` | `{ success: true, data: { id, name, phone, role, language, profileImage, vendor } }` | **Yes (Bearer JWT)** | ✅ **Verified (Live DB)** |
| 9 | `api.getVendorProfile` (`VendorProfileScreen.tsx`) | Fallback to mock profile | `GET /api/v1/vendor/profile` | Header: `Authorization: Bearer <jwt>` | `{ success: true, data: { user, vendor, business } }` | **Yes (Vendor Role)** | ✅ **Verified (Live DB)** |

---

## 3. Targeted Test Results

### 3.1 Group 1: Read-Only Features (10/10 Passed)

| Test Target | Component / Route | Result | Details |
|---|---|---|---|
| Categories Fetch | `GET /api/v1/categories` | **PASS** | Successfully retrieved 4 active categories from Supabase with Devanagari labels. |
| Explore Feed | `GET /api/v1/explore` | **PASS** | Retrieved 4 categories and 2 live popular businesses from Supabase. |
| Marketplace Search | `GET /api/v1/search?q=bakery` | **PASS** | Live search matched 2 approved vendors in Supabase. |
| Category Businesses | `GET /api/v1/categories/food/businesses` | **PASS** | Resolved category slug `food` and retrieved 2 matching businesses. |
| Marketplace Vendors | `GET /api/v1/marketplace/vendors` | **PASS** | Returned 2 approved vendors with services and locations. |
| Business Detail | `GET /api/v1/businesses/:id` | **PASS** | Loaded full vendor profile including services, reviews, and ratings. |
| Vendor by UserId | `GET /api/v1/vendors?userId=...` | **PASS** | Resolved vendor record for user. |
| User Profile (Auth) | `GET /api/v1/user/profile` | **PASS** | Valid JWT retrieved user profile. |
| User Profile (Unauth) | `GET /api/v1/user/profile` | **PASS** | Request without Bearer token strictly rejected with 401 Unauthorized. |
| Vendor Profile (Auth) | `GET /api/v1/vendor/profile` | **PASS** | Vendor JWT retrieved `{ user, vendor, business }` structure. |

### 3.2 Group 2: Authenticated Write Operations (21/21 Passed)

| # | Test Target | Route / Operation | Result | Details |
|---|---|---|---|---|
| 1 | Vendor Onboard (Unauth) | `POST /api/v1/vendor/onboard` | **PASS** | Unauthenticated onboarding strictly rejected with 401 Unauthorized. |
| 2 | Vendor Onboard (Auth) | `POST /api/v1/vendor/onboard` | **PASS** | Authenticated call created/updated vendor, business, and location in Supabase. |
| 3 | User Profile Update | `PATCH /api/v1/user/profile` | **PASS** | Authenticated resident profile name and language updated in Supabase. |
| 4 | Vacation Mode (Enable) | `PATCH /api/v1/vendor/profile/vacation` | **PASS** | Vendor vacation mode enabled on both `Vendor` and `Business` models. |
| 5 | Vacation Mode (Disable) | `PATCH /api/v1/vendor/profile/vacation` | **PASS** | Vendor vacation mode disabled cleanly. |
| 6 | Booking Creation (Unauth) | `POST /api/v1/bookings` | **PASS** | Request without token strictly rejected with 401 Unauthorized. |
| 7 | Booking Creation (Auth) | `POST /api/v1/bookings` | **PASS** | Created live booking with initial status `pending`, trackingStatus `ordered`. |
| 8 | Duplicate Booking Check | `POST /api/v1/bookings` | **PASS** | Submitting active booking for same slot rejected with 400 Duplicate Booking. |
| 9 | Booking Lifecycle (Accept) | `PATCH /api/v1/bookings/:id` | **PASS** | Vendor accepted booking (`pending` -> `accepted`, tracking `in_progress`). |
| 10 | Booking Lifecycle (Complete) | `PATCH /api/v1/bookings/:id` | **PASS** | Vendor completed booking (`accepted` -> `completed`, tracking `completed`). |
| 11 | Terminal State Guard | `PATCH /api/v1/bookings/:id` | **PASS** | Modification of terminal completed booking strictly rejected with 400. |
| 12 | Community Post (Unauth) | `POST /api/v1/community/posts` | **PASS** | Unauthenticated post creation strictly rejected with 401 Unauthorized. |
| 13 | Community Post (Auth) | `POST /api/v1/community/posts` | **PASS** | Live post persisted in Supabase with author linkage and area metadata. |
| 14 | Duplicate Post Anti-Spam | `POST /api/v1/community/posts` | **PASS** | Duplicate post with identical content within 60s rejected with 400. |
| 15 | Like Post (Atomic) | `POST /api/v1/community/posts/:id/like` | **PASS** | Atomically incremented post likes in database. |
| 16 | Duplicate Like Guard | `POST /api/v1/community/posts/:id/like` | **PASS** | Subsequent like by same user did not inflate like count. |
| 17 | Post Comments | `POST /api/v1/community/posts/:id/comments` | **PASS** | Comment created and post `commentsCount` incremented atomically. |
| 18 | Booking Review (Completed) | `POST /api/v1/bookings/:id/review` | **PASS** | Customer review recorded, ratings recalculated, and `AuditLog` entry created. |
| 19 | Duplicate Review Guard | `POST /api/v1/bookings/:id/review` | **PASS** | Second review for same booking strictly rejected with 400. |
| 20 | Notification Read (Unauth) | `POST /api/v1/notifications/read` | **PASS** | Unauthenticated read call rejected with 401 Unauthorized. |
| 21 | Notification Read (Auth) | `POST /api/v1/notifications/read` | **PASS** | Single and bulk notifications marked `read: true` for authenticated user. |

---

## 4. Code Improvements & Bug Fixes in Groups 1 & 2

1. **Fixed Prisma Relation Error in `VendorController.getPublicVendorProfile`:**
   - Corrected relation lookup from `Vendor.services` to `Business.services` to match the Prisma schema.
2. **Fixed Case Sensitivity in `VendorController.getMarketplaceVendors`:**
   - Handled both lowercase and uppercase KYC status strings (`{ in: ['approved', 'APPROVED'] }`).
3. **Hardened `backend/app/api/v1/bookings/route.ts`:**
   - Enforced JWT authentication on booking creation (status 401 if unauthenticated).
   - Validated vendor availability and vacation mode.
   - Enforced duplicate booking slot prevention.
   - Initialized state machine (`status: 'pending'`, `trackingStatus: 'ordered'`, 5-min cancellation window).
4. **Hardened `backend/app/api/v1/community/posts/route.ts`:**
   - Enforced JWT authentication on post creation.
   - Validated non-empty bilingual content.
   - Enforced 60-second anti-spam duplicate post guard.
5. **Hardened `backend/app/api/v1/vendor/onboard/route.ts`:**
   - Enforced JWT verification while preserving safe test fallbacks.
   - Added automatic `Location` record creation and updating when coordinates are provided.
6. **Hardened Reviews and Bookings Lifecycle:**
   - Enforced completion checks and atomic recalculation of ratings on `Business` and `Vendor`.
   - Prevented review duplication using `AuditLog` records.
   - Enforced state machine transitions and prevented edits on terminal bookings.
7. **Resolved Frontend Compilation Issues:**
   - Exported `retryFailedRequests` in [`src/api/client.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/api/client.ts).
   - Added `profileImage?: string | null;` to `UserProfile` in [`src/store/useAuthStore.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/store/useAuthStore.ts).
   - Unified duplicate `updateProfile` methods in [`src/api/client.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/api/client.ts).
   - Both backend (`npm run build`, 76/76 routes) and frontend (`npx tsc --noEmit`) compile with **0 errors**.

---

## 5. Feature Migration Status Matrix

| Feature Group | Feature / Operation | Frontend Caller | Target Backend Route | Current Mode | Live DB Readiness |
|---|---|---|---|---|---|
| **Group 1 (Read-Only)** | Categories List | `api.getCategories` | `GET /api/v1/categories` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | Explore Feed | `api.getExplore` | `GET /api/v1/explore` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | Marketplace Search | `api.searchBusinesses` | `GET /api/v1/search` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | Category Businesses | `api.getCategoryBusinesses` | `GET /api/v1/categories/:id/businesses` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | Marketplace Vendors | `api.getVendors` | `GET /api/v1/marketplace/vendors` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | Vendor / Business Detail | `api.getVendorById` | `GET /api/v1/businesses/:id` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | Vendor by User ID | `api.getVendorByUserId` | `GET /api/v1/vendors?userId=...` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | User Profile | `api.getProfile` | `GET /api/v1/user/profile` | Ready for Cutover | ✅ Live & Verified |
| **Group 1 (Read-Only)** | Vendor Profile | `api.getVendorProfile` | `GET /api/v1/vendor/profile` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Vendor Onboarding | `api.registerVendor` | `POST /api/v1/vendor/onboard` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Profile Updates | `api.updateProfile` | `PATCH /api/v1/user/profile` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Vacation Mode | `api.updateVendorVacationMode` | `PATCH /api/v1/vendor/profile/vacation` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Booking Creation | `api.createBooking` | `POST /api/v1/bookings` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Booking Status Update | `api.updateBookingStatus` | `PATCH /api/v1/bookings/:id` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Community Posts | `api.createPost` | `POST /api/v1/community/posts` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Post Likes | `api.likePost` / `unlikePost` | `POST /api/v1/community/posts/:id/like` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Post Comments | `api.addComment` | `POST /api/v1/community/posts/:id/comments` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Booking Reviews | `api.submitReview` | `POST /api/v1/bookings/:id/review` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Notification Reads | `api.markNotificationsRead` | `POST /api/v1/notifications/read` | Ready for Cutover | ✅ Live & Verified |
| **Group 2 (Auth Writes)** | Notification Reads | `api.markNotificationsRead` | `POST /api/v1/notifications/read` | Ready for Cutover | ✅ Live & Verified |
| **Group 3 (Uploads & Ops)** | Media Uploads | `api.uploadImage` | `POST /api/v1/upload` | Ready for Cutover | ✅ Live & Verified (Cloudinary + Safe Fallback) |
| **Group 3 (Uploads & Ops)** | Slot / Date Blocking | `api.blockSlot` | `POST /api/v1/vendor/block-slot` | Ready for Cutover | ✅ Live & Verified (Duplicate guards & booking rejection) |
| **Payments** | Service Payment | Client timer | N/A (Simulated timer) | Blocked (Simulation) | ⚠️ Real Payment Gateway Required |

---

## 5. Group 3 Automated Verification Test Results

Targeted integration test suite executed against live Supabase PostgreSQL backend with full authentication, validation, duplicate guards, and booking constraint rejection:

### Subgroup 3A: Cloudinary Uploads (`POST /api/v1/upload`)
- `[1.1 Upload (Unauth)]`: Status 401 Unauthorized — **PASS**
- `[1.2 Upload (Missing File)]`: Status 400 Bad Request (Field "file" or "fileData" is required) — **PASS**
- `[1.3 Upload (Disallowed Extension)]`: Status 400 Bad Request (Disallowed file type: .exe. Executables and scripts are prohibited) — **PASS**
- `[1.4 Upload (Oversized Image)]`: Status 400 Bad Request (File size exceeds limit of 5MB) — **PASS**
- `[1.5 Valid Image Upload]`: Status 200 OK (Returns valid secure URL & Cloudinary format) — **PASS**
- `[1.6 Valid PDF Document Upload]`: Status 200 OK (Returns valid document URL & raw format) — **PASS**
- `[1.7 Upload Provider Status]`: Status checked safely without exposing credentials — **PASS**

### Subgroup 3B: Availability & Slot/Date Blocking
- `[2.1 Availability (Unauth)]`: Status 401 Unauthorized — **PASS**
- `[2.2 Vendor Availability (Auth)]`: Status 200 OK (Returned weeklyHours, vacationMode, blockedDates, blockedSlots, serviceRadius, emergencyStatus) — **PASS**
- `[2.3 Available Slots Query]`: Status 200 OK (Computed open booking slots excluding vacation/blocked hours) — **PASS**
- `[2.4 Block Date (Unauth)]`: Status 401 Unauthorized — **PASS**
- `[2.5 Block Date (Forbidden Resident)]`: Status 403 Forbidden (Non-vendor resident rejected) — **PASS**
- `[2.6 Block Date (Missing Date)]`: Status 400 Bad Request (Date required) — **PASS**
- `[2.7 Block Date (Vendor Auth)]`: Status 200 OK (Date saved into `vendor.blockedDates`) — **PASS**
- `[2.8 Block Slot (Missing Params)]`: Status 400 Bad Request (Date, startTime, endTime required) — **PASS**
- `[2.9 Block Slot (Vendor Auth)]`: Status 200 OK (Slot saved into `vendor.blockedSlots`) — **PASS**
- `[2.10 Duplicate Block Slot Guard]`: Status 200 OK (Duplicate slot submissions idempotently ignored; array not inflated) — **PASS**
- `[2.11 Booking Guard (Blocked Date)]`: Status 400 Bad Request (Booking rejected with: "The vendor is unavailable on this date (date blocked)") — **PASS**
- `[2.12 Booking Guard (Blocked Slot)]`: Status 400 Bad Request (Booking rejected with: "The selected time slot has been blocked by the vendor") — **PASS**
- `[2.13 Unblock Slot (Vendor Auth)]`: Status 200 OK (Slot cleanly removed from `vendor.blockedSlots`) — **PASS**
- `[2.14 Unblock Date (Vendor Auth)]`: Status 200 OK (Date cleanly removed from `vendor.blockedDates`) — **PASS**

**Group 3 Total: 21 / 21 Tests Passed (100%)**

---

## 6. Files Changed and Rationale

| File | Change Description | Rationale |
|---|---|---|
| [`backend/app/api/v1/upload/route.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/app/api/v1/upload/route.ts) | Enforced mandatory auth, strict MIME whitelist, blocked dangerous executable extensions, enforced 5MB image / 10MB doc limits | Hardened upload security and prevented arbitrary file execution or oversized uploads |
| [`backend/app/api/v1/bookings/route.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/app/api/v1/bookings/route.ts) | Enforced JWT authentication, vendor vacation check, blocked dates check, blocked slots time overlap check, and duplicate booking prevention | Hardened write operation security and strictly rejected booking attempts on blocked dates and slots |
| [`backend/src/presentation/controllers/vendor.controller.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/src/presentation/controllers/vendor.controller.ts) | Added request body validation in `blockDate`, `unblockDate`, `blockSlot`, `unblockSlot`; fixed `getPublicVendorProfile` Prisma relation query | Prevented undefined/malformed parameters and enforced vendor authorization |
| [`backend/src/modules/vendor/vendor.service.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/src/modules/vendor/vendor.service.ts) | Implemented duplicate slot detection in `blockSlot` | Guaranteed idempotent slot blocking without array inflation |
| [`backend/src/modules/vendor/vendor.repository.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/src/modules/vendor/vendor.repository.ts) | Corrected `findVendorByUserId` Prisma relation include to query `business.services` and `business.reviews` instead of invalid direct vendor relations | Fixed runtime `PrismaClientValidationError` when retrieving vendor profiles |
| [`backend/app/api/v1/community/posts/route.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/app/api/v1/community/posts/route.ts) | Enforced JWT authentication, content validation, and 60-second anti-spam duplicate post guard | Prevented anonymous spam and duplicate community posts |
| [`backend/app/api/v1/vendor/onboard/route.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/app/api/v1/vendor/onboard/route.ts) | Added auth verification, location upsert, and duplicate vendor safety | Ensured vendor onboarding connects business location coordinates and rejects unauthorized requests |
| [`backend/app/api/v1/user/profile/route.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/backend/app/api/v1/user/profile/route.ts) | Implemented authenticated `GET /api/v1/user/profile` | Allowed mobile app to fetch live user and vendor profile from DB |
| [`src/api/client.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/api/client.ts) | Added `uploadImage` alias matching mobile callers; preserved `USE_MOCK_API = true` | Provided seamless contract compatibility for uploads |
| [`src/store/useAuthStore.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/store/useAuthStore.ts) | Added `profileImage?: string | null;` to `UserProfile` interface | Matched backend user model shape |
| `MOCK_DATA_REMOVAL_REPORT.md` | Comprehensive Stage 5 Groups 1, 2 & 3 audit & verification report | Document progress, contracts, test results, limitations, and safety status |

*All 9 pre-existing uncommitted files belonging to the team developer were strictly preserved without modification.*

---

## 7. Known Limitations, Blockers & Proposed Solutions

### 7.1 Active Area Persistence (`PUT /api/v1/user/area`)
- **Current Behavior:** `PUT /api/v1/user/area` responds with `{ success: true, areaId, persisted: false }`. Area is maintained client-side in AsyncStorage/Zustand.
- **Root Cause:** Prisma `User` schema does not contain an `activeAreaId` column.
- **Proposed Safe Schema Change (Pending Separate Approval):**
  ```sql
  ALTER TABLE "User" ADD COLUMN "activeAreaId" TEXT;
  ```
- **Rule:** As per safety instructions, no migration has been run without explicit user approval. Until then, `persisted: false` remains documented.

### 7.2 SMS / OTP Cellular Delivery
- **Current Behavior:** OTP codes are created and validated against the Supabase `OtpSession` database table.
- **Blocker:** Cellular SMS provider (Twilio / Fast2SMS / MSG91) credentials are empty in `backend/.env`.
- **Status:** Real cellular SMS delivery remains marked **BLOCKED** until a provider is configured and verified. For development and testing, OTP sessions are read and verified via local/DB flows.

### 7.3 Payment Flow Simulation
- **Current Behavior:** Payment screen runs a client-side simulated timer (`setTimeout`) and returns a fake transaction ID.
- **Blocker:** No payment gateway webhook or intent creation API is configured.
- **Rule:** Payments must NEVER be represented as successful in production using the simulated timer. A real gateway (e.g., Razorpay / UPI Intent) must be integrated before cutover.

---

## 8. Cutover Safety Verdict

### Is the mobile app safe to switch to live APIs globally (`USE_MOCK_API = false`)?
**NO — Not yet.**

- **Progress Achieved:**
  - **Group 1 (Read-Only):** 10/10 automated tests passed (categories, search, vendors, profile).
  - **Group 2 (Authenticated Writes):** 21/21 automated tests passed (onboarding, profile updates, vacation toggle, booking lifecycle, posts, atomic likes, reviews, notifications).
  - **Group 3 (Uploads & Slot Blocking):** 21/21 automated tests passed (Cloudinary uploads, MIME/size guards, availability, date/slot blocking, duplicate slot guard, booking rejection guards).
  - **Combined Total:** **52 / 52 automated tests passed (100%)** against the live Supabase PostgreSQL backend.
  - **Compilation:** Mobile TypeScript check passed (0 errors); Backend Next.js production build passed (75/75 routes generated cleanly).
- **Remaining Blockers Before Cutover:**
  1. **Payment Flow:** Still simulated via client-side timer. Requires real payment gateway integration (e.g., Razorpay / UPI Intent).
  2. **SMS Delivery:** Cellular SMS credentials need to be configured for live SMS delivery to real phones.
  3. **Area Persistence:** `User.activeAreaId` schema change pending user approval.
---

## 9. Hard-Coded Values Removal & Clean Up Audit (Stage 6)

### 9.1 Summary of Changes
A comprehensive sweep was performed across the Abhinnati project (mobile screens, state stores, navigation, and API configuration) to identify and eliminate hard-coded user IDs, vendor names, static sample identities, static dates, static metrics, and static base URLs.

| File Path | Type of Hard-Coded Value Removed | Dynamic Replacement Implemented |
|---|---|---|
| [`src/features/bookings/PaymentGatewayScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/bookings/PaymentGatewayScreen.tsx) | Hardcoded `'vendor-1'`, `'Aai’s Bakery'`, `'srv-aai-1'`, `'600'`, `'guest-user'`, `'+910000000000'` | Strict parameter validation requiring active service/vendor details; uses authenticated `user.id`, `user.name`, `user.phone` |
| [`src/features/bookings/ProfileDashboardScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/bookings/ProfileDashboardScreen.tsx) | Hardcoded `'Sneha Patil'`, `'+91 9867 626 610'`, `'Bandra West'`, `'Aai’s Bakery'` | Authenticated `user.name`, `user.phone`, dynamic avatar initial, dynamic active area, localized registration state |
| [`src/features/bookings/EditProfileScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/bookings/EditProfileScreen.tsx) | Hardcoded initial state `'Mahesh Kulkarni'` | Dynamic initial state `user?.name \|\| ''` |
| [`src/features/vendor/VendorProfileScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/vendor/VendorProfileScreen.tsx) | Hardcoded `'Sneha Patil'`, `'+91 9867 626 610'`, `'बांद्रा वेस्ट' / 'Bandra West'`, `"Aai's Bakery"` | Authenticated vendor/user name, phone, dynamic initial, dynamic active area name, dynamic business name |
| [`src/features/vendor/VendorDashboardScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/vendor/VendorDashboardScreen.tsx) | Hardcoded area ternary (`vendor.areaId === 'area-bandra' ? 'Bandra West' : 'Ravet'`) and static views metric `128` | Resolves area name dynamically from active area; views metric computed dynamically from vendor data and total bookings |
| [`src/features/feed/CreatePostScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/feed/CreatePostScreen.tsx) | Hardcoded author `'Sneha P.'`, initial `'S'`, locality `'Bandra West'`, fallback `'guest'` | Authenticated `user.id`, `user.name`, dynamic initial, and active area locality |
| [`src/features/feed/MyAreaFeedScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/feed/MyAreaFeedScreen.tsx) | Hardcoded post UUID `'e2c0e8a7-3df8-4bf8-b9a3-5c21f7b8c7a1'` and hardcoded post locality `'वांद्रे पश्चिम' / 'Bandra West'` | Resolves area dynamically; uses post's dynamic area name and localized labels |
| [`src/features/feed/PostDetailScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/feed/PostDetailScreen.tsx) | Hardcoded author name checks for `'MAHESH'` (`'1h'`) and `'PRIYA'` (`'40m'`); static avatar colors | Pure dynamic relative timestamp calculation for all comments; deterministic hash color palettes |
| [`src/features/feed/EmptyFeedScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/feed/EmptyFeedScreen.tsx) | Hardcoded locality fallback `'वांद्रे पश्चिम' / 'Bandra west'` | Dynamic locality resolution from active area with localized generic fallback |
| [`src/features/marketplace/BusinessProfileScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/marketplace/BusinessProfileScreen.tsx) | Hardcoded string checks for `'vendor-aai'` and hardcoded service IDs (`srv-aai-1`, `srv-aai-2`, `srv-aai-3`) | Dynamic service identification and rendering from vendor service array |
| [`src/features/marketplace/SearchResultsScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/marketplace/SearchResultsScreen.tsx) | Hardcoded name string matching for avatar palette colors | Deterministic color palette generator based on vendor name hash |
| [`src/features/vendor/ManageAvailabilityScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/vendor/ManageAvailabilityScreen.tsx) | Hardcoded calendar dates (`'2026-07-15'`) | Dynamic dates generated from current ISO date string |
| [`src/features/vendor/ManageBusinessScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/vendor/ManageBusinessScreen.tsx) | Hardcoded address `'Bandra West, Mumbai'` and phone `'+91 9867 626 610'` | Dynamic vendor address and phone |
| [`src/features/vendor/KycStatusScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/vendor/KycStatusScreen.tsx) | Hardcoded locality fallback `'वांद्रे पश्चिम' / 'Bandra West'` | Dynamic active area lookup with localized fallback |
| [`src/features/auth/OtpVerifyScreen.tsx`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/features/auth/OtpVerifyScreen.tsx) | Fallback user ID precedence and unrestricted vendor bypass | Prioritizes verified user ID from API response; restricts `'9999999999'` vendor bypass strictly to `USE_MOCK_API` |
| [`src/api/client.ts`](file:///c:/Users/Yash/OneDrive/Desktop/Innonsh%20Project/abhinnati-apk/src/api/client.ts) | Hardcoded localhost IP | Platform-aware environment configuration (`process.env.API_BASE_URL` with Android emulator `10.0.2.2:3000` / iOS `localhost:3000` fallbacks) |

### 9.2 Legitimate Constants Retained
- **`USE_MOCK_API = true`**: Retained in `src/api/client.ts` as a safety guard until explicit cutover authorization is granted.
- **Offline Geolocation Dataset (`richSearchDataset`)**: Retained in `LocationService.ts` for offline/fallback landmark resolution.
- **Default Business Hours (`09:00 AM - 06:00 PM`)**: Retained as a safe, sensible initial template for onboarding new vendors.
- **Security & Upload Limits**: Allowed MIME types (`image/jpeg`, `image/png`, `image/webp`) and maximum file size (5MB profile, 10MB general).
- **JWT & OTP Expiration Intervals**: Retained security configuration constants (5-minute OTP lifespan, 24-hour token expiry).
