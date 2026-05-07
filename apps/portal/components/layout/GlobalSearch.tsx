"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Car, Loader2, Search, User } from "lucide-react";
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

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const debounced = useDebouncedValue(value, 250);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setValue("");
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
        onClick={() => setOpen(true)}
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
        onOpenChange={handleOpenChange}
        title="Recherche globale"
        description="Trouvez un client ou un véhicule"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Client, véhicule, immatriculation…"
            value={value}
            onValueChange={setValue}
            autoFocus
          />
          <CommandList>
          {showHint ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Tapez au moins 2 caractères.
            </div>
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
                          {c.email ?? c.phone ?? "—"}
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
