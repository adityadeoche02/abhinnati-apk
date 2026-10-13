import { prisma } from '@/lib/prisma';

export class VendorRepository {
  async findVendorByUserId(userId: string) {
    return prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: true,
        business: {
          include: {
            services: true,
            reviews: true,
          },
        },
      },
    });
  }

  async updateVendor(userId: string, data: any) {
    return prisma.vendor.update({
      where: { userId },
      data,
    });
  }

  async findVendorById(id: string) {
    return prisma.vendor.findUnique({
      where: { id },
    });
  }

  async createVendor(data: any) {
    return prisma.vendor.create({
      data,
    });
  }

  async updateUserRole(userId: string, role: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async findServiceById(id: string) {
    return prisma.service.findUnique({
      where: { id },
    });
  }

  async createService(data: any) {
    return prisma.service.create({
      data,
    });
  }

  async updateService(id: string, data: any) {
    return prisma.service.update({
      where: { id },
      data,
    });
  }

  async deleteService(id: string) {
    return prisma.service.delete({
      where: { id },
    });
  }

  async findReviewById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: { vendor: true },
    });
  }

  async updateReviewReply(id: string, reply: string) {
    return prisma.review.update({
      where: { id },
      data: { reply },
    });
  }
}
