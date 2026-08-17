export interface InviteDetails {
  email: string;
  businessName: string;
  employeeFirstName: string;
  employeeLastName: string;
}

export interface CreateInviteResponse {
  inviteLink: string;
}
