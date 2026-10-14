import { NextRequest } from 'next/server';
import { ApiResponse, BadRequestError, UnauthorizedError, HttpError } from '../utils/response';
import {
  UpdateProfileSchema,
  UpdateAddressSchema,
  CreateBusinessSchema,
  UpdateBusinessSchema,
  UploadAssetSchema,
  ReorderGallerySchema,
  UpdateLocationSchema,
  UpdateBusinessHoursSchema,
  CreateServiceSchema,
  UpdateServiceSchema,
  SubmitKycDocsSchema,
  UpdateKycStatusSchema,
} from '../../application/dtos/vendor.dto';

import { GetProfileUseCase } from '../../application/use-cases/vendor/profile/get-profile.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/vendor/profile/update-profile.use-case';
import { ManageBusinessUseCase } from '../../application/use-cases/vendor/business/manage-business.use-case';
import { BusinessHoursUseCase } from '../../application/use-cases/vendor/business/hours.use-case';
import { LocationUseCase } from '../../application/use-cases/vendor/business/location.use-case';
import { ServicesUseCase } from '../../application/use-cases/vendor/services/services.use-case';
import { KycUseCase } from '../../application/use-cases/vendor/kyc/kyc.use-case';

import { VendorService } from '../../modules/vendor/vendor.service';

import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { PrismaVendorRepository } from '../../infrastructure/repositories/prisma-vendor.repository';
import { PrismaBusinessRepository } from '../../infrastructure/repositories/prisma-business.repository';
import { PrismaRefreshTokenRepository } from '../../infrastructure/repositories/prisma-refresh-token.repository';
import { PrismaAuditLogRepository } from '../../infrastructure/repositories/prisma-audit-log.repository';
import { PrismaKycDocumentRepository } from '../../infrastructure/repositories/prisma-kyc-document.repository';
import { PrismaServiceRepository } from '../../infrastructure/repositories/prisma-service.repository';
import { PrismaBusinessHoursRepository } from '../../infrastructure/repositories/prisma-business-hours.repository';
import { PrismaLocationRepository } from '../../infrastructure/repositories/prisma-location.repository';

import { AuthMiddleware } from '../middleware/auth.middleware';

export class VendorController {
  // Repositories initialization
  private static userRepo = new PrismaUserRepository();
  private static vendorRepo = new PrismaVendorRepository();
  private static businessRepo = new PrismaBusinessRepository();
  private static auditRepo = new PrismaAuditLogRepository();
  private static docRepo = new PrismaKycDocumentRepository();
  private static serviceRepo = new PrismaServiceRepository();
  private static hoursRepo = new PrismaBusinessHoursRepository();
  private static locationRepo = new PrismaLocationRepository();

  // Use cases initialization
  private static getProfileUseCase = new GetProfileUseCase(this.userRepo, this.vendorRepo, this.businessRepo);
  private static updateProfileUseCase = new UpdateProfileUseCase(this.userRepo, this.auditRepo);
  private static manageBusinessUseCase = new ManageBusinessUseCase(this.businessRepo, this.vendorRepo, this.auditRepo);
  private static hoursUseCase = new BusinessHoursUseCase(this.businessRepo, this.vendorRepo, this.hoursRepo, this.auditRepo);
  private static locationUseCase = new LocationUseCase(this.businessRepo, this.vendorRepo, this.locationRepo, this.auditRepo);
  private static servicesUseCase = new ServicesUseCase(this.businessRepo, this.vendorRepo, this.serviceRepo, this.auditRepo);
  private static kycUseCase = new KycUseCase(this.vendorRepo, this.docRepo, this.auditRepo);

  // Legacy/Helper Services
  private static vendorService = new VendorService();

  private static getContext(req: NextRequest) {
    const ipAddress = req.headers.get('x-forwarded-for') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;
    return { ipAddress, userAgent };
  }

