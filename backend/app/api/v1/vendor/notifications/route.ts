import { NextRequest } from 'next/server';
import { VendorController } from '../../../../../src/presentation/controllers/vendor.controller';

export async function GET(req: NextRequest) { return VendorController.getNotifications(req); }