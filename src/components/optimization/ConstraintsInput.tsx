import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptimization } from '../../contexts/OptimizationContext';

interface ConstraintOption {
  key: keyof typeof defaultConstraints;
  label: string;
  description: string;
}

const defaultConstraints = {
  enforceMaxHours: true,
  enforceAvailability: true,
  enforceSkillMatch: true,
  minimizeOvertime: false,
  balanceWorkload: false,
  respectConsecutiveDaysOff: false,
};

const constraintOptions: ConstraintOption[] = [
  {
    key: 'enforceMaxHours',
    label: 'Enforce Maximum Hours',
    description: 'Workers cannot exceed their maximum hours per week',
  },
  {
    key: 'enforceAvailability',
    label: 'Enforce Availability',
    description: 'Workers can only be assigned during their available time slots',
  },
  {
    key: 'enforceSkillMatch',
    label: 'Enforce Skill/Group Match',
    description: 'Workers can only be assigned to shifts matching their groups',
  },
  {
    key: 'minimizeOvertime',
    label: 'Minimize Overtime',
    description: 'Prefer regular hours over overtime when possible',
  },
  {
    key: 'balanceWorkload',
    label: 'Balance Workload',
    description: 'Distribute work evenly across workers',
  },
  {
    key: 'respectConsecutiveDaysOff',
    label: 'Respect Consecutive Days Off',
    description: 'Try to give workers consecutive days off when possible',
  },
];

export function ConstraintsInput() {
  const navigate = useNavigate();
  const { constraints, setConstraints } = useOptimization();

  const handleToggle = (key: keyof typeof defaultConstraints) => {
    setConstraints({
      ...constraints,
      [key]: !constraints[key],
    });
  };

  const handleReset = () => {
    if (window.confirm('Reset all constraints to default values?')) {
      setConstraints(defaultConstraints);
    }
  };

  return (
    <div>
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/inputs')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inputs
        </Button>
        <h1 className="text-3xl font-bold">Constraints & Rules</h1>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Configure Optimization Constraints</h2>
            <p className="text-neutral-600 text-sm mt-1">
              Select which rules the optimization should follow
            </p>
          </div>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>

        <div className="space-y-4">
          {constraintOptions.map((option) => {
            const isEnabled = constraints[option.key];
            const isHardConstraint = ['enforceMaxHours', 'enforceAvailability', 'enforceSkillMatch'].includes(option.key);

            return (
              <div
                key={option.key}
                className={`border rounded-lg p-4 transition-colors ${
                  isEnabled
                    ? isHardConstraint
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-green-50 border-green-200'
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(option.key)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">
                        {option.label}
                      </span>
                      {isHardConstraint && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Hard Constraint
                        </span>
                      )}
                      {!isHardConstraint && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Soft Constraint
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About Constraints</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              <strong>Hard Constraints:</strong> Must be satisfied for a valid solution
            </li>
            <li>
              <strong>Soft Constraints:</strong> Optimization goals that improve solution quality
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
