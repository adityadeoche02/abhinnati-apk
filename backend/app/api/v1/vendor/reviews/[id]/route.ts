import { NextRequest } from 'next/server';
import { VendorController } from '../../../../../../src/presentation/controllers/vendor.controller';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return VendorController.getReviewById(req, { params: resolvedParams });
}