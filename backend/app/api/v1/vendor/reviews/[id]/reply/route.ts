import { NextRequest } from 'next/server';
import { VendorController } from '../../../../../../../src/presentation/controllers/vendor.controller';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return VendorController.postReviewReply(req, { params: resolvedParams });
}