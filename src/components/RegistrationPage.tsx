import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import { getDefaultRouteForRole } from '../utils/routeConfig';

interface RegistrationFormData {
  // Step 1: Profile
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Step 2: Business
  businessName: string;
  industry: string;
  numberOfEmployees: string;
  role: string;

  // Step 3: Survey (Optional)
  howHeard: string;
  primaryGoal: string;
  additionalNotes: string;
}

const INDUSTRIES = [
  'Retail',
  'Restaurant',
  'Healthcare',
  'Manufacturing',
  'Hospitality',
  'Other',
];

const EMPLOYEE_COUNTS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
];

const ROLES = [
  'Owner',
  'Manager',
  'HR',
  'Operations',
  'Other',
];

const HOW_HEARD_OPTIONS = [
  'Search Engine',
  'Social Media',
  'Referral',
  'Advertisement',
  'Other',
];

const PRIMARY_GOALS = [
  'Optimize labor costs',
  'Improve scheduling efficiency',
  'Reduce overtime',
  'Better forecast demand',
  'Compliance management',
  'Other',
];

export function RegistrationPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    industry: '',
    numberOfEmployees: '',
    role: '',
    howHeard: '',
    primaryGoal: '',
    additionalNotes: '',
  });

  const updateField = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // Password validation criteria
  const passwordValidation = useMemo(() => {
    const password = formData.password;
    return {
      hasMinLength: password.length >= 8,
      hasUpperAndLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*]/.test(password),
    };
  }, [formData.password]);

  const validateStep1 = (): boolean => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return false;
    }
    if (!formData.industry) {
      setError('Please select your industry');
      return false;
    }
    if (!formData.numberOfEmployees) {
      setError('Please select number of employees');
      return false;
    }
    if (!formData.role) {
      setError('Please select your role');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');

    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSkip = () => {
    handleSubmit();
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      // Register the user
      await authService.register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        businessName: formData.businessName,
      });

      // Now log in the user with the same credentials
      // This will properly update the AuthContext state
      await login({
        email: formData.email,
        password: formData.password,
      });

      // Navigate to default route for user role
      // Wait a tiny bit for context to update
      setTimeout(() => {
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const defaultRoute = getDefaultRouteForRole(userData.role);
          navigate(defaultRoute);
        } else {
          navigate('/');
        }
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step < currentStep
                    ? 'bg-black text-white'
                    : step === currentStep
                    ? 'bg-black text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {step < currentStep ? <Check className="w-5 h-5" /> : step}
              </div>
              <div className="text-xs mt-1 text-gray-600">
                {step === 1 ? 'Profile' : step === 2 ? 'Business' : 'Survey'}
              </div>
            </div>
            {index < 2 && (
              <div
                className={`w-16 h-0.5 mx-2 mb-5 ${
                  step < currentStep ? 'bg-black' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStep1 = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personal Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">
              First Name
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium">
              Last Name
            </label>
            <Input
              id="lastName"
              type="text"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
            disabled={isLoading}
          />
          {formData.password && (
            <div className="mt-1.5 text-xs space-y-1">
              <p className="text-neutral-600 font-medium">Password must contain:</p>
              <div className="space-y-1">
                <div className={`flex items-center gap-1.5 ${passwordValidation.hasMinLength ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation.hasMinLength ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordValidation.hasUpperAndLower ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation.hasUpperAndLower ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>At least one uppercase and one lowercase letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation.hasNumber ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>At least one number</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordValidation.hasSpecialChar ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>At least one special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            required
            disabled={isLoading}
          />
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="text-xs text-red-600 mt-1">
              Passwords do not match
            </p>
          )}
        </div>

        <Button
          onClick={handleNext}
          className="w-full bg-gray-500 hover:bg-gray-600"
          disabled={isLoading}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  };

  const renderStep2 = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Business Information</h3>

        <div className="space-y-2">
          <label htmlFor="businessName" className="text-sm font-medium">
            Business Name
          </label>
          <Input
            id="businessName"
            type="text"
            placeholder="Enter your business name"
            value={formData.businessName}
            onChange={(e) => updateField('businessName', e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="industry" className="text-sm font-medium">
            Industry
          </label>
          <Select
            value={formData.industry}
            onValueChange={(value) => updateField('industry', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="numberOfEmployees" className="text-sm font-medium">
            Number of Employees
          </label>
          <Select
            value={formData.numberOfEmployees}
            onValueChange={(value) => updateField('numberOfEmployees', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employee count" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEE_COUNTS.map((count) => (
                <SelectItem key={count} value={count}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium">
            Your Role
          </label>
          <Select
            value={formData.role}
            onValueChange={(value) => updateField('role', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleNext}
            className="w-full bg-gray-500 hover:bg-gray-600"
            disabled={isLoading}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Help us serve you better</h3>
          <p className="text-sm text-gray-600 mt-1">Optional - You can skip this step</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="howHeard" className="text-sm font-medium">
            How did you hear about us?
          </label>
          <Select
            value={formData.howHeard}
            onValueChange={(value) => updateField('howHeard', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {HOW_HEARD_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="primaryGoal" className="text-sm font-medium">
            What's your primary goal for using this tool?
          </label>
          <Select
            value={formData.primaryGoal}
            onValueChange={(value) => updateField('primaryGoal', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your primary goal" />
            </SelectTrigger>
            <SelectContent>
              {PRIMARY_GOALS.map((goal) => (
                <SelectItem key={goal} value={goal}>
                  {goal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="additionalNotes" className="text-sm font-medium">
            Additional notes or requirements (optional)
          </label>
          <textarea
            id="additionalNotes"
            placeholder="Tell us anything else you'd like us to know..."
            value={formData.additionalNotes}
            onChange={(e) => updateField('additionalNotes', e.target.value)}
            disabled={isLoading}
            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Complete Registration'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleBack}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleSkip}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Skip
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Labor Management System</CardTitle>
          <CardDescription className="text-center">
            Create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepIndicator()}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
