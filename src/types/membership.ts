import { UserRole } from './auth';

export enum MembershipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Someone with access to the current business.
 *
 * The owner and the managers arrive in one list. `isOwner` separates them:
 * an owner's ADMIN access is derived from owning the account, so it can't be
 * changed or revoked here, while managers are explicit per-business grants.
 */
export interface BusinessMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: MembershipStatus;
  isOwner: boolean;
}

export interface BusinessMembersListResponse {
  members: BusinessMember[];
}

export interface AddBusinessMemberRequest {
  email: string;
  role?: UserRole;
}

export interface UpdateBusinessMemberRequest {
  role: UserRole;
}

export interface InviteManagerRequest {
  email: string;
  firstName: string;
  lastName: string;
}
