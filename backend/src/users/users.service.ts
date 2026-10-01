import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

import { User, ProfileStage } from './entities/user.entity';
import { UserPhoto } from './entities/user-photo.entity';
import { ProfileView } from './entities/profile-view.entity';
import { CompleteStage1Dto, PartnerPreferencesDto } from './dto/complete-profile.dto';
import { UploadPhotoBase64Dto } from './dto/upload-photo-base64.dto';
import {
  decodeBase64Image,
  multerFileFromBuffer,
} from '../common/utils/image-buffer.util';
import { AuditService } from '../audits/audits.service';
import { AccountActivityName } from '../audits/audit.constants';
import { ageFromDateOfBirth, MIN_AGE, PartnerPreferences } from './profile-options';
import { toProfileSummary } from './profile-summary';
import { REFERRAL_BONUS_DAYS } from '../subscriptions/subscription.constants';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private s3: AWS.S3;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPhoto)
    private readonly photoRepository: Repository<UserPhoto>,
    @InjectRepository(ProfileView)
    private readonly profileViewRepository: Repository<ProfileView>,
    private readonly auditService: AuditService,
  ) {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1',
    });
  }

  // ─── Stage 1: Matrimony profile ─────────────────────────────────────────

  async completeStage1(userId: string, dto: CompleteStage1Dto): Promise<User> {
    const user = await this.findById(userId);
    const previousReferral = user.referredByCode;

    const age = ageFromDateOfBirth(dto.dateOfBirth);
    if (age === null || age < MIN_AGE) {
      throw new BadRequestException(`You must be at least ${MIN_AGE} years old`);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing && existing.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Generate referral code if not already set
    if (!user.referralCode) {
      user.referralCode = randomBytes(3).toString('hex').toUpperCase(); // 6-char hex
    }

    const { referredByCode, email, partnerPreferences, ...profile } = dto;

    Object.assign(user, profile, {
      age,
      hasChildren: dto.maritalStatus === 'never_married' ? null : dto.hasChildren ?? null,
      ...(email ? { email } : {}),
      ...(partnerPreferences ? { partnerPreferences: this.cleanPreferences(partnerPreferences) } : {}),
      profileStage: Math.max(user.profileStage, ProfileStage.STAGE1_COMPLETE),
    });

    const canApplyReferral = !!referredByCode && !previousReferral;
    if (canApplyReferral) user.referredByCode = referredByCode!.toUpperCase();

    let saved = await this.userRepository.save(user);

    if (canApplyReferral) {
      const applied = await this.applyReferralBonus(userId, referredByCode!);
      if (applied) saved = await this.findById(userId);
    }

    return saved;
  }

  async updatePartnerPreferences(
    userId: string,
    prefs: PartnerPreferencesDto,
  ): Promise<{ partnerPreferences: PartnerPreferences }> {
    const partnerPreferences = this.cleanPreferences(prefs);
    await this.userRepository.update(userId, { partnerPreferences });
    return { partnerPreferences };
  }

  async updateContactPrivacy(
    userId: string,
    showContactToConnections: boolean,
  ): Promise<{ showContactToConnections: boolean }> {
    await this.userRepository.update(userId, { showContactToConnections });
    return { showContactToConnections };
  }

  private cleanPreferences(prefs: PartnerPreferencesDto): PartnerPreferences {
    const out: PartnerPreferences = { ...prefs };
    if (out.minAge && out.maxAge && out.minAge > out.maxAge) {
      [out.minAge, out.maxAge] = [out.maxAge, out.minAge];
    }
    if (out.minHeightCm && out.maxHeightCm && out.minHeightCm > out.maxHeightCm) {
      [out.minHeightCm, out.maxHeightCm] = [out.maxHeightCm, out.minHeightCm];
    }
    return out;
  }

  // ─── Referral: both members get extra free premium days ──────────────────

  private extendPremium(user: User, days: number): Date {
    const now = Date.now();
    const base = Math.max(
      now,
      user.trialEndsAt ? new Date(user.trialEndsAt).getTime() : 0,
      user.subscriptionExpiresAt && (user.subscriptionTier ?? 0) > 0
        ? new Date(user.subscriptionExpiresAt).getTime()
        : 0,
    );
    return new Date(base + days * 24 * 60 * 60 * 1000);
  }

  private async applyReferralBonus(newUserId: string, code: string): Promise<boolean> {
    const referrer = await this.userRepository.findOne({
      where: { referralCode: code.trim().toUpperCase() },
    });
    if (!referrer || referrer.id === newUserId) return false;
    const newUser = await this.findById(newUserId);

    await this.userRepository.update(referrer.id, {
      trialEndsAt: this.extendPremium(referrer, REFERRAL_BONUS_DAYS),
    });
    await this.userRepository.update(newUserId, {
      trialEndsAt: this.extendPremium(newUser, REFERRAL_BONUS_DAYS),
    });
    return true;
  }

  // ─── Profile visitors ────────────────────────────────────────────────────

  async recordProfileView(viewerId: string, viewedId: string): Promise<void> {
    if (viewerId === viewedId) return;
    await this.profileViewRepository
      .createQueryBuilder()
      .insert()
      .into(ProfileView)
      .values({ viewerId, viewedId, viewedAt: new Date() })
      .orUpdate(['viewedAt'], ['viewerId', 'viewedId'])
      .execute();
  }

  async getProfileVisitors(userId: string, page = 1, limit = 20) {
    const [views, total] = await this.profileViewRepository.findAndCount({
      where: { viewedId: userId },
      relations: ['viewer'],
      order: { viewedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const users = await Promise.all(
      views
        .filter((v) => v.viewer && v.viewer.isActive && !v.viewer.isBanned)
        .map(async (v) => {
          const photo = await this.photoRepository.findOne({
            where: { userId: v.viewerId },
            order: { order: 'ASC' },
          });
          return {
            ...toProfileSummary(v.viewer, photo ? this.withCacheBuster(photo.url, photo.id) : null),
            viewedAt: v.viewedAt,
          };
        }),
    );

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async ensureReferralCode(userId: string): Promise<{ referralCode: string }> {
    const user = await this.findById(userId);
    if (!user.referralCode) {
      user.referralCode = randomBytes(3).toString('hex').toUpperCase();
      await this.userRepository.save(user);
    }
    return { referralCode: user.referralCode };
  }

  // ─── Stage 2: Photos ────────────────────────────────────────────────────

  async uploadPhotoFromBase64(
    userId: string,
    dto: UploadPhotoBase64Dto,
  ): Promise<UserPhoto> {
    const { buffer } = decodeBase64Image(dto.image);
    const mimeType =
      dto.mimeType?.startsWith('image/') ? dto.mimeType : 'image/jpeg';
    const ext =
      mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const file = multerFileFromBuffer(
      buffer,
      mimeType,
      dto.fileName || `photo.${ext}`,
    );
    return this.uploadPhoto(userId, file, dto.order);
  }

  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
    order: number,
  ): Promise<UserPhoto> {
    const user = await this.findById(userId);

    if (user.profileStage < ProfileStage.STAGE1_COMPLETE) {
      throw new BadRequestException('Complete Stage 1 before uploading photos');
    }

    const existingPhotos = await this.photoRepository.find({
      where: { userId },
    });

    if (existingPhotos.length >= 6) {
      throw new BadRequestException('Maximum 6 photos allowed');
    }

    // Upload to S3
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket || !process.env.AWS_ACCESS_KEY_ID) {
      this.logger.error('AWS S3 is not configured (missing bucket or access key)');
      throw new BadRequestException(
        'Photo storage is not configured on the server. Contact support.',
      );
    }

    const contentType =
      file.mimetype?.startsWith('image/') ? file.mimetype : 'image/jpeg';
    const s3Key = `photos/${userId}/${uuidv4()}-${file.originalname}`;

    let uploadResult: AWS.S3.ManagedUpload.SendData;
    try {
      uploadResult = await this.s3
        .upload({
          Bucket: bucket,
          Key: s3Key,
          Body: file.buffer,
          ContentType: contentType,
        })
        .promise();
    } catch (err: any) {
      this.logger.error(
        `S3 upload failed user=${userId} code=${err?.code} message=${err?.message}`,
      );
      throw new BadRequestException(
        err?.code === 'NoSuchBucket'
          ? 'Photo storage bucket is missing on the server.'
          : err?.code === 'InvalidAccessKeyId' || err?.code === 'SignatureDoesNotMatch'
            ? 'Photo storage credentials are invalid on the server.'
            : 'Could not save photo. Try again.',
      );
    }

    const photo = this.photoRepository.create({
      userId,
      url: uploadResult.Location,
      s3Key,
      order,
      isPrimary: existingPhotos.length === 0,
    });

    const savedPhoto = await this.photoRepository.save(photo);

    // Update profileStage after first photo
    const totalPhotos = existingPhotos.length + 1;
    if (totalPhotos >= 1 && user.profileStage === ProfileStage.STAGE1_COMPLETE) {
      user.profileStage = ProfileStage.STAGE2_COMPLETE;
      await this.userRepository.save(user);
    }

    return {
      ...savedPhoto,
      url: this.withCacheBuster(savedPhoto.url, savedPhoto.id),
    };
  }

  async getUserPhotos(userId: string): Promise<UserPhoto[]> {
    const photos = await this.photoRepository.find({
      where: { userId },
      order: { order: 'ASC' },
    });

    return photos.map((photo) => ({
      ...photo,
      url: this.withCacheBuster(photo.url, photo.id),
    }));
  }

  async deletePhoto(userId: string, photoId: string): Promise<void> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId, userId },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    // Delete from S3
    await this.s3
      .deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: photo.s3Key,
      })
      .promise();

    await this.photoRepository.remove(photo);
  }

  async reorderPhotos(
    userId: string,
    photoOrders: { photoId: string; order: number }[],
  ): Promise<void> {
    for (const item of photoOrders) {
      await this.photoRepository.update(
        { id: item.photoId, userId },
        { order: item.order },
      );
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private withCacheBuster(url: string, version: string): string {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${version}`;
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastActiveAt: new Date() });
  }

  // ─── Hide profile ─────────────────────────────────────────────────────────

  async hideProfile(userId: string, months: 1 | 2 | 3): Promise<{ hiddenUntil: Date }> {
    const hiddenUntil = new Date();
    hiddenUntil.setMonth(hiddenUntil.getMonth() + months);
    await this.userRepository.update(userId, { hiddenUntil });
    return { hiddenUntil };
  }

  async unhideProfile(userId: string): Promise<void> {
    await this.userRepository.update(userId, { hiddenUntil: null });
  }

  async acknowledgeWarning(userId: string): Promise<{ cleared: boolean }> {
    await this.userRepository.update(userId, {
      accountWarningMessage: null,
      accountWarningAt: null,
    });
    return { cleared: true };
  }

  // ─── Delete account (soft delete + anonymise) ────────────────────────────

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);

    // Anonymise PII before soft-deleting
    await this.userRepository.update(userId, {
      name: 'Deleted User',
      email: null,
      phone: null,
      googleId: null,
      facebookId: null,
      appleId: null,
      bio: null,
      aboutFamily: null,
      birthTime: null,
      birthPlace: null,
      employer: null,
      partnerPreferences: null,
      isActive: false,
    });

    // Delete photos from S3
    const photos = await this.photoRepository.find({ where: { userId } });
    for (const photo of photos) {
      try {
        await this.s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: photo.s3Key,
        }).promise();
      } catch { /* best effort */ }
    }
    await this.photoRepository.delete({ userId });

    // Soft-delete the user record (sets deletedAt)
    await this.userRepository.softDelete(userId);

    await this.auditService.logAccount({
      forUser: userId,
      byUser: userId,
      activityName: AccountActivityName.ACCOUNT_DELETED_SELF,
      affectedDataName: 'Account',
      fromValue: 'active',
      toValue: 'deleted',
      notes: [
        user.email ? `email=${user.email}` : null,
        user.phone ? `phone=${user.phone}` : null,
      ]
        .filter(Boolean)
        .join(' | ') || null,
    });

    return { message: 'Account deleted' };
  }
}
