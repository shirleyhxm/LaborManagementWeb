import type { AuthResponse } from '../types/auth';
import type { InviteDetails } from '../types/invite';
import { api } from './api';

export const inviteService = {
  async getInviteDetails(token: string): Promise<InviteDetails> {
    return api.get<InviteDetails>(`/auth/invite/${token}`);
  },

  async acceptInvite(token: string, password: string): Promise<AuthResponse> {
    return api.post<AuthResponse>(`/auth/invite/${token}/accept`, { password });
  },
};
