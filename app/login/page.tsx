import { EMAIL_PROVIDER_ID, signIn } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import { DemoNotice } from "@/components/demo-notice";
import { Wordmark } from "@/components/wordmark";
import { isPublicDemoHost } from "@/lib/env";

const GITHUB_URL = "https://github.com/diwenne/openreply";
const SETUP_DOCS_URL = `${GITHUB_URL}/blob/main/docs/setup.md`;

export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t("Login - OpenReply"),
    description: t("Sign in to manage Instagram comment-to-DM campaigns."),
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkEmail?: string;
    callbackUrl?: string;
    template?: string;
  }>;
}) {
  const { t } = await getI18n();
  if (await isPublicDemoHost()) {
    return (
      <div className="flex min-h-screen items-center px-[clamp(16px,2.8vw,44px)] py-16">
        <div className="grid w-full items-end gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Wordmark height={28} />
            <p className="type-meta mt-10 text-muted">{t("Powered by OpenReply")}</p>
          </div>
          <div className="border border-border p-8 lg:col-span-5 lg:col-start-8 lg:p-10">
            <h1 className="type-statement text-3xl text-foreground">
              {t("Sign-in is off on this demo")}
            </h1>
            <p className="type-body mt-4 text-muted">
              {t("This is the public demo — it doesn’t create real accounts or send DMs. To use OpenReply for real, clone it and run your own instance with your own Meta app and domain.")}
            </p>
            <a
              href={SETUP_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="nw-cta mt-8 w-full"
            >
              {t("Clone it yourself")} <span className="nw-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const checkEmail = params.checkEmail === "1";
  const selectedTemplate = getCampaignTemplate(params.template);
  const templateCallbackUrl = selectedTemplate
    ? `/campaigns/new?template=${selectedTemplate.slug}`
    : null;
  const callbackUrl = params.callbackUrl ?? templateCallbackUrl ?? "/dashboard";

  async function sendMagicLink(formData: FormData) {
    "use server";
    await signIn(EMAIL_PROVIDER_ID, {
      email: String(formData.get("email") ?? ""),
      redirectTo: callbackUrl,
    });
  }

  return (
    <div className="flex min-h-screen items-center px-[clamp(16px,2.8vw,44px)] py-16">
      <div className="grid w-full items-end gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1>
            <Wordmark height={32} />
          </h1>
          <p className="type-body mt-8 max-w-md text-muted">
            {selectedTemplate
              ? t("Sign in to use the {name} template.", { name: selectedTemplate.title })
              : t("Sign in by email, then connect your Instagram professional account.")}
          </p>
          <p className="type-meta mt-10 text-muted">{t("Powered by OpenReply")}</p>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
        <DemoNotice variant="panel" />

        <div className="border border-border p-8 lg:p-10">
          {selectedTemplate && !checkEmail && (
            <div className="mb-5 border-l-[3px] border-accent bg-transparent p-4">
              <p className="type-meta text-foreground">
                {t("Template selected")}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {selectedTemplate.title}
              </p>
            </div>
          )}

          {checkEmail ? (
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold mb-2">{t("Check your email")}</h2>
              <p className="text-sm text-muted">
                {t("We sent you a secure sign-in link. Open it on this device to continue.")}
              </p>
            </div>
          ) : (
            <form action={sendMagicLink} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  {t("Work email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full border border-border bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-foreground focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="nw-cta w-full"
              >
                {t("Email me a magic link")} <span className="nw-arrow" aria-hidden="true">↗</span>
              </button>
            </form>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
