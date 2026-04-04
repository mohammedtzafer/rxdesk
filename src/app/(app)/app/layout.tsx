import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    redirect("/signup");
  }

  const [org, permissions] = await Promise.all([
    db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        plan: true,
        brandColor: true,
        brandName: true,
        logoUrl: true,
      },
    }),
    db.permission.findMany({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      select: { module: true, access: true },
    }),
  ]);

  return (
    <AppShell
      user={{
        name: session.user.name || "",
        email: session.user.email || "",
        role: session.user.role,
        image: session.user.image,
      }}
      plan={org?.plan || "STARTER"}
      permissions={permissions}
      branding={{
        brandColor: org?.brandColor,
        brandName: org?.brandName,
        logoUrl: org?.logoUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
