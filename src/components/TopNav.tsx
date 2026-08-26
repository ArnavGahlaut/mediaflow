import { Link } from "@tanstack/react-router";
import { Menu, Play } from "lucide-react";
import { useState } from "react";

const LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/downloads", label: "Downloads" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
] as const;

export function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6"
      >
        <Link to="/" className="group flex items-center gap-2.5" aria-label="MediaFlow home">
          <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-xl shadow-[var(--glow-brand)] transition-transform duration-300 group-hover:scale-105">
            <Play className="size-4 fill-primary-foreground text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Media<span className="text-brand-gradient">Flow</span>
          </span>
        </Link>

        <ul className="ml-6 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </button>
          <button
            type="button"
            className="bg-brand-gradient flex size-9 items-center justify-center rounded-full p-[2px] transition-transform duration-300 hover:scale-105"
            aria-label="Account menu"
          >
            <span className="flex size-full items-center justify-center rounded-full bg-background text-xs font-semibold">
              AR
            </span>
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-t border-border px-4 pb-3 md:hidden">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
