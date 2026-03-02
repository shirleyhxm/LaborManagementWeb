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
  EmployeeContractedHours,
  EmployeeContractedHoursRequest,
  FairnessSettings,
  FairnessSettingsRequest,
  HourlyRateRule,
  HourlyRateRuleRequest,
  PriorityReorderRequest,
  SchedulingPriority,
  WorkingHoursRules,
  WorkingHoursRulesRequest,
} from "../types/constraints";

// Base path is now business-scoped, will be constructed per call
const getConstraintsBase = (businessId: string) => `/businesses/${businessId}/constraints`;

export const constraintsService = {
  // ====== Budget Constraints ======

  /**
   * Get budget constraints
   */
  async getBudgetConstraints(businessId: string): Promise<BudgetConstraints> {
    return api.get<BudgetConstraints>(`${getConstraintsBase(businessId)}/budget`);
  },

  /**
   * Update budget constraints
   */
  async updateBudgetConstraints(
    businessId: string,
    data: BudgetConstraintsRequest
  ): Promise<BudgetConstraints> {
    return api.put<BudgetConstraints, BudgetConstraintsRequest>(
      `${getConstraintsBase(businessId)}/budget`,
      data
    );
  },

  // ====== Hourly Rate Rules ======

  /**
   * Get hourly rate rules
   */
  async getHourlyRateRules(businessId: string, roleId?: string): Promise<HourlyRateRule[]> {
    const queryParam = roleId ? `?roleId=${roleId}` : "";
    return api.get<HourlyRateRule[]>(
      `${getConstraintsBase(businessId)}/hourly-rates${queryParam}`
    );
  },

  /**
   * Create hourly rate rule
   */
  async createHourlyRateRule(
    businessId: string,
    data: HourlyRateRuleRequest
  ): Promise<HourlyRateRule> {
    return api.post<HourlyRateRule, HourlyRateRuleRequest>(
      `${getConstraintsBase(businessId)}/hourly-rates`,
      data
    );
  },

  // ====== Working Hours Rules ======

  /**
   * Get working hours rules
   */
  async getWorkingHoursRules(businessId: string): Promise<WorkingHoursRules> {
    return api.get<WorkingHoursRules>(`${getConstraintsBase(businessId)}/working-hours`);
  },

  /**
   * Update working hours rules
   */
  async updateWorkingHoursRules(
    businessId: string,
    data: WorkingHoursRulesRequest
  ): Promise<WorkingHoursRules> {
    return api.put<WorkingHoursRules, WorkingHoursRulesRequest>(
      `${getConstraintsBase(businessId)}/working-hours`,
      data
    );
  },

  // ====== Employee Contracted Hours ======

  /**
   * Get contracted hours for all employees or a specific employee
   */
  async getContractedHours(
    businessId: string,
    employeeId?: string
  ): Promise<EmployeeContractedHours[]> {
    const queryParam = employeeId ? `?employeeId=${employeeId}` : "";
    return api.get<EmployeeContractedHours[]>(
      `${getConstraintsBase(businessId)}/contracted-hours${queryParam}`
    );
  },

  /**
   * Create contracted hours for an employee
   */
  async createContractedHours(
    businessId: string,
    data: EmployeeContractedHoursRequest
  ): Promise<EmployeeContractedHours> {
    return api.post<EmployeeContractedHours, EmployeeContractedHoursRequest>(
      `${getConstraintsBase(businessId)}/contracted-hours`,
      data
    );
  },

  /**
   * Update contracted hours by employee ID
   */
  async updateContractedHours(
    businessId: string,
    employeeId: string,
    data: EmployeeContractedHoursRequest
  ): Promise<EmployeeContractedHours> {
    return api.put<EmployeeContractedHours, EmployeeContractedHoursRequest>(
      `${getConstraintsBase(businessId)}/contracted-hours/${employeeId}`,
      data
    );
  },

  /**
   * Delete contracted hours by employee ID
   */
  async deleteContractedHours(businessId: string, employeeId: string): Promise<void> {
    return api.delete<void>(`${getConstraintsBase(businessId)}/contracted-hours/${employeeId}`);
  },

  // ====== Compliance Rules ======

  /**
   * Get compliance rules
   */
  async getComplianceRules(businessId: string): Promise<ComplianceRules> {
    return api.get<ComplianceRules>(`${getConstraintsBase(businessId)}/compliance`);
  },

  /**
   * Update compliance rules
   */
  async updateComplianceRules(
    businessId: string,
    data: ComplianceRulesRequest
  ): Promise<ComplianceRules> {
    return api.put<ComplianceRules, ComplianceRulesRequest>(
      `${getConstraintsBase(businessId)}/compliance`,
      data
    );
  },

  // ====== Custom Compliance Rules ======

  /**
   * Get custom compliance rules
   */
  async getCustomComplianceRules(businessId: string): Promise<CustomComplianceRule[]> {
    return api.get<CustomComplianceRule[]>(
      `${getConstraintsBase(businessId)}/custom-compliance`
    );
  },

  /**
   * Create custom compliance rule
   */
  async createCustomComplianceRule(
    businessId: string,
    data: CustomComplianceRuleRequest
  ): Promise<CustomComplianceRule> {
    return api.post<CustomComplianceRule, CustomComplianceRuleRequest>(
      `${getConstraintsBase(businessId)}/custom-compliance`,
      data
    );
  },

  /**
   * Update custom compliance rule by name
   */
  async updateCustomComplianceRule(
    businessId: string,
    name: string,
    data: CustomComplianceRuleRequest
  ): Promise<CustomComplianceRule> {
    return api.put<CustomComplianceRule, CustomComplianceRuleRequest>(
      `${getConstraintsBase(businessId)}/custom-compliance/${encodeURIComponent(name)}`,
      data
    );
  },

  /**
   * Delete custom compliance rule by name
   */
  async deleteCustomComplianceRule(businessId: string, name: string): Promise<void> {
    return api.delete<void>(`${getConstraintsBase(businessId)}/custom-compliance/${encodeURIComponent(name)}`);
  },

  /**
   * Delete hourly rate rule by role ID
   */
  async deleteHourlyRateRule(businessId: string, roleId?: string): Promise<void> {
    const queryParam = roleId ? `?roleId=${roleId}` : "";
    return api.delete<void>(`${getConstraintsBase(businessId)}/hourly-rates${queryParam}`);
  },

  // ====== Scheduling Priorities ======

  /**
   * Get scheduling priorities
   */
  async getSchedulingPriorities(businessId: string): Promise<SchedulingPriority[]> {
    return api.get<SchedulingPriority[]>(`${getConstraintsBase(businessId)}/priorities`);
  },

  /**
   * Reorder priorities
   */
  async reorderPriorities(
    businessId: string,
    data: PriorityReorderRequest
  ): Promise<SchedulingPriority[]> {
    return api.put<SchedulingPriority[], PriorityReorderRequest>(
      `${getConstraintsBase(businessId)}/priorities/reorder`,
      data
    );
  },

  // ====== Fairness Settings ======

  /**
   * Get fairness settings
   */
  async getFairnessSettings(businessId: string): Promise<FairnessSettings> {
    return api.get<FairnessSettings>(`${getConstraintsBase(businessId)}/fairness`);
  },

  /**
   * Update fairness settings
   */
  async updateFairnessSettings(
    businessId: string,
    data: FairnessSettingsRequest
  ): Promise<FairnessSettings> {
    return api.put<FairnessSettings, FairnessSettingsRequest>(
      `${getConstraintsBase(businessId)}/fairness`,
      data
    );
  },

  // ====== Bulk Operations ======

  /**
   * Get all constraints in a single request
   */
  async getAllConstraints(businessId: string): Promise<AllConstraints> {
    return api.get<AllConstraints>(getConstraintsBase(businessId));
  },

  // ====== Validation ======

  /**
   * Validate constraints before saving
   */
  async validateConstraints(
    businessId: string,
    data: ConstraintValidationRequest
  ): Promise<ConstraintValidationResponse> {
    return api.post<ConstraintValidationResponse, ConstraintValidationRequest>(
      `${getConstraintsBase(businessId)}/validate`,
      data
    );
  },
};
