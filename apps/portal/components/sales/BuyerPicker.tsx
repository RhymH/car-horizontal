"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Search, UserPlus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { customersApi } from "@/lib/api/customers";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

/**
 * Acheteur choisi : soit une fiche client existante, soit une identité à créer.
 * Le serveur rapproche de toute façon le nouvel acheteur d'une fiche connue par
 * téléphone ou e-mail avant d'en créer une.
 */
export type BuyerSelection =
  | { kind: "existing"; customerId: string; label: string }
  | { kind: "new"; fullName: string };

/**
 * Recherche un client existant, ou bascule en création avec le texte déjà saisi.
 * Un contact acheteur est toujours rattaché à une fiche client : sans ça il
 * n'existerait que dans le dossier du véhicule, invisible depuis la prospection.
 */
export function BuyerPicker({
  value,
  onChange,
  disabled,
}: {
  value: BuyerSelection | null;
  onChange: (selection: BuyerSelection) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const trimmed = debounced.trim();
  const searchEnabled = open && trimmed.length >= 1;

  const list = useQuery({
    queryKey: queryKeys.customers.list({ search: trimmed, page: 1, pageSize: 20 }),
    queryFn: ({ signal }) =>
      customersApi.list({ search: trimmed, page: 1, pageSize: 20 }, signal),
    enabled: searchEnabled,
    staleTime: 5_000,
  });

  const customers = list.data?.items ?? [];

  const label =
    value?.kind === "existing"
      ? value.label
      : value?.kind === "new"
        ? `${value.fullName} (nouveau client)`
        : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-field px-3 py-1 text-sm outline-none transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">{label || "Rechercher ou créer un client…"}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent className="p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Nom, téléphone ou e-mail…"
          />
          <CommandList>
            {!searchEnabled ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tapez le nom, le téléphone ou l&apos;e-mail de l&apos;acheteur.
              </div>
            ) : (
              <>
                {list.isFetching && (
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Recherche…
                  </div>
                )}

                {!list.isFetching && customers.length === 0 && (
                  <CommandEmpty>Aucun client existant.</CommandEmpty>
                )}

                {customers.length > 0 && (
                  <CommandGroup heading="Clients existants">
                    {customers.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => {
                          onChange({
                            kind: "existing",
                            customerId: c.id,
                            label: c.fullName,
                          });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            value?.kind === "existing" && value.customerId === c.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{c.fullName}</span>
                          {(c.email || c.phone) && (
                            <span className="text-xs text-muted-foreground">
                              {[c.phone, c.email].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Toujours proposé, même quand la recherche remonte des résultats :
                    un homonyme ne doit pas empêcher de créer le bon acheteur. */}
                <CommandGroup heading="Nouveau">
                  <CommandItem
                    value={`__create__${trimmed}`}
                    onSelect={() => {
                      onChange({ kind: "new", fullName: trimmed });
                      setOpen(false);
                    }}
                  >
                    <UserPlus className="size-4" />
                    <span>
                      Créer le client «&nbsp;<strong>{trimmed}</strong>&nbsp;»
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
