import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Calendar,
  TrendingUp,
  Settings,
  Bell,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface OnboardingWalkthroughProps {
  onClose: () => void;
}

const steps = [
  {
    id: 1,
    title: "Welcome to ShiftOptimizer",
    description:
      "Smart scheduling for retail and restaurant businesses",
    icon: Calendar,
    content: (
      <div className="space-y-4">
        <p className="text-neutral-600">
          ShiftOptimizer helps you create optimal schedules that
          balance labor costs, employee satisfaction, and
          business needs.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-neutral-200 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm">
              Automated scheduling based on multiple objectives
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm">
              Sales forecast integration
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm">
              Constraint and compliance management
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm">
              Real-time alerts and adjustments
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Dashboard Overview",
    description: "Monitor key metrics at a glance",
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <p className="text-neutral-600">
          The Dashboard gives you a quick overview of your
          scheduling performance with key metrics:
        </p>
        <div className="space-y-3">
          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-blue-700 bg-blue-50"
              >
                Labor Cost
              </Badge>
            </div>
            <p className="text-sm text-neutral-600">
              Track weekly and monthly labor costs against your
              budget
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-green-700 bg-green-50"
              >
                Coverage
              </Badge>
            </div>
            <p className="text-sm text-neutral-600">
              See how well your schedule meets staffing
              requirements
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-amber-700 bg-amber-50"
              >
                Conflicts
              </Badge>
            </div>
            <p className="text-sm text-neutral-600">
              Identify and resolve scheduling conflicts quickly
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Creating Schedules",
    description: "Manual and automated scheduling options",
    icon: Calendar,
    content: (
      <div className="space-y-4">
        <p className="text-neutral-600">
          Create schedules with drag-and-drop or let AI optimize
          automatically:
        </p>
        <div className="space-y-3">
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
            <p className="text-sm mb-2">
              <strong className="text-blue-900">
                Auto-Schedule:
              </strong>
            </p>
            <p className="text-sm text-blue-800">
              Choose an optimization objective (minimize cost,
              maximize sales coverage, maximize fairness, etc.)
              and let the AI create an optimal schedule
              instantly.
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-4">
            <p className="text-sm mb-2">
              <strong>Manual Scheduling:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Drag employees from the sidebar onto shift slots
              in the calendar. The system will alert you to
              conflicts, understaffing, or overtime issues in
              real-time.
            </p>
          </div>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3">
          <p className="text-xs text-neutral-600">
            <strong>Tip:</strong> Use auto-schedule as a
            starting point, then make manual adjustments as
            needed.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Sales Forecasting",
    description: "Align staffing with demand",
    icon: TrendingUp,
    content: (
      <div className="space-y-4">
        <p className="text-neutral-600">
          ShiftOptimizer integrates sales forecasting to help
          you staff optimally:
        </p>
        <div className="border border-neutral-200 rounded-lg p-4">
          <div className="h-32 bg-neutral-100 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-600">
            View historical sales data alongside forecasts and
            current staffing levels. The system will recommend
            staffing adjustments to match expected demand.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-green-200 bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-800">
              <strong>High Demand Days:</strong> Get alerts when
              forecasts spike
            </p>
          </div>
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Low Traffic:</strong> Reduce costs on
              slower days
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: "Constraints & Rules",
    description: "Set up labor requirements and compliance",
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p className="text-neutral-600">
          Configure all your scheduling requirements in one
          place:
        </p>
        <div className="space-y-3">
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>Budget Constraints:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Set weekly and monthly labor budgets with hard or
              soft limits
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>Hours Rules:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Define max hours, overtime limits, rest periods,
              and contracted hours per employee
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>Compliance:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Enable FLSA rules, meal breaks, minor labor laws,
              and custom regulations
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>Priorities:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Set the order of importance for different
              scheduling objectives
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: "Real-Time Alerts",
    description: "Handle changes and emergencies",
    icon: Bell,
    content: (
      <div className="space-y-4">
        <p className="text-neutral-600">
          Stay on top of schedule changes with instant
          notifications:
        </p>
        <div className="space-y-3">
          <div className="border border-red-200 bg-red-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-red-700 bg-red-100"
              >
                Critical
              </Badge>
            </div>
            <p className="text-sm text-red-900">
              Employee call-ins and coverage gaps trigger
              immediate alerts with quick-action buttons to find
              replacements
            </p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-amber-700 bg-amber-100"
              >
                Important
              </Badge>
            </div>
            <p className="text-sm text-amber-900">
              Overtime warnings, understaffing alerts, and
              forecast changes help you make proactive
              adjustments
            </p>
          </div>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3">
          <p className="text-xs text-neutral-600">
            Configure your notification preferences to receive
            alerts via in-app, email, or SMS for critical
            issues.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: "Employee Portal",
    description: "Empower your team",
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-neutral-600">
          Employees can access their schedules and make requests
          on any device:
        </p>
        <div className="space-y-3">
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>View Schedules:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Mobile-friendly access to current and upcoming
              shifts
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>Request Time Off:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Submit vacation and sick day requests with
              approval tracking
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>Shift Swaps:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Request swaps with coworkers, pending manager
              approval
            </p>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-sm mb-1">
              <strong>Set Availability:</strong>
            </p>
            <p className="text-sm text-neutral-600">
              Update preferred hours and scheduling preferences
            </p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            Toggle between Manager View and Employee View using
            the switch in the top right corner.
          </p>
        </div>
      </div>
    ),
  },
];

export function OnboardingWalkthrough({
  onClose,
}: OnboardingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            {step.title}
          </DialogTitle>
          <DialogDescription>
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Content */}
        <div className="py-4">{step.content}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-200">
          <Button variant="ghost" onClick={handleSkip}>
            Skip Tutorial
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNext} className="gap-2">
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Get Started
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 pt-2">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentStep
                  ? "bg-blue-600"
                  : idx < currentStep
                    ? "bg-blue-300"
                    : "bg-neutral-300"
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}