import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import InvitationAcceptCard from "@/components/invitation-accept-card";
import { Wordmark } from "@/components/wordmark";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Accept Workspace Invitation - OpenReply"),
    robots: { index: false, follow: false },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { t, label } = await getI18n();
  const { token } = await params;
  const [session, invitation] = await Promise.all([
    auth(),
    prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
      },
    }),
  ]);

  if (!invitation || invitation.status !== "PENDING") {
    notFound();
  }

  const expired = invitation.expiresAt <= new Date();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-12">
        <Link href="/login" className="mb-10 inline-flex" aria-label="nadworker">
          <Wordmark height={24} />
        </Link>
        <section className="border border-border p-8">
          <p className="type-meta text-muted">
            {t("Workspace invitation")}
          </p>
          <h1 className="type-display mt-4 text-4xl text-foreground">
            {t("Join {workspace}", { workspace: invitation.workspace.name })}
          </h1>
          <p className="type-body mt-4 text-muted">
            {t("You were invited as {role} for {email}.", { role: label(invitation.role), email: invitation.email })}
          </p>
          <div className="mt-8">
            {expired ? (
              <p className="text-sm text-error">
                {t("This invitation has expired. Ask the workspace owner to resend it.")}
              </p>
            ) : (
              <InvitationAcceptCard
                token={token}
                isSignedIn={Boolean(session?.user?.id)}
                invitedEmail={invitation.email}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

