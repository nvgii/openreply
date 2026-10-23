import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

interface LegalShellProps {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalShell({
  title,
  description,
  updatedAt,
  children,
}: LegalShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-[clamp(16px,2.8vw,44px)]">
          <Link href="/login" className="inline-flex" aria-label="nadworker">
            <Wordmark height={22} />
          </Link>
          <Link
            href="/login"
            className="type-meta text-muted hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-[clamp(16px,2.8vw,44px)] py-16">
        <p className="type-meta text-muted">
          Last updated {updatedAt}
        </p>
        <h1 className="type-display mt-6 text-5xl text-foreground sm:text-6xl">
          {title}
        </h1>
        <p className="type-body mt-6 text-muted">{description}</p>
        <div className="mt-12 space-y-8 text-base leading-relaxed text-foreground">
          {children}
        </div>
        <p className="type-meta mt-16 text-muted">Powered by OpenReply</p>
      </article>
    </main>
  );
}
