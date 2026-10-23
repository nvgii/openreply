import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t("Check your email - OpenReply"),
    description: t("A sign-in link was sent to your email."),
  };
}

export default async function VerifyRequestPage() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-screen items-center px-[clamp(16px,2.8vw,44px)] py-16">
      <div className="grid w-full gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Wordmark height={28} />
          <p className="type-meta mt-10 text-muted">{t("Powered by OpenReply")}</p>
        </div>
        <div className="border border-border p-8 lg:col-span-5 lg:col-start-8 lg:p-10">
          <h1 className="type-statement text-3xl">{t("Check your email")}</h1>
          <p className="type-body mt-4 text-muted">
            {t("We sent you a secure sign-in link. Open it on this device to continue.")}
          </p>
          <p className="type-meta mt-8">
            <Link href="/login" className="underline decoration-2 underline-offset-4">
              {t("Back to sign in")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
