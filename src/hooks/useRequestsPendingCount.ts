import { useState, useEffect } from "react";
import { timeoffService } from "../services/timeoffService";
import { swapService } from "../services/swapService";
import { useBusiness } from "../contexts/BusinessContext";

// Lightweight count-only fetch for the sidebar notification badge - doesn't
// pull full request details, since all it needs to render is a number.
export function useRequestsPendingCount() {
  const { currentBusiness } = useBusiness();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentBusiness) {
      setCount(0);
      return;
    }

    let cancelled = false;

    Promise.all([
      timeoffService.getPendingTimeoffRequests(currentBusiness.id),
      swapService.getAllSwapRequests(currentBusiness.id),
    ])
      .then(([timeoffRequests, swapRequests]) => {
        if (cancelled) return;
        const pendingSwaps = swapRequests.filter(r => r.status === "PENDING_APPROVAL");
        setCount(timeoffRequests.length + pendingSwaps.length);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id]);

  return count;
}
