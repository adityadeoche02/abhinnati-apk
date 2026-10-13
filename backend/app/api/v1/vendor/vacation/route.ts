import { NextRequest } from 'next/server';
import { VendorController } from '../../../../../src/presentation/controllers/vendor.controller';

export async function PUT(req: NextRequest) { return VendorController.updateVacation(req); }
export async function PATCH(req: NextRequest) { return VendorController.updateVacation(req); }