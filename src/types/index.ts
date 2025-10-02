export interface IUser {
  _id?: string;
  username: string;
  email: string;
  password: string;
  role: 'L1' | 'L2' | 'L3';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITicket {
  _id?: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'New' | 'Attending' | 'Completed' | 'Escalated' | 'Resolved';
  criticalValue?: 'C1' | 'C2' | 'C3';
  expectedCompletionDate: Date;
  createdBy: string;
  assignedTo?: string;
  currentLevel: 'L1' | 'L2' | 'L3';
  escalationHistory: IEscalation[];
  actionLogs: IActionLog[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEscalation {
  fromLevel: 'L1' | 'L2' | 'L3';
  toLevel: 'L1' | 'L2' | 'L3';
  reason: string;
  escalatedBy: string;
  escalatedAt: Date;
  notes?: string;
}

export interface IActionLog {
  action: string;
  performedBy: string;
  performedAt: Date;
  details?: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    username: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}