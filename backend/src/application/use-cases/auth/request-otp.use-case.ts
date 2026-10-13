import { OtpSessionRepository } from '../../../domain/repositories/otp-session.repository';
import { config } from '../../../../lib/config';
import crypto from 'crypto';

export class RequestOtpUseCase {
  constructor(private otpSessionRepo: OtpSessionRepository) {}

  async execute(phoneNumber: string) {
    // Generate code: '123456' for dev/testing, random 6-digits for production
    const otpCode = config.NODE_ENV === 'production'
      ? crypto.randomInt(100000, 1000000).toString()
      : '123456';

    const expiryMins = config.OTP_EXPIRY_MINS || 5;
    const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000);

    // Save OtpSession to database
    const otpSession = await this.otpSessionRepo.create({
      phone: phoneNumber,
      code: otpCode,
      expiresAt,
    });

    console.log(`[RequestOtpUseCase] Created OTP Session for Phone: ${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-2)}, Session ID: ${otpSession.id}`);

    return {
      success: true,
      sessionId: otpSession.id,
    };
  }
}
