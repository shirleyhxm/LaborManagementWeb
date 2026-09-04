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
  /**
   * When the business is open on an ordinary day ("HH:mm").
   *
   * Schedule generation covers this window, so it bounds every shift that can be
   * created. Resolved server-side: generation falls back to these whenever a date
   * carries no explicit hours, which is the normal case.
   */
  defaultOpenTime: string;
  defaultCloseTime: string;
}

export interface CreateBusinessRequest {
  name: string;
  settings?: Partial<BusinessSettings>;
}

export interface UpdateBusinessRequest {
  name?: string;
  settings?: Partial<BusinessSettings>;
}