  static async getAvailability(req: NextRequest) {
    try {
      const searchParams = req.nextUrl.searchParams;
      const vendorId = searchParams.get('vendorId');
      const date = searchParams.get('date');

      if (date && vendorId) {
        const result = await this.vendorService.getAvailableSlots(vendorId, date);
        return ApiResponse.success(result, 'Available slots fetched');
      } else {
        const user = await AuthMiddleware.authenticate(req);
        const result = await this.vendorService.getVendorAvailability(user.userId);
        return ApiResponse.success(result, 'Vendor availability settings fetched');
      }
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateAvailability(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const result = await this.vendorService.updateVendorWeeklyHoursAndRadius(user.userId, body);
      return ApiResponse.success(result, 'Availability settings updated');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateVacation(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const result = await this.vendorService.updateVendorVacation(user.userId, body);
      return ApiResponse.success(result, 'Vacation settings updated');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async blockDate(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json().catch(() => ({}));
      if (!body.date || typeof body.date !== 'string') {
        throw new BadRequestError('Valid date string (YYYY-MM-DD) is required to block date');
      }
      const result = await this.vendorService.blockDate(user.userId, body.date.trim(), body.reason);
      return ApiResponse.success(result, 'Date blocked successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async unblockDate(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json().catch(() => ({}));
      if (!body.date || typeof body.date !== 'string') {
        throw new BadRequestError('Valid date string (YYYY-MM-DD) is required to unblock date');
      }
      const result = await this.vendorService.unblockDate(user.userId, body.date.trim());
      return ApiResponse.success(result, 'Date unblocked successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async blockSlot(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json().catch(() => ({}));
      if (!body.date || !body.startTime || !body.endTime) {
        throw new BadRequestError('date, startTime, and endTime are required to block slot');
      }
      const result = await this.vendorService.blockSlot(
        user.userId,
        String(body.date).trim(),
        String(body.startTime).trim(),
        String(body.endTime).trim(),
        body.reason
      );
      return ApiResponse.success(result, 'Slot blocked successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async unblockSlot(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json().catch(() => ({}));
      if (!body.date || !body.startTime || !body.endTime) {
        throw new BadRequestError('date, startTime, and endTime are required to unblock slot');
      }
      const result = await this.vendorService.unblockSlot(
        user.userId,
        String(body.date).trim(),
        String(body.startTime).trim(),
        String(body.endTime).trim()
      );
      return ApiResponse.success(result, 'Slot unblocked successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async getVendorReviews(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const searchParams = req.nextUrl.searchParams;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const result = await this.vendorService.getVendorReviews(user.userId, page, limit);
      return ApiResponse.success(result, 'Vendor reviews fetched');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async getReviewById(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const result = await this.vendorService.getReviewById(user.userId, params.id);
      return ApiResponse.success(result, 'Review fetched');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async postReviewReply(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const result = await this.vendorService.replyToReview(user.userId, params.id, body.reply);
      return ApiResponse.success(result, 'Reply posted successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async getNotifications(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authenticate(req);
      const result = await this.vendorService.getVendorNotifications(user.userId);
      return ApiResponse.success(result, 'Notifications fetched');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async getMarketplaceVendors(req: NextRequest) {
    try {
      const { prisma } = require('../../../lib/prisma');
      const vendorsDb = await prisma.vendor.findMany({
        where: {
          kycStatus: { in: ['approved', 'APPROVED'] },
          deletedAt: null,
        },
        include: {
          business: {
            include: {
              services: { where: { isActive: true, deletedAt: null } },
              locations: { where: { deletedAt: null } },
              reviews: { where: { deletedAt: null } },
            },
          },
          user: true,
        },
      });

      const mapped = vendorsDb.map((v: any) => {
        const b = v.business;
        const loc = b?.locations?.[0];
        return {
          id: v.id,
          userId: v.userId,
          businessNameMr: b?.nameMr || 'नवीन व्यवसाय',
          businessNameEn: b?.nameEn || 'New Business',
          categorySlug: 'plumbing',
          categoryNameMr: 'स्थानिक सेवा',
          categoryNameEn: 'Local Service',
          descriptionMr: b?.descriptionMr || '',
          descriptionEn: b?.descriptionEn || '',
          latitude: loc?.latitude || 18.5204,
          longitude: loc?.longitude || 73.8567,
          areaId: loc?.area || 'area-kothrud',
          kycStatus: v.kycStatus,
          kycDocsUrl: v.kycDocsUrl,
          isFullyBooked: b?.vacationMode || v.vacationMode || false,
          ratingAvg: b?.ratingAvg || v.ratingAvg || 4.5,
          reviewsCount: b?.reviewsCount || v.reviewsCount || 0,
          services: b?.services || [],
          reviews: b?.reviews || [],
        };
      });

      return ApiResponse.success(mapped, 'Marketplace vendors fetched');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async getPublicVendorProfile(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const { prisma } = require('../../../lib/prisma');
      const vendor = await prisma.vendor.findFirst({
        where: {
          OR: [{ id: params.id }, { business: { id: params.id } }, { userId: params.id }],
          deletedAt: null,
        },
        include: {
          business: {
            include: {
              services: { where: { isActive: true, deletedAt: null } },
              reviews: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
              locations: { where: { deletedAt: null } },
            },
          },
          user: true,
        },
      });

      if (!vendor) {
        return ApiResponse.error('Vendor not found', 404);
      }

      const b = vendor.business;
      const loc = b?.locations?.[0];

      const formatted = {
        id: vendor.id,
        userId: vendor.userId,
        businessId: b?.id,
        businessNameMr: b?.nameMr || 'नवीन व्यवसाय',
        businessNameEn: b?.nameEn || 'New Business',
        descriptionMr: b?.descriptionMr || '',
        descriptionEn: b?.descriptionEn || '',
        logoUrl: b?.logoUrl,
        coverPhotoUrl: b?.coverPhotoUrl,
        galleryUrls: b?.galleryUrls ? JSON.parse(b.galleryUrls) : [],
        whatsappNumber: b?.whatsappNumber,
        phone: vendor.user?.phone || '',
        email: b?.email || vendor.user?.email || '',
        latitude: loc?.latitude || 18.5204,
        longitude: loc?.longitude || 73.8567,
        formattedAddress: loc?.formattedAddress || '',
        areaId: loc?.area || 'area-kothrud',
        ratingAvg: b?.ratingAvg || vendor.ratingAvg || 4.5,
        reviewsCount: b?.reviewsCount || vendor.reviewsCount || 0,
        kycStatus: vendor.kycStatus,
        isFullyBooked: b?.vacationMode || vendor.vacationMode || false,
        vacationMode: b?.vacationMode || vendor.vacationMode || false,
        services: (b?.services || []).map((s: any) => ({
          id: s.id,
          name_mr: s.nameMr,
          name_en: s.nameEn,
          name: s.nameEn,
          price: s.price,
          duration_mins: s.durationMins,
          description_mr: s.descriptionMr,
          description_en: s.descriptionEn,
          description: s.descriptionEn,
          isActive: s.isActive,
        })),
        reviews: (b?.reviews || []).map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment || '',
          text: r.comment || '',
          createdAt: r.createdAt.toISOString(),
          date: r.createdAt.toISOString().split('T')[0],
        })),
        vendor,
        business: b,
      };

      return ApiResponse.success(formatted, 'Vendor profile fetched');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  // --- Profile Endpoints ---

  static async setupProfile(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authenticate(req);
      const body = await req.json();
      const result = await this.vendorService.updateVendorProfileSetup(user.userId, body);
      return ApiResponse.success(result, 'Vendor setup profile updated successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async skipSetup(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authenticate(req);
      const result = await this.vendorService.skipFirstTimeSetup(user.userId);
      return ApiResponse.success(result, 'Vendor setup skipped successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async getProfile(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authenticate(req);
      const profile = await this.getProfileUseCase.execute(user.userId);
      return ApiResponse.success(profile, 'Vendor profile fetched successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateProfile(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authenticate(req);
      const body = await req.json();
      const validation = UpdateProfileSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const profile = await this.updateProfileUseCase.execute(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(profile, 'Profile updated successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async uploadProfilePicture(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authenticate(req);
      const body = await req.json();
      const validation = UploadAssetSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.updateProfileUseCase.uploadProfilePicture(user.userId, validation.data.base64Data, ipAddress, userAgent);
      return ApiResponse.success(result, 'Profile picture uploaded successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async deleteProfilePicture(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authenticate(req);
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.updateProfileUseCase.deleteProfilePicture(user.userId, ipAddress, userAgent);
      return ApiResponse.success(result, 'Profile picture deleted successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  // --- Business Management Endpoints ---

  static async getBusiness(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const business = await this.manageBusinessUseCase.getBusiness(user.userId);
      return ApiResponse.success(business, 'Business details fetched successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async createBusiness(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = CreateBusinessSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const business = await this.manageBusinessUseCase.createBusiness(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(business, 'Business created successfully', 201);
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateBusiness(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = UpdateBusinessSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const business = await this.manageBusinessUseCase.updateBusiness(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(business, 'Business updated successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async deleteBusiness(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const { ipAddress, userAgent } = this.getContext(req);
      const deleted = await this.manageBusinessUseCase.deleteBusiness(user.userId, ipAddress, userAgent);
      return ApiResponse.success(deleted, 'Business deleted successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  // --- Asset Upload Endpoints (Logo, Cover, Gallery) ---

  static async uploadLogo(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = UploadAssetSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.manageBusinessUseCase.uploadLogo(user.userId, validation.data.base64Data, ipAddress, userAgent);
      return ApiResponse.success(result, 'Business logo uploaded successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async deleteLogo(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.manageBusinessUseCase.deleteLogo(user.userId, ipAddress, userAgent);
      return ApiResponse.success(result, 'Business logo deleted successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async uploadCoverPhoto(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = UploadAssetSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.manageBusinessUseCase.uploadCoverPhoto(user.userId, validation.data.base64Data, ipAddress, userAgent);
      return ApiResponse.success(result, 'Business cover photo uploaded successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async deleteCoverPhoto(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.manageBusinessUseCase.deleteCoverPhoto(user.userId, ipAddress, userAgent);
      return ApiResponse.success(result, 'Business cover photo deleted successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async uploadGalleryImages(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      if (!body.images || !Array.isArray(body.images)) {
        throw new BadRequestError('Missing images array parameter');
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.manageBusinessUseCase.uploadGalleryImages(user.userId, body.images, ipAddress, userAgent);
      return ApiResponse.success(result, 'Business gallery uploaded successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async deleteGalleryImage(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      if (!body.imageUrl) {
        throw new BadRequestError('Missing imageUrl parameter');
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.manageBusinessUseCase.deleteGalleryImage(user.userId, body.imageUrl, ipAddress, userAgent);
      return ApiResponse.success(result, 'Business gallery image deleted successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async reorderGallery(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = ReorderGallerySchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.manageBusinessUseCase.reorderGallery(user.userId, validation.data.urls, ipAddress, userAgent);
      return ApiResponse.success(result, 'Business gallery reordered successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  // --- Geolocation & Location Endpoints ---

  static async getBusinessLocation(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const location = await this.locationUseCase.getBusinessLocation(user.userId);
      return ApiResponse.success(location, 'Business location coordinates fetched');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateLocation(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = UpdateLocationSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const location = await this.locationUseCase.updateLocation(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(location, 'Location details updated successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async reverseGeocode(req: NextRequest) {
    try {
      await AuthMiddleware.authenticate(req);
      const { searchParams } = new URL(req.url);
      const lat = parseFloat(searchParams.get('latitude') || '');
      const lon = parseFloat(searchParams.get('longitude') || '');

      if (isNaN(lat) || isNaN(lon)) {
        throw new BadRequestError('latitude and longitude parameters must be valid numeric values');
      }

      const result = await this.locationUseCase.reverseGeocode(lat, lon);
      return ApiResponse.success(result, 'Reverse geocoded location coordinates successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async searchNearby(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const lat = parseFloat(searchParams.get('latitude') || '');
      const lon = parseFloat(searchParams.get('longitude') || '');
      const radius = parseFloat(searchParams.get('radius') || '5.0');

      if (isNaN(lat) || isNaN(lon)) {
        throw new BadRequestError('latitude and longitude parameters must be valid numeric values');
      }

      const result = await this.locationUseCase.searchNearby(lat, lon, radius);
      return ApiResponse.success(result, 'Nearby business search executed successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  // --- Operating Hours & Holiday Schedules Endpoints ---

  static async getHours(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const hours = await this.hoursUseCase.getHours(user.userId);
      return ApiResponse.success(hours, 'Business timing schedules fetched successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateHours(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = UpdateBusinessHoursSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const hours = await this.hoursUseCase.updateHours(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(hours, 'Business hours schedule updated successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  // --- Services CRUD Endpoints ---

  static async getServices(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const services = await this.servicesUseCase.getServices(user.userId);
      return ApiResponse.success(services, 'Vendor services list fetched successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async createService(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = CreateServiceSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const service = await this.servicesUseCase.createService(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(service, 'Service item created successfully', 201);
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateService(req: NextRequest, serviceId: string) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = UpdateServiceSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const service = await this.servicesUseCase.updateService(user.userId, serviceId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(service, 'Service item updated successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async deleteService(req: NextRequest, serviceId: string) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const { ipAddress, userAgent } = this.getContext(req);
      const service = await this.servicesUseCase.deleteService(user.userId, serviceId, ipAddress, userAgent);
      return ApiResponse.success(service, 'Service item deleted successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  // --- KYC Documents & Verification Status Endpoints ---

  static async getKycStatus(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor', 'admin']);
      const kycStatus = await this.kycUseCase.getKycStatus(user.userId);
      return ApiResponse.success(kycStatus, 'KYC document verification status fetched');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async uploadKycDocument(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['vendor']);
      const body = await req.json();
      const validation = SubmitKycDocsSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const document = await this.kycUseCase.uploadDocument(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(document, 'KYC document sheet uploaded successfully', 201);
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }

  static async updateKycStatus(req: NextRequest) {
    try {
      const user = await AuthMiddleware.authorize(req, ['admin']);
      const body = await req.json();
      const validation = UpdateKycStatusSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestError('Validation failed', validation.error.format());
      }
      const { ipAddress, userAgent } = this.getContext(req);
      const result = await this.kycUseCase.updateStatus(user.userId, validation.data, ipAddress, userAgent);
      return ApiResponse.success(result, 'Vendor verification status updated by admin successfully');
    } catch (error) {
      return ApiResponse.handle(error);
    }
  }
}
