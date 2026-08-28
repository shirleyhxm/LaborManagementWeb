import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { AlertCircle, Loader2, RefreshCw, Shield, Trash2, UserPlus } from "lucide-react";
import { membershipService } from "../services/membershipService";
import { useBusiness } from "../contexts/BusinessContext";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types/auth";
import type { BusinessMember } from "../types/membership";

/**
 * Manage who can access the current business.
 *
 * Only the account owner sees this. Admin access isn't assignable here — it
 * follows from owning the business — so the only thing granted or revoked on
 * this screen is manager access to this one location.
 */
export function TeamPanel() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();

  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [pendingRemoval, setPendingRemoval] = useState<BusinessMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const businessId = currentBusiness?.id;

  const loadMembers = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    setError(null);
    try {
      setMembers(await membershipService.getMembers(businessId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAdd = async () => {
    if (!businessId) return;
    const email = newEmail.trim();
    if (!email) {
      setAddError("Enter the email address of the person to add");
      return;
    }

    setIsSaving(true);
    setAddError(null);
    try {
      await membershipService.addMember(businessId, email, UserRole.MANAGER);
      setNewEmail("");
      setIsAddOpen(false);
      await loadMembers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add manager");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!businessId || !pendingRemoval) return;
    setIsRemoving(true);
    try {
      await membershipService.removeMember(businessId, pendingRemoval.userId);
      setPendingRemoval(null);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove manager");
      setPendingRemoval(null);
    } finally {
      setIsRemoving(false);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Select a business to manage its team.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // The backend enforces this too; hiding it here just avoids showing a
  // manager a screen where every action would 403.
  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Only the account owner can manage who has access to this business.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const managers = members.filter((m) => !m.isOwner);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Team access</CardTitle>
            <CardDescription>
              Who can work in <span className="font-medium">{currentBusiness.name}</span>. Managers
              see only the businesses you assign them to.
            </CardDescription>
          </div>
          <div className="flex gap-2" style={{ flexShrink: 0 }}>
            <Button variant="outline" size="sm" onClick={loadMembers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add manager
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading team…
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-neutral-900 truncate">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-sm text-neutral-500 truncate">{member.email}</div>
                  </div>

                  <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                    {member.isOwner ? (
                      <Badge className="bg-blue-50 border-blue-300 text-blue-700">
                        Owner · Admin
                      </Badge>
                    ) : (
                      <Badge className="bg-neutral-100 border-neutral-300 text-neutral-700">
                        Manager
                      </Badge>
                    )}

                    {member.isOwner ? (
                      <span className="text-xs text-neutral-400 w-9 text-center">—</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingRemoval(member)}
                        aria-label={`Remove ${member.firstName} ${member.lastName}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {managers.length === 0 && (
                <div className="py-8 text-center text-sm text-neutral-500">
                  No managers yet. Add one to let someone run this business without giving
                  them access to your other locations.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a manager</DialogTitle>
            <DialogDescription>
              They'll get access to {currentBusiness.name} only. They must already have an
              account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="manager-email">Email address</Label>
            <Input
              id="manager-email"
              type="email"
              value={newEmail}
              placeholder="manager@example.com"
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
            {addError && (
              <Alert className="bg-red-50 border-red-200 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingRemoval !== null} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove manager access?</DialogTitle>
            <DialogDescription>
              {pendingRemoval?.firstName} {pendingRemoval?.lastName} will lose access to{" "}
              {currentBusiness.name} immediately. Their account and any other businesses they
              manage are unaffected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRemoval(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button onClick={handleRemove} disabled={isRemoving}>
              {isRemoving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
