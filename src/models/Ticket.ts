import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketDocument extends Document {
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'New' | 'Attending' | 'Completed' | 'Escalated' | 'Resolved';
  criticalValue?: 'C1' | 'C2' | 'C3';
  expectedCompletionDate: Date;
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  currentLevel: 'L1' | 'L2' | 'L3';
  escalationHistory: Array<{
    fromLevel: 'L1' | 'L2' | 'L3';
    toLevel: 'L1' | 'L2' | 'L3';
    reason: string;
    escalatedBy: mongoose.Types.ObjectId;
    escalatedAt: Date;
    notes?: string;
  }>;
  actionLogs: Array<{
    action: string;
    performedBy: mongoose.Types.ObjectId;
    performedAt: Date;
    details?: string;
    previousStatus?: string;
    newStatus?: string;
  }>;
}

const escalationSchema = new Schema({
  fromLevel: {
    type: String,
    enum: ['L1', 'L2', 'L3'],
    required: true
  },
  toLevel: {
    type: String,
    enum: ['L1', 'L2', 'L3'],
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Escalation reason is required'],
    trim: true
  },
  escalatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  escalatedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
});

const actionLogSchema = new Schema({
  action: {
    type: String,
    required: [true, 'Action description is required'],
    trim: true
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  details: {
    type: String,
    trim: true
  },
  previousStatus: {
    type: String,
    enum: ['New', 'Attending', 'Completed', 'Escalated', 'Resolved']
  },
  newStatus: {
    type: String,
    enum: ['New', 'Attending', 'Completed', 'Escalated', 'Resolved']
  }
});

const ticketSchema = new Schema<ITicketDocument>({
  title: {
    type: String,
    required: [true, 'Ticket title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Ticket description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  priority: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High'],
      message: 'Priority must be Low, Medium, or High'
    },
    required: [true, 'Priority is required']
  },
  status: {
    type: String,
    enum: {
      values: ['New', 'Attending', 'Completed', 'Escalated', 'Resolved'],
      message: 'Status must be New, Attending, Completed, Escalated, or Resolved'
    },
    default: 'New'
  },
  criticalValue: {
    type: String,
    enum: {
      values: ['C1', 'C2', 'C3'],
      message: 'Critical value must be C1, C2, or C3'
    }
  },
  expectedCompletionDate: {
    type: Date,
    required: [true, 'Expected completion date is required'],
    validate: {
      validator: function(value: Date) {
        return value > new Date();
      },
      message: 'Expected completion date must be in the future'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  currentLevel: {
    type: String,
    enum: ['L1', 'L2', 'L3'],
    default: 'L1'
  },
  escalationHistory: [escalationSchema],
  actionLogs: [actionLogSchema]
}, {
  timestamps: true
});

// Validation for L3 tickets - only C1 and C2 can be escalated to L3
ticketSchema.pre('save', function(next) {
  if (this.currentLevel === 'L3' && this.criticalValue === 'C3') {
    return next(new Error('C3 tickets cannot be escalated to L3. Only C1 and C2 tickets can reach L3.'));
  }
  next();
});

// Index for better query performance
ticketSchema.index({ status: 1, priority: 1, currentLevel: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });

export const Ticket = mongoose.model<ITicketDocument>('Ticket', ticketSchema);