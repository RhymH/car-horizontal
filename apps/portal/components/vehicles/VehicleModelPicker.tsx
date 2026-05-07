"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
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
import { catalogApi, type VehicleModelListItem } from "@/lib/api/catalog";
import { engineTypeLabels } from "@/lib/api/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

export interface VehicleModelPickerProps {
  value: string | null;
  onChange: (model: VehicleModelListItem | null) => void;
  initialLabel?: string | null;
  disabled?: boolean;
  placeholder?: string;
}

export function VehicleModelPicker({
  value,
  onChange,
  initialLabel,
  disabled,
  placeholder = "Rechercher un modèle constructeur…",
}: VehicleModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const enabled = open && debounced.trim().length >= 1;

  const list = useQuery({
    queryKey: queryKeys.catalog.vehicleModels({ q: debounced, page: 1, pageSize: 25 }),
    queryFn: ({ signal }) =>
      catalogApi.listVehicleModels({ q: debounced, page: 1, pageSize: 25 }, signal),
    enabled,
    staleTime: 60_000,
  });

  const items = list.data?.items ?? [];

  const selected = useMemo(
    () => items.find((m) => m.id === value),
    [items, value],
  );
  const label = selected?.displayName ?? initialLabel ?? "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">{label || placeholder}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[28rem] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder='Tapez "clio", "208 puretech", "model 3"…'
          />
          <CommandList>
            {!enabled ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tapez pour rechercher dans le catalogue.
              </div>
            ) : list.isFetching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Recherche…
              </div>
            ) : items.length === 0 ? (
              <CommandEmpty>Aucun modèle ne correspond.</CommandEmpty>
            ) : (
              <CommandGroup>
                {items.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.id}
                    onSelect={() => {
                      onChange(m);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === m.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {m.make} {m.model}
                        {m.trim ? ` ${m.trim}` : ""} —{" "}
                        <span className="font-normal text-muted-foreground">
                          {m.engineDisplayName}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {engineTypeLabels[m.engineType]} ·{" "}
                        {m.productionStartYear}
                        {m.productionEndYear ? `–${m.productionEndYear}` : "–"}
                        {m.programs.length > 0 ? (
                          <>
                            {" · "}
                            {m.programs.reduce((s, p) => s + p.itemCount, 0)} entretiens
                            programmés
                          </>
                        ) : null}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
