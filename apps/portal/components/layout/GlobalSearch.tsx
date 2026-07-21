"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Car, Hash, Loader2, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchApi } from "@/lib/api/search";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatPhone } from "@/lib/format";

const HINT_ROWS = [
  {
    icon: User,
    label: "Clients",
    detail: "nom, e-mail, téléphone — au format 06… ou +33…",
  },
  {
    icon: Hash,
    label: "Immatriculation",
    detail: "avec ou sans tirets, casse indifférente",
  },
  { icon: Car, label: "Véhicules", detail: "marque ou modèle" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

function SearchHint() {
  return (
    <div className="px-3 py-3">
      <ul className="space-y-2">
        {HINT_ROWS.map((row) => (
          <li key={row.label} className="flex items-start gap-2.5 text-sm">
            <row.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">{row.label}</span>{" "}
              <span className="text-muted-foreground">— {row.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2.5 text-[11px] text-muted-foreground">
        <span>2 caractères minimum</span>
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> naviguer
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> ouvrir
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Échap</Kbd> fermer
        </span>
      </div>
    </div>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const debounced = useDebouncedValue(value, 250);
  // La recherche précédente est conservée d'une ouverture à l'autre : on la
  // présélectionne à la première prise de focus pour qu'une nouvelle saisie la
  // remplace directement, sans avoir à l'effacer à la main.
  const selectOnFocus = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        selectOnFocus.current = true;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSearch = () => {
    selectOnFocus.current = true;
    setOpen(true);
  };

  const enabled = open && debounced.trim().length >= 2;
  const query = useQuery({
    queryKey: queryKeys.search.global(debounced.trim()),
    queryFn: ({ signal }) => searchApi.search(debounced.trim(), signal),
    enabled,
    staleTime: 5_000,
  });

  const customers = query.data?.customers ?? [];
  const vehicles = query.data?.vehicles ?? [];
  const showHint = debounced.trim().length < 2;

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openSearch}
        className="gap-2 text-muted-foreground"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Rechercher…</span>
        <kbd className="ml-2 hidden items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Recherche globale"
        description="Trouvez un client ou un véhicule"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Client, véhicule, immatriculation…"
            value={value}
            onValueChange={setValue}
            onFocus={(e) => {
              if (!selectOnFocus.current) return;
              selectOnFocus.current = false;
              e.currentTarget.select();
            }}
            autoFocus
          />
          <CommandList>
          {showHint ? (
            <SearchHint />
          ) : query.isFetching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Recherche…
            </div>
          ) : (
            <>
              {customers.length === 0 && vehicles.length === 0 ? (
                <CommandEmpty>Aucun résultat.</CommandEmpty>
              ) : null}
              {customers.length > 0 && (
                <CommandGroup heading="Clients">
                  {customers.map((c) => (
                    <CommandItem
                      key={`c-${c.id}`}
                      value={`client ${c.fullName} ${c.email ?? ""} ${c.phone ?? ""}`}
                      onSelect={() => navigate(`/clients/${c.id}`)}
                    >
                      <User className="text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{c.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.email ?? (c.phone ? formatPhone(c.phone) : "—")}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {customers.length > 0 && vehicles.length > 0 && (
                <CommandSeparator />
              )}
              {vehicles.length > 0 && (
                <CommandGroup heading="Véhicules">
                  {vehicles.map((v) => (
                    <CommandItem
                      key={`v-${v.id}`}
                      value={`vehicule ${v.licensePlate} ${v.make} ${v.model}`}
                      onSelect={() => navigate(`/vehicles/${v.id}`)}
                    >
                      <Car className="text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium font-mono uppercase">
                          {v.licensePlate}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {v.make} {v.model} · {v.year}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
