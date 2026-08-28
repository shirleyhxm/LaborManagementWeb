import { api } from './api';
import { UserRole } from '../types/auth';
import type {
  BusinessMember,
  BusinessMembersListResponse,
  AddBusinessMemberRequest,
  UpdateBusinessMemberRequest,
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
