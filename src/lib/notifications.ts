import { db } from "./db";
import { sendNotificationEmail } from "./email";

type NotificationType =
  | "SCHEDULE_PUBLISHED"
  | "SCHEDULE_UPDATED"
  | "PTO_SUBMITTED"
  | "PTO_APPROVED"
  | "PTO_DENIED"
  | "SHIFT_SWAP_REQUESTED"
  | "SHIFT_SWAP_APPROVED"
  | "SHIFT_SWAP_DENIED"
  | "TIMESHEET_APPROVED"
  | "TIMESHEET_REJECTED"
  | "SHIFT_REMINDER";

interface NotifyParams {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  sendEmail?: boolean;
}

/**
 * Create an in-app notification and optionally send an email.
 * Fire-and-forget — never blocks the caller.
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    await db.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });

    if (params.sendEmail !== false) {
      const user = await db.user.findUnique({
        where: { id: params.userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        await sendNotificationEmail({
          to: user.email,
          subject: params.title,
          message: params.message,
        }).catch((err) => console.error("Failed to send notification email:", err));
      }
    }
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Notify multiple users at once.
 */
export async function notifyMany(
  userIds: string[],
  params: Omit<NotifyParams, "userId">
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) => notify({ ...params, userId }))
  );
}

/**
 * Get managers/owners of an organization who have TEAM module access.
 */
export async function getManagerIds(organizationId: string): Promise<string[]> {
  const users = await db.user.findMany({
    where: {
      organizationId,
      active: true,
      role: { in: ["OWNER", "PHARMACIST"] },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// ─── Convenience functions for specific notification types ──────

export async function notifySchedulePublished(
  organizationId: string,
  employeeIds: string[],
  weekLabel: string
): Promise<void> {
  await notifyMany(employeeIds, {
    organizationId,
    type: "SCHEDULE_PUBLISHED",
    title: "Schedule published",
    message: `The schedule for ${weekLabel} has been published. Check your shifts.`,
    entityType: "schedule",
  });
}

export async function notifyScheduleUpdated(
  organizationId: string,
  employeeIds: string[],
  weekLabel: string
): Promise<void> {
  await notifyMany(employeeIds, {
    organizationId,
    type: "SCHEDULE_UPDATED",
    title: "Schedule updated",
    message: `The schedule for ${weekLabel} has been updated. Please review your shifts for changes.`,
    entityType: "schedule",
  });
}

export async function notifyPtoSubmitted(
  organizationId: string,
  employeeName: string,
  ptoId: string,
  dateRange: string
): Promise<void> {
  const managerIds = await getManagerIds(organizationId);
  await notifyMany(managerIds, {
    organizationId,
    type: "PTO_SUBMITTED",
    title: "Time off request",
    message: `${employeeName} requested time off for ${dateRange}. Please review.`,
    entityType: "ptoRequest",
    entityId: ptoId,
  });
}

export async function notifyPtoApproved(
  organizationId: string,
  employeeId: string,
  dateRange: string
): Promise<void> {
  await notify({
    organizationId,
    userId: employeeId,
    type: "PTO_APPROVED",
    title: "Time off approved",
    message: `Your time off request for ${dateRange} has been approved.`,
    entityType: "ptoRequest",
  });
}

export async function notifyPtoDenied(
  organizationId: string,
  employeeId: string,
  dateRange: string,
  reason?: string
): Promise<void> {
  const reasonText = reason ? ` Reason: ${reason}` : "";
  await notify({
    organizationId,
    userId: employeeId,
    type: "PTO_DENIED",
    title: "Time off denied",
    message: `Your time off request for ${dateRange} has been denied.${reasonText}`,
    entityType: "ptoRequest",
  });
}

export async function notifyShiftSwapRequested(
  organizationId: string,
  targetEmployeeId: string,
  requesterName: string,
  swapId: string,
  shiftDate: string
): Promise<void> {
  await notify({
    organizationId,
    userId: targetEmployeeId,
    type: "SHIFT_SWAP_REQUESTED",
    title: "Shift swap request",
    message: `${requesterName} wants to swap shifts with you on ${shiftDate}. Please review.`,
    entityType: "shiftSwapRequest",
    entityId: swapId,
  });
}

export async function notifyShiftSwapApproved(
  organizationId: string,
  requesterId: string,
  shiftDate: string
): Promise<void> {
  await notify({
    organizationId,
    userId: requesterId,
    type: "SHIFT_SWAP_APPROVED",
    title: "Shift swap approved",
    message: `Your shift swap request for ${shiftDate} has been approved.`,
    entityType: "shiftSwapRequest",
  });
}

export async function notifyShiftSwapDenied(
  organizationId: string,
  requesterId: string,
  shiftDate: string,
  reason?: string
): Promise<void> {
  const reasonText = reason ? ` Reason: ${reason}` : "";
  await notify({
    organizationId,
    userId: requesterId,
    type: "SHIFT_SWAP_DENIED",
    title: "Shift swap denied",
    message: `Your shift swap request for ${shiftDate} has been denied.${reasonText}`,
    entityType: "shiftSwapRequest",
  });
}

export async function notifyTimesheetApproved(
  organizationId: string,
  employeeId: string,
  periodLabel: string
): Promise<void> {
  await notify({
    organizationId,
    userId: employeeId,
    type: "TIMESHEET_APPROVED",
    title: "Timesheet approved",
    message: `Your timesheet for ${periodLabel} has been approved.`,
    entityType: "timesheet",
  });
}

export async function notifyTimesheetRejected(
  organizationId: string,
  employeeId: string,
  periodLabel: string,
  reason?: string
): Promise<void> {
  const reasonText = reason ? ` Reason: ${reason}` : "";
  await notify({
    organizationId,
    userId: employeeId,
    type: "TIMESHEET_REJECTED",
    title: "Timesheet rejected",
    message: `Your timesheet for ${periodLabel} has been rejected.${reasonText}`,
    entityType: "timesheet",
  });
}
