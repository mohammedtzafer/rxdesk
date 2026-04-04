import { db } from "./db";

export const AuditActions = {
  LOCATION_CREATED: "location.created",
  LOCATION_UPDATED: "location.updated",
  LOCATION_DEACTIVATED: "location.deactivated",
  USER_INVITED: "user.invited",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_DEACTIVATED: "user.deactivated",
  USER_REACTIVATED: "user.reactivated",
  USER_PERMISSIONS_UPDATED: "user.permissions_updated",
  SETTINGS_UPDATED: "settings.updated",
  ORGANIZATION_CREATED: "organization.created",
  INVITE_ACCEPTED: "invite.accepted",
  INVITE_CANCELLED: "invite.cancelled",
  PROVIDER_CREATED: "provider.created",
  PROVIDER_UPDATED: "provider.updated",
  PROVIDER_DEACTIVATED: "provider.deactivated",
  PRESCRIPTIONS_UPLOADED: "prescriptions.uploaded",
} as const;

type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

interface AuditLogEntry {
  organizationId: string;
  userId?: string;
  action: AuditAction | (string & Record<never, never>);
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata as Parameters<typeof db.auditLog.create>[0]["data"]["metadata"],
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
