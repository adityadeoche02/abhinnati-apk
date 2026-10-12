import { NextRequest } from 'next/server';
import { VendorController } from '../../../../../src/presentation/controllers/vendor.controller';

export async function POST(req: NextRequest) { return VendorController.blockDate(req); }
export async function DELETE(req: NextRequest) { return VendorController.unblockDate(req); }