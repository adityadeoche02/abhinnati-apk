import { NextRequest } from 'next/server';
import { VendorController } from '../../../../../src/presentation/controllers/vendor.controller';

export async function GET(req: NextRequest) { return VendorController.getAvailability(req); }
export async function PUT(req: NextRequest) { return VendorController.updateAvailability(req); }