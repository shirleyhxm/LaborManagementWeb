import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { businessService } from '../services/businessService';
import type { Business } from '../types/business';

interface BusinessContextType {
  businesses: Business[];
  currentBusiness: Business | null;
  isLoading: boolean;
  switchBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
  createBusiness: (name: string) => Promise<Business>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const CURRENT_BUSINESS_KEY = 'current_business_id';

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load businesses when user is authenticated and auth is done loading
  useEffect(() => {
    // Wait for auth to finish loading
    if (isAuthLoading) {
      return;
    }

    if (isAuthenticated) {
      loadBusinesses();
    } else {
      setBusinesses([]);
      setCurrentBusiness(null);
      setIsLoading(false);
      localStorage.removeItem(CURRENT_BUSINESS_KEY);
    }
  }, [isAuthenticated, isAuthLoading]);

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      const data = await businessService.getMyBusinesses();
      setBusinesses(data);

      // Restore last selected business or select first one
      const savedBusinessId = localStorage.getItem(CURRENT_BUSINESS_KEY);
      const businessToSelect = savedBusinessId
        ? data.find(b => b.id === savedBusinessId) || data[0]
        : data[0];

      if (businessToSelect) {
        setCurrentBusiness(businessToSelect);
        localStorage.setItem(CURRENT_BUSINESS_KEY, businessToSelect.id);
      }
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchBusiness = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId);
    if (business) {
      setCurrentBusiness(business);
      localStorage.setItem(CURRENT_BUSINESS_KEY, businessId);

      // Optionally trigger a page reload or state refresh
      window.location.reload();
    }
  };

  const refreshBusinesses = async () => {
    await loadBusinesses();
  };

  const createBusiness = async (name: string): Promise<Business> => {
    const newBusiness = await businessService.createBusiness({ name });
    await refreshBusinesses();
    switchBusiness(newBusiness.id);
    return newBusiness;
  };

  const value: BusinessContextType = {
    businesses,
    currentBusiness,
    isLoading,
    switchBusiness,
    refreshBusinesses,
    createBusiness,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
