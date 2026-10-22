import mongoose from 'mongoose';

/**
 * AuditLog Model — Enterprise Immutable Administrative Activity Ledger
 * 
 * Tracks all sensitive administrative operations, security events,
 * and operational changes. Retains backward compatibility with
 * previous adminUserId / targetType / targetId fields while supporting
 * actorId / resourceType / resourceId.
 */
const auditLogSchema = new mongoose.Schema(
  {
    // Actor info
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorRole: {
      type: String,
      default: 'admin',
      index: true,
    },

    // Action info
    action: {
      type: String,
      required: [true, 'Action name is required'],
      index: true,
    },

    // Target / Resource info
    resourceType: {
      type: String,
      index: true,
    },
    targetType: {
      type: String,
      index: true,
    },
    resourceId: {
      type: String,
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },

    // Context & Telemetry (No passwords, tokens, or PII secrets)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipHashOrSafeIdentifier: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only
  }
);

// Pre-save synchronization hook for backward compatibility
auditLogSchema.pre('save', function (next) {
  if (this.actorId && !this.adminUserId) {
    this.adminUserId = this.actorId;
  } else if (this.adminUserId && !this.actorId) {
    this.actorId = this.adminUserId;
  }

  if (this.resourceType && !this.targetType) {
    this.targetType = this.resourceType;
  } else if (this.targetType && !this.resourceType) {
    this.resourceType = this.targetType;
  }

  if (this.resourceId && !this.targetId) {
    this.targetId = String(this.resourceId);
  } else if (this.targetId && !this.resourceId) {
    this.resourceId = String(this.targetId);
  }

  next();
});

// Indexes for high-performance administrative inspection and filtering
auditLogSchema.index({ actorId: 1, createdAt: -1, _id: -1 });
auditLogSchema.index({ adminUserId: 1, createdAt: -1, _id: -1 });
auditLogSchema.index({ action: 1, createdAt: -1, _id: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
// Compound deterministic index for high-throughput cursor pagination
auditLogSchema.index({ createdAt: -1, _id: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
