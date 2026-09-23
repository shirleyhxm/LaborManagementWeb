import { createContext, useContext, type ReactNode } from 'react';
import { useBusinessHoursState } from '../hooks/useBusinessHours';

type BusinessHoursContextType = ReturnType<typeof useBusinessHoursState>;

const BusinessHoursContext = createContext<BusinessHoursContextType | undefined>(undefined);

/**
 * One copy of the business's opening hours for the whole app.
 *
 * Shared rather than per-component on purpose: the editor and the schedule grid both read
 * these, and with a hook holding its own useState each got a private copy of the same
 * fetch. Saving new hours updated the editor's copy and left the grid drawing the old
 * ones - the shading only corrected itself on a reload.
 */
export function BusinessHoursProvider({ children }: { children: ReactNode }) {
  const value = useBusinessHoursState();
  return (
    <BusinessHoursContext.Provider value={value}>
      {children}
    </BusinessHoursContext.Provider>
  );
}

export function useBusinessHours(): BusinessHoursContextType {
  const context = useContext(BusinessHoursContext);
  if (context === undefined) {
    throw new Error('useBusinessHours must be used within a BusinessHoursProvider');
  }
  return context;
}
