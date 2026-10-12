import { NextRequest } from 'next/server';
import { VendorController } from '../../../../../src/presentation/controllers/vendor.controller';

export async function POST(req: NextRequest) { return VendorController.blockSlot(req); }
export async function DELETE(req: NextRequest) { return VendorController.unblockSlot(req); }