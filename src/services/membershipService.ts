import { api } from './api';
import { UserRole } from '../types/auth';
import type {
  BusinessMember,
  BusinessMembersListResponse,
  AddBusinessMemberRequest,
  UpdateBusinessMemberRequest,
  InviteManagerRequest,
} from '../types/membership';

/**
 * Manager access for a business. All of these are owner-only on the backend —
 * a manager calling them gets a 403.
 */
export const membershipService = {
  /**
   * Everyone with access to this business: the owner first, then managers.
   */
  async getMembers(businessId: string): Promise<BusinessMember[]> {
    const response = await api.get<BusinessMembersListResponse>(
      `/businesses/${businessId}/members`
    );
    return response.members ?? [];
  },

  /**
   * Grant an existing user manager access, by email. The backend 404s if no
   * account matches, since a grant needs someone to grant it to.
   */
  async addMember(
    businessId: string,
    email: string,
    role: UserRole = UserRole.MANAGER
  ): Promise<BusinessMember> {
    return api.post<BusinessMember, AddBusinessMemberRequest>(
      `/businesses/${businessId}/members`,
      { email, role }
    );
  },

  /**
   * Invite someone with no account yet to manage this business. Returns a
   * link they use to set a password; accepting creates the account already
   * scoped to this business.
   */
  async inviteManager(
    businessId: string,
    email: string,
    firstName: string,
    lastName: string
  ): Promise<{ inviteLink: string }> {
    return api.post<{ inviteLink: string }, InviteManagerRequest>(
      `/businesses/${businessId}/members/invite`,
      { email, firstName, lastName }
    );
  },

  async updateMemberRole(
    businessId: string,
    userId: string,
    role: UserRole
  ): Promise<BusinessMember> {
    return api.put<BusinessMember, UpdateBusinessMemberRequest>(
      `/businesses/${businessId}/members/${userId}`,
      { role }
    );
  },

  async removeMember(businessId: string, userId: string): Promise<void> {
    return api.delete<void>(`/businesses/${businessId}/members/${userId}`);
  },
};
