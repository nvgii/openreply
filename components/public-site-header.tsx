import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

interface PublicSiteHeaderProps {
  active?: "templates";
}

const navLinks = [
  { label: "Templates", href: "/templates", key: "templates" },
  { label: "Agencies", href: "/instagram-dm-automation-agencies", key: "agencies" },
];

export default function PublicSiteHeader({ active }: PublicSiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-20 w-full items-center justify-between px-[clamp(16px,2.8vw,44px)]">
        <Link href="/login" className="inline-flex" aria-label="nadworker">
          <Wordmark height={22} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`type-meta ${
                active === link.key ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="type-meta hidden text-muted hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link href="/login" className="nw-cta h-11 min-h-11 px-4 text-[13px]">
            Start free <span className="nw-arrow" aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
