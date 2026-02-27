export interface Business {
  id: string;
  name: string;
  ownerId: string;
  subdomain?: string;
  plan: SubscriptionPlan;
  status: BusinessStatus;
  settings: BusinessSettings;
  maxEmployees: number;
  maxLocations: number;
  createdAt: string;
  subscriptionId?: string;
  billingEmail?: string;
  subscriptionExpiresAt?: string;
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum BusinessStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELLED = 'CANCELLED',
}

export interface BusinessSettings {
  timezone: string;
  currency: string;
  weekStartsOn: string;
  dateFormat: string;
}

export interface CreateBusinessRequest {
  name: string;
  settings?: Partial<BusinessSettings>;
}

export interface UpdateBusinessRequest {
  name?: string;
  settings?: Partial<BusinessSettings>;
}
