import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV_LINKS: Array<{ to: string; label: string; adminOnly?: boolean }> = [
  { to: "/", label: "Buscar" },
  { to: "/solicitacoes", label: "Minhas solicitações" },
  { to: "/painel", label: "Painel" },
  { to: "/admin", label: "Admin", adminOnly: true },
  { to: "/ajuda", label: "Ajuda" },
];

export function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = profile?.role === "admin";
  const links = NAV_LINKS.filter((l) => !l.adminOnly || isAdmin);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    void navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-4 px-4">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-primary"
          aria-label="ChamaPro — página inicial"
        >
          ChamaPro
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navegação principal"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted [&.active]:bg-muted [&.active]:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-9 w-24 rounded-md" />
          ) : user ? (
            <>
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                aria-label={profile?.name ?? user.email ?? "Usuário"}
                title={profile?.name ?? user.email ?? "Usuário"}
              >
                {initials(profile?.name ?? user.email ?? "")}
              </span>
              <span className="hidden max-w-40 truncate text-sm font-medium text-foreground lg:inline">
                {profile?.name ?? user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sair
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/entrar">Entrar</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          className="border-b border-border bg-background px-4 pb-4 md:hidden"
          aria-label="Navegação móvel"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-primary">ChamaPro</span> —
          serviços para sua casa em Teresina.
        </p>
        <p>Pagamento retido até a confirmação do serviço.</p>
      </div>
    </footer>
  );
}

export function Page({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1120px] px-4", className)}>
      {children}
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <Skeleton className="h-8 w-56 rounded-md" />
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
