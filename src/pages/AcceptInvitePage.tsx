import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { inviteService } from '../services/inviteService';
import { getDefaultRouteForRole } from '../utils/routeConfig';
import { ApiError } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import type { InviteDetails } from '../types/invite';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { loginWithResponse } = useAuth();

  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('This invite link is missing a token.');
      setLoading(false);
      return;
    }

    inviteService.getInviteDetails(token)
      .then(setDetails)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
          // Backend already provides a specific, accurate message for each
          // case (accepted / revoked / expired / not found).
          setLoadError(err.message);
        } else {
          setLoadError('Failed to load invite details. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await inviteService.acceptInvite(token, password);
      loginWithResponse(response);
      // Invites now create managers as well as employees, so land wherever the
      // new account's role belongs rather than assuming the employee portal.
      navigate(getDefaultRouteForRole(response.user.role));
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to accept invite. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Join Your Team</CardTitle>
          {details && (
            <CardDescription className="text-center">
              You're joining {details.businessName} as {details.employeeFirstName} {details.employeeLastName}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-center text-sm text-gray-600">Loading invite...</p>
          )}

          {!loading && loadError && (
            <Alert variant="destructive">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          {!loading && details && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input id="email" type="email" value={details.email} disabled />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Setting up your account...' : 'Accept Invite & Sign In'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
