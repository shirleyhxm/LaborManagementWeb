import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Zap, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptimization } from '../../contexts/OptimizationContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { submitOptimization, pollOptimizationStatus } from '../../services/optimizationService';
import type { OptimizationRequestV2 } from '../../types/optimization';

const objectiveOptions = [
  {
    value: 'MINIMIZE_LABOR_COST',
    label: 'Minimize Labor Cost',
    description: 'Find the cheapest valid assignment',
    icon: '💰',
  },
  {
    value: 'MAXIMIZE_SALES',
    label: 'Maximize Coverage',
    description: 'Cover as much demand as possible',
    icon: '📊',
  },
  {
    value: 'BALANCED',
    label: 'Balance Workload',
    description: 'Distribute hours evenly among workers',
    icon: '⚖️',
  },
  {
    value: 'MAXIMIZE_FAIRNESS',
    label: 'Maximize Fairness',
    description: 'Ensure fair assignment distribution',
    icon: '🤝',
  }
];

export function OptimizeScreen() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusiness();
  const {
    demandMatrix,
    workers,
    constraints,
    objective,
    setObjective,
    setCurrentJobId,
    setCurrentJobStatus,
    setIsOptimizing,
    isOptimizing,
  } = useOptimization();

  const [selectedObjective, setSelectedObjective] = useState(objective);
  const [optimizationLog, setOptimizationLog] = useState<string[]>([]);

  // Check if all inputs are ready
  const isInputsReady = demandMatrix !== null && workers.length > 0 && currentBusiness !== null;

  const handleOptimize = async () => {
    if (!isInputsReady || !demandMatrix || !currentBusiness) {
      alert('Please complete all inputs before optimizing');
      return;
    }

    // Update global objective
    setObjective(selectedObjective);

    // Build optimization request
    const request: OptimizationRequestV2 = {
      demandMatrix,
      workers,
      constraints,
      objective: {
        primary: selectedObjective,
      },
    };

    setIsOptimizing(true);
    setOptimizationLog(['Starting optimization...']);

    try {
      // Submit job
      const jobResponse = await submitOptimization(currentBusiness.id, request);
      setCurrentJobId(jobResponse.jobId);
      setOptimizationLog(prev => [...prev, `Job submitted: ${jobResponse.jobId}`]);
      setOptimizationLog(prev => [...prev, jobResponse.message || 'Optimization queued']);

      // Poll for status
      const finalStatus = await pollOptimizationStatus(
        currentBusiness.id,
        jobResponse.jobId,
        2000,
        (status) => {
          // Progress callback
          setOptimizationLog(prev => [
            ...prev,
            `Status: ${status.status}${status.progress ? ` (${status.progress}%)` : ''}`,
          ]);
          setCurrentJobStatus(status);
        }
      );

      // Store final result
      setCurrentJobStatus(finalStatus);
      setOptimizationLog(prev => [...prev, 'Optimization complete!']);

      if (finalStatus.results?.isOptimal) {
        setOptimizationLog(prev => [...prev, `✓ Optimal solution found in ${finalStatus.results?.solveTimeMs}ms`]);
      } else {
        setOptimizationLog(prev => [...prev, `⚠ Solution status: ${finalStatus.solveStatus}`]);
      }

      // Navigate to results
      setTimeout(() => {
        navigate('/results');
      }, 1500);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setOptimizationLog(prev => [...prev, `❌ Error: ${errorMsg}`]);
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Optimize</h1>

      {/* Input Status Card */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Input Status</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {demandMatrix ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            <span className={demandMatrix ? 'text-green-700' : 'text-amber-700'}>
              Demand Matrix: {demandMatrix ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {workers.length > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            <span className={workers.length > 0 ? 'text-green-700' : 'text-amber-700'}>
              Workers: {workers.length > 0 ? `${workers.length} imported` : 'Not imported'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700">
              Constraints: Configured
            </span>
          </div>
        </div>
      </Card>

      {/* Objective Selector */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Optimization Objective</h2>
        <p className="text-neutral-600 text-sm mb-4">
          Choose what the optimizer should prioritize
        </p>

        <div className="space-y-3">
          {objectiveOptions.map((option) => (
            <label
              key={option.value}
              className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedObjective === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-neutral-200 hover:border-blue-300'
              }`}
            >
              <input
                type="radio"
                name="objective"
                value={option.value}
                checked={selectedObjective === option.value}
                onChange={(e) => setSelectedObjective(e.target.value)}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-neutral-900">{option.label}</div>
                  <div className="text-sm text-neutral-600">{option.description}</div>
                </div>
                {selectedObjective === option.value && (
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Optimize Button */}
      <Card className="p-6">
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleOptimize}
          disabled={!isInputsReady || isOptimizing}
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Find Optimal Assignment
            </>
          )}
        </Button>

        {!isInputsReady && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Inputs Required</p>
              <p className="text-sm">
                {!currentBusiness
                  ? 'Please select a business before optimizing'
                  : 'Please configure demand matrix and import workers before optimizing'}
              </p>
            </div>
          </div>
        )}

        {/* Optimization Log */}
        {optimizationLog.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Optimization Log</h3>
            <div className="bg-neutral-900 text-green-400 p-4 rounded font-mono text-sm max-h-60 overflow-y-auto">
              {optimizationLog.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
