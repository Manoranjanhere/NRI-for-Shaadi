import { AuthService } from './auth.service';
import { FirebaseAdminService } from '../common/services/firebase-admin.service';

describe('AuthService', () => {
  const userRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    find: jest.fn(),
  } as any;
  const banQuery = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const banRepository = { findOne: jest.fn(), createQueryBuilder: jest.fn(() => banQuery) } as any;
  const resetRepository = { findOne: jest.fn(), save: jest.fn() } as any;
  const jwtService = { sign: jest.fn(() => 'jwt-token') } as any;
  const mailService = { sendNewUserAlertToAdmins: jest.fn() } as any;
  const firebaseAdmin = {
    verifyIdToken: jest.fn(),
  } as unknown as FirebaseAdminService;
  const auditService = {
    logLogin: jest.fn(),
    logAccount: jest.fn(),
    logReport: jest.fn(),
    logAdminAction: jest.fn(),
    logPayment: jest.fn(),
  } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    banRepository.findOne.mockResolvedValue(null);
    banQuery.getMany.mockResolvedValue([]);
    service = new AuthService(
      userRepository,
      banRepository,
      resetRepository,
      jwtService,
      mailService,
      firebaseAdmin,
      auditService,
    );
  });

  it('allows a phone number that is not banned', async () => {
    const result = await service.checkPhoneForAuth({ phone: '+919999999999' });

    expect(result).toEqual({ message: 'Phone number can receive OTP' });
    expect(banRepository.createQueryBuilder).toHaveBeenCalled();
  });

  it('verifies Firebase phone auth and returns JWT', async () => {
    (firebaseAdmin.verifyIdToken as jest.Mock).mockResolvedValue({
      phone_number: '+919999999999',
    });
    userRepository.findOne.mockResolvedValue(null);
    const newUser = { id: 'user-1', phone: '+919999999999', isActive: true, isBanned: false, profileStage: 0 };
    userRepository.create.mockReturnValue(newUser);
    userRepository.save.mockResolvedValue(newUser);

    const result = await service.verifyPhoneAuth({ idToken: 'firebase-id-token' });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.isNewUser).toBe(true);
    expect(firebaseAdmin.verifyIdToken).toHaveBeenCalledWith('firebase-id-token');
  });
});
