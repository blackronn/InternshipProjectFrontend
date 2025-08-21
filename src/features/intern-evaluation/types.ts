export interface Intern {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
}

export const fullName = (i: Intern) => `${i.firstName} ${i.lastName}`;

export interface EvaluationInput {
  internId: number;
  mentorId: number;
  punctuality: number;
  communication: number;
  technical: number;
  teamwork: number;
  comment?: string;
}

export interface EvaluationResponse extends EvaluationInput {
  id: number;
  createdAt: string;
}
