"use client";

/**
 * Sidebar Navigation
 *
 * Text-only nav with active state and workspace section.
 */

import LanguageSwitcher from "@/components/language-switcher";
import { Mark } from "@/components/wordmark";
import { useZernioPromo } from "@/components/zernio-promo";
import { useI18n } from "@/lib/i18n/provider";
import Link from "next/link";
import Image from "next/image";
import { zernioLink } from "@/lib/zernio-links";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Overview", href: "/overview" },
  { label: "Inbox", href: "/inbox" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "DM Logs", href: "/logs" },
  { label: "Settings", href: "/settings" },
  { label: "Diagnostics", href: "/diagnostics" },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
}: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const showZernioPromo = useZernioPromo();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          chrome-dark fixed top-0 left-0 z-50 flex h-dvh w-80 max-w-[85vw] shrink-0 flex-col overflow-x-hidden border-r border-border
          transition-transform duration-200 ease-out
          lg:static lg:z-auto lg:h-full lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Same reason as the top bar: the drawer is full height, so the
            mark would otherwise land under the status bar. */}
        <div
          className="min-w-0 border-b border-border px-6 py-6"
          style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top))" }}
        >
          <Link href="/dashboard" aria-label="nadworker" className="inline-flex">
            <Mark size={40} label="" />
          </Link>
        </div>

        <nav className="min-w-0 flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={`
                  block min-w-0 truncate px-3 py-3 text-sm font-semibold
                  ${
                    isActive
                      ? "nav-current"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }
                `}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 border-t border-border px-6 py-5">
          <div className="mb-5"><LanguageSwitcher /></div>
          <p className="truncate text-sm font-semibold text-foreground">{workspaceName}</p>
          <p className="type-meta mt-1 text-muted">{t("Self-hosted")}</p>
          <p className="type-meta mt-4 text-muted">{t("Powered by OpenReply")}</p>
          {showZernioPromo && (
            <a
              href={zernioLink({ placement: "sidebar" })}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="mt-4 flex items-center gap-3 text-xs text-muted hover:text-foreground"
            >
              <span>{t("Supported by")}</span>
              <Image
                src="/brand/zernio-primary.svg"
                alt="Zernio"
                width={64}
                height={20}
                className="m-2"
              />
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
