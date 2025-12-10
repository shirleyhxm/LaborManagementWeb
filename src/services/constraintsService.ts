import { api } from "./api";
import type {
  AllConstraints,
  BudgetConstraints,
  BudgetConstraintsRequest,
  ComplianceRules,
  ComplianceRulesRequest,
  ConstraintValidationRequest,
  ConstraintValidationResponse,
  CustomComplianceRule,
  CustomComplianceRuleRequest,
  CustomComplianceRuleUpdateRequest,
  EmployeeContractedHours,
  EmployeeContractedHoursRequest,
  EmployeeContractedHoursUpdateRequest,
  FairnessSettings,
  FairnessSettingsRequest,
  HourlyRateRule,
  HourlyRateRuleRequest,
  PriorityReorderRequest,
  SchedulingPriority,
  WorkingHoursRules,
  WorkingHoursRulesRequest,
} from "../types/constraints";

const CONSTRAINTS_BASE = "/v1/constraints";

export const constraintsService = {
  // ====== Budget Constraints ======

  /**
   * Get budget constraints
   */
  async getBudgetConstraints(): Promise<BudgetConstraints> {
    return api.get<BudgetConstraints>(`${CONSTRAINTS_BASE}/budget`);
  },

  /**
   * Update budget constraints
   */
  async updateBudgetConstraints(
    data: BudgetConstraintsRequest
  ): Promise<BudgetConstraints> {
    return api.put<BudgetConstraints, BudgetConstraintsRequest>(
      `${CONSTRAINTS_BASE}/budget`,
      data
    );
  },

  // ====== Hourly Rate Rules ======

  /**
   * Get hourly rate rules
   */
  async getHourlyRateRules(roleId?: string): Promise<HourlyRateRule[]> {
    const queryParam = roleId ? `?roleId=${roleId}` : "";
    return api.get<HourlyRateRule[]>(
      `${CONSTRAINTS_BASE}/hourly-rates${queryParam}`
    );
  },

  /**
   * Create hourly rate rule
   */
  async createHourlyRateRule(
    data: HourlyRateRuleRequest
  ): Promise<HourlyRateRule> {
    return api.post<HourlyRateRule, HourlyRateRuleRequest>(
      `${CONSTRAINTS_BASE}/hourly-rates`,
      data
    );
  },

  // ====== Working Hours Rules ======

  /**
   * Get working hours rules
   */
  async getWorkingHoursRules(): Promise<WorkingHoursRules> {
    return api.get<WorkingHoursRules>(`${CONSTRAINTS_BASE}/working-hours`);
  },

  /**
   * Update working hours rules
   */
  async updateWorkingHoursRules(
    data: WorkingHoursRulesRequest
  ): Promise<WorkingHoursRules> {
    return api.put<WorkingHoursRules, WorkingHoursRulesRequest>(
      `${CONSTRAINTS_BASE}/working-hours`,
      data
    );
  },

  // ====== Employee Contracted Hours ======

  /**
   * Get contracted hours for all employees or a specific employee
   */
  async getContractedHours(
    employeeId?: string
  ): Promise<EmployeeContractedHours[]> {
    const queryParam = employeeId ? `?employeeId=${employeeId}` : "";
    return api.get<EmployeeContractedHours[]>(
      `${CONSTRAINTS_BASE}/contracted-hours${queryParam}`
    );
  },

  /**
   * Create contracted hours for an employee
   */
  async createContractedHours(
    data: EmployeeContractedHoursRequest
  ): Promise<EmployeeContractedHours> {
    return api.post<EmployeeContractedHours, EmployeeContractedHoursRequest>(
      `${CONSTRAINTS_BASE}/contracted-hours`,
      data
    );
  },

  /**
   * Update contracted hours by employee ID
   */
  async updateContractedHours(
    employeeId: string,
    data: EmployeeContractedHoursRequest
  ): Promise<EmployeeContractedHours> {
    return api.put<EmployeeContractedHours, EmployeeContractedHoursRequest>(
      `${CONSTRAINTS_BASE}/contracted-hours/${employeeId}`,
      data
    );
  },

  /**
   * Delete contracted hours by employee ID
   */
  async deleteContractedHours(employeeId: string): Promise<void> {
    return api.delete<void>(`${CONSTRAINTS_BASE}/contracted-hours/${employeeId}`);
  },

  // ====== Compliance Rules ======

  /**
   * Get compliance rules
   */
  async getComplianceRules(): Promise<ComplianceRules> {
    return api.get<ComplianceRules>(`${CONSTRAINTS_BASE}/compliance`);
  },

  /**
   * Update compliance rules
   */
  async updateComplianceRules(
    data: ComplianceRulesRequest
  ): Promise<ComplianceRules> {
    return api.put<ComplianceRules, ComplianceRulesRequest>(
      `${CONSTRAINTS_BASE}/compliance`,
      data
    );
  },

  // ====== Custom Compliance Rules ======

  /**
   * Get custom compliance rules
   */
  async getCustomComplianceRules(): Promise<CustomComplianceRule[]> {
    return api.get<CustomComplianceRule[]>(
      `${CONSTRAINTS_BASE}/custom-compliance`
    );
  },

  /**
   * Create custom compliance rule
   */
  async createCustomComplianceRule(
    data: CustomComplianceRuleRequest
  ): Promise<CustomComplianceRule> {
    return api.post<CustomComplianceRule, CustomComplianceRuleRequest>(
      `${CONSTRAINTS_BASE}/custom-compliance`,
      data
    );
  },

  /**
   * Update custom compliance rule by name
   */
  async updateCustomComplianceRule(
    name: string,
    data: CustomComplianceRuleRequest
  ): Promise<CustomComplianceRule> {
    return api.put<CustomComplianceRule, CustomComplianceRuleRequest>(
      `${CONSTRAINTS_BASE}/custom-compliance/${encodeURIComponent(name)}`,
      data
    );
  },

  /**
   * Delete custom compliance rule by name
   */
  async deleteCustomComplianceRule(name: string): Promise<void> {
    return api.delete<void>(`${CONSTRAINTS_BASE}/custom-compliance/${encodeURIComponent(name)}`);
  },

  /**
   * Delete hourly rate rule by role ID
   */
  async deleteHourlyRateRule(roleId?: string): Promise<void> {
    const queryParam = roleId ? `?roleId=${roleId}` : "";
    return api.delete<void>(`${CONSTRAINTS_BASE}/hourly-rates${queryParam}`);
  },

  // ====== Scheduling Priorities ======

  /**
   * Get scheduling priorities
   */
  async getSchedulingPriorities(): Promise<SchedulingPriority[]> {
    return api.get<SchedulingPriority[]>(`${CONSTRAINTS_BASE}/priorities`);
  },

  /**
   * Reorder priorities
   */
  async reorderPriorities(
    data: PriorityReorderRequest
  ): Promise<SchedulingPriority[]> {
    return api.put<SchedulingPriority[], PriorityReorderRequest>(
      `${CONSTRAINTS_BASE}/priorities/reorder`,
      data
    );
  },

  // ====== Fairness Settings ======

  /**
   * Get fairness settings
   */
  async getFairnessSettings(): Promise<FairnessSettings> {
    return api.get<FairnessSettings>(`${CONSTRAINTS_BASE}/fairness`);
  },

  /**
   * Update fairness settings
   */
  async updateFairnessSettings(
    data: FairnessSettingsRequest
  ): Promise<FairnessSettings> {
    return api.put<FairnessSettings, FairnessSettingsRequest>(
      `${CONSTRAINTS_BASE}/fairness`,
      data
    );
  },

  // ====== Bulk Operations ======

  /**
   * Get all constraints in a single request
   */
  async getAllConstraints(): Promise<AllConstraints> {
    return api.get<AllConstraints>(CONSTRAINTS_BASE);
  },

  // ====== Validation ======

  /**
   * Validate constraints before saving
   */
  async validateConstraints(
    data: ConstraintValidationRequest
  ): Promise<ConstraintValidationResponse> {
    return api.post<ConstraintValidationResponse, ConstraintValidationRequest>(
      `${CONSTRAINTS_BASE}/validate`,
      data
    );
  },
};
