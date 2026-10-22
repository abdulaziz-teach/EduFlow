import mongoose from 'mongoose';

/**
 * Incident Model — Operations & Production Incident Tracker
 * 
 * Tracks outages, degraded services, security events, and resolution timelines.
 */
const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Incident title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true,
    },
    severity: {
      type: String,
      enum: ['p0_critical', 'p1_high', 'p2_medium', 'p3_low'],
      default: 'p2_medium',
      index: true,
    },
    affectedService: {
      type: String,
      enum: ['api', 'database', 'ai_service', 'payment_gateway', 'notifications', 'search', 'system'],
      default: 'system',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'mitigated', 'resolved'],
      default: 'open',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: '',
    },
    timeline: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          required: true,
        },
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        authorName: {
          type: String,
          default: 'System Operator',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

incidentSchema.index({ status: 1, severity: 1, createdAt: -1 });
incidentSchema.index({ affectedService: 1, status: 1 });

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
