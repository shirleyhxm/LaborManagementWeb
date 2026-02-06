import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Upload, Download, Trash2, CheckCircle, XCircle, ArrowLeft, Plus, Edit, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOptimization } from '../../contexts/OptimizationContext';
import { importWorkersFromCsv } from '../../services/optimizationService';
import { employeeService } from '../../services/employeeService';
import type { WorkerInput, AvailabilitySlot } from '../../types/optimization';
import type { Employee, CreateEmployeeRequest } from '../../types/employee';

const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export function WorkersInput() {
  const navigate = useNavigate();
  const { workers, setWorkers } = useOptimization();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  // Employee state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Manual input state
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    hourlyRate: 15,
    overtimeRate: 22.5,
    groups: [] as string[],
    maxHoursPerWeek: 40,
    productivity: 1.0,
    availability: [] as AvailabilitySlot[],
  });
  const [groupInput, setGroupInput] = useState('');
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilitySlot>({
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
  });

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const loadedEmployees = await employeeService.getAllEmployees();
      setEmployees(loadedEmployees);

      // Convert to WorkerInput format for optimization context
      const workerInputs: WorkerInput[] = loadedEmployees.map(emp => ({
        name: emp.fullName,
        hourlyRate: emp.normalPayRate,
        groups: Array.from(emp.groups),
        maxHoursPerWeek: emp.contract.maxHoursPerWeek,
        productivity: emp.productivity,
        availability: emp.availability.map(a => ({
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      }));
      setWorkers(workerInputs);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportErrors([]);
    setImportSuccess(false);

    try {
      const csvContent = await file.text();
      const response = await importWorkersFromCsv(csvContent);

      if (response.errors.length > 0) {
        setImportErrors(response.errors);
      }

      if (response.workers.length > 0) {
        // Reload employees from backend after CSV import
        await loadEmployees();
        setImportSuccess(true);
      }
    } catch (error) {
      setImportErrors([`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v2/workers/template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'workers_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleClearWorkers = async () => {
    if (employees.length === 0) {
      return; // No-op if no employees
    }

    if (window.confirm(`Are you sure you want to delete all ${employees.length} employees? This cannot be undone.`)) {
      setIsSaving(true);
      try {
        // Delete all employees from backend
        await Promise.all(employees.map(emp => employeeService.deleteEmployee(emp.id)));

        // Reload employees list (will be empty)
        await loadEmployees();

        // Clear import status
        setImportSuccess(false);
        setImportErrors([]);
      } catch (error) {
        alert(`Failed to delete employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Manual input handlers
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      dateOfBirth: '',
      hourlyRate: 15,
      overtimeRate: 22.5,
      groups: [],
      maxHoursPerWeek: 40,
      productivity: 1.0,
      availability: [],
    });
    setGroupInput('');
    setAvailabilityForm({
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '17:00',
    });
    setEditingId(null);
    setShowManualForm(false);
  };

  const handleAddGroup = () => {
    if (groupInput.trim() && !formData.groups.includes(groupInput.trim())) {
      setFormData({
        ...formData,
        groups: [...formData.groups, groupInput.trim()],
      });
      setGroupInput('');
    }
  };

  const handleRemoveGroup = (group: string) => {
    setFormData({
      ...formData,
      groups: formData.groups.filter(g => g !== group),
    });
  };

  const handleAddAvailability = () => {
    if (!formData.availability.some(
      a => a.dayOfWeek === availabilityForm.dayOfWeek &&
           a.startTime === availabilityForm.startTime &&
           a.endTime === availabilityForm.endTime
    )) {
      setFormData({
        ...formData,
        availability: [...formData.availability, { ...availabilityForm }],
      });
    }
  };

  const handleRemoveAvailability = (index: number) => {
    setFormData({
      ...formData,
      availability: formData.availability.filter((_, i) => i !== index),
    });
  };

  const handleSaveWorker = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('Please enter first and last name');
      return;
    }
    if (!formData.dateOfBirth) {
      alert('Please enter date of birth');
      return;
    }
    if (formData.groups.length === 0) {
      alert('Please add at least one group/skill');
      return;
    }
    if (formData.availability.length === 0) {
      alert('Please add at least one availability slot');
      return;
    }

    setIsSaving(true);
    try {
      // Convert date from YYYY-MM-DD to dd/MM/yyyy format required by backend
      const [year, month, day] = formData.dateOfBirth.split('-');
      const formattedDate = `${day}/${month}/${year}`;

      if (editingId) {
        // Update existing employee
        await employeeService.updateEmployee(editingId, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          dateOfBirth: formattedDate,
          normalPayRate: formData.hourlyRate,
          overtimePayRate: formData.overtimeRate,
          productivity: formData.productivity,
          contract: {
            maxHoursPerWeek: formData.maxHoursPerWeek,
            contractedHoursPerWeek: formData.maxHoursPerWeek,
            maxHoursPerDay: 12,
            overtimeThreshold: 40,
            requiresBreak: true,
            breakDurationMinutes: 30,
            shiftLengthThresholdHours: 4,
          },
          availability: formData.availability,
          groups: formData.groups,
        });
      } else {
        // Create new employee
        const request: CreateEmployeeRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          dateOfBirth: formattedDate,
          normalPayRate: formData.hourlyRate,
          overtimePayRate: formData.overtimeRate,
          productivity: formData.productivity,
          contract: {
            maxHoursPerWeek: formData.maxHoursPerWeek,
            contractedHoursPerWeek: formData.maxHoursPerWeek,
            maxHoursPerDay: 12,
            overtimeThreshold: 40,
            requiresBreak: true,
            breakDurationMinutes: 30,
            shiftLengthThresholdHours: 4,
          },
          availability: formData.availability,
          groups: formData.groups,
        };
        await employeeService.createEmployee(request);
      }

      // Reload employees from backend
      await loadEmployees();
      resetForm();
    } catch (error) {
      alert(`Failed to save employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditWorker = (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;

    // Convert date from dd/MM/yyyy to YYYY-MM-DD for HTML input
    const [day, month, year] = employee.dateOfBirth.split('/');
    const htmlDate = `${year}-${month}-${day}`;

    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      dateOfBirth: htmlDate,
      hourlyRate: employee.normalPayRate,
      overtimeRate: employee.overtimePayRate,
      groups: Array.from(employee.groups),
      maxHoursPerWeek: employee.contract.maxHoursPerWeek,
      productivity: employee.productivity,
      availability: employee.availability.map(a => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    });
    setEditingId(id);
    setShowManualForm(true);
  };

  const handleDeleteWorker = async (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;

    if (window.confirm(`Delete ${employee.fullName}?`)) {
      try {
        await employeeService.deleteEmployee(id);
        await loadEmployees();
      } catch (error) {
        alert(`Failed to delete employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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
        <h1 className="text-3xl font-bold">Workers</h1>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Status Messages */}
      {importSuccess && importErrors.length === 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start gap-2 mb-6">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Import successful!</p>
            <p className="text-sm">Imported {workers.length} worker{workers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {importErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex items-start gap-2 mb-2">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="font-semibold">Import errors:</p>
          </div>
          <ul className="list-disc list-inside text-sm space-y-1 ml-7">
            {importErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
          {workers.length > 0 && (
            <p className="text-sm mt-2 ml-7">
              Successfully imported {workers.length} worker{workers.length !== 1 ? 's' : ''} despite errors above.
            </p>
          )}
        </div>
      )}

      {/* Manual Worker Form */}
      {showManualForm && (
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingId !== null ? 'Edit Worker' : 'Add New Worker'}
            </h2>
            <Button variant="ghost" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
                placeholder="John"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
                placeholder="Doe"
              />
            </div>

            {/* Middle Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Middle Name</label>
              <input
                type="text"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth *</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              />
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              />
            </div>

            {/* Overtime Rate */}
            <div>
              <label className="block text-sm font-medium mb-1">Overtime Rate ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.overtimeRate}
                onChange={(e) => setFormData({ ...formData, overtimeRate: parseFloat(e.target.value) })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              />
            </div>

            {/* Max Hours Per Week */}
            <div>
              <label className="block text-sm font-medium mb-1">Max Hours/Week *</label>
              <input
                type="number"
                min="1"
                value={formData.maxHoursPerWeek}
                onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: parseInt(e.target.value) })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              />
            </div>

            {/* Productivity */}
            <div>
              <label className="block text-sm font-medium mb-1">Productivity</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.productivity}
                onChange={(e) => setFormData({ ...formData, productivity: parseFloat(e.target.value) })}
                className="w-full border border-neutral-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Groups/Skills */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Groups/Skills *</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGroup())}
                className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm"
                placeholder="e.g., General, Manager, Cashier"
              />
              <Button type="button" onClick={handleAddGroup} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {formData.groups.map((group, idx) => (
                <span
                  key={idx}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm flex items-center gap-2"
                >
                  {group}
                  <button onClick={() => handleRemoveGroup(group)} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Availability *</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <select
                value={availabilityForm.dayOfWeek}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: e.target.value })}
                className="border border-neutral-300 rounded px-3 py-2 text-sm"
              >
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <input
                type="time"
                value={availabilityForm.startTime}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })}
                className="border border-neutral-300 rounded px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={availabilityForm.endTime}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })}
                className="border border-neutral-300 rounded px-3 py-2 text-sm"
              />
              <Button type="button" onClick={handleAddAvailability} variant="outline">
                Add
              </Button>
            </div>
            <div className="space-y-1">
              {formData.availability.map((avail, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-50 border border-neutral-200 px-3 py-2 rounded text-sm flex items-center justify-between"
                >
                  <span>
                    {avail.dayOfWeek}: {avail.startTime} - {avail.endTime}
                  </span>
                  <button
                    onClick={() => handleRemoveAvailability(idx)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSaveWorker} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {editingId ? 'Update Worker' : 'Add Worker'}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Workers Table */}
      {isLoading ? (
        <Card className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-neutral-600">Loading employees...</span>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                Employees ({employees.length})
              </h2>
              <Button
                variant="outline"
                onClick={handleClearWorkers}
                size="sm"
                disabled={employees.length === 0 || isSaving}
                className="gap-2 text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                CSV Template
              </Button>

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                size="sm"
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Import CSV'}
              </Button>

              <Button onClick={() => setShowManualForm(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add New Worker
              </Button>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No employees yet. Add your first worker to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left p-3 font-semibold text-sm">Name</th>
                  <th className="text-left p-3 font-semibold text-sm">Date of Birth</th>
                  <th className="text-left p-3 font-semibold text-sm">Hourly Rate</th>
                  <th className="text-left p-3 font-semibold text-sm">Groups</th>
                  <th className="text-left p-3 font-semibold text-sm">Max Hours/Week</th>
                  <th className="text-left p-3 font-semibold text-sm">Productivity</th>
                  <th className="text-left p-3 font-semibold text-sm">Availability</th>
                  <th className="text-left p-3 font-semibold text-sm w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="p-3 text-sm font-medium">{employee.fullName}</td>
                    <td className="p-3 text-sm">{employee.dateOfBirth}</td>
                    <td className="p-3 text-sm">${employee.normalPayRate.toFixed(2)}</td>
                    <td className="p-3 text-sm">
                      <div className="flex gap-1 flex-wrap">
                        {Array.from(employee.groups).map((group, gIdx) => (
                          <span
                            key={gIdx}
                            className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs"
                          >
                            {group}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm">{employee.contract.maxHoursPerWeek}</td>
                    <td className="p-3 text-sm">{employee.productivity.toFixed(1)}</td>
                    <td className="p-3 text-sm">
                      <div className="text-xs text-neutral-600 max-w-xs">
                        {employee.availability.map((avail, aIdx) => (
                          <div key={aIdx}>
                            {avail.dayOfWeek}: {avail.startTime}-{avail.endTime}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditWorker(employee.id)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorker(employee.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Card>
      )}
    </div>
  );
}
