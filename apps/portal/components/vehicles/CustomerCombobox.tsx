"use client";

import { useState } from "react";
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
import { customersApi, type CustomerListItem } from "@/lib/api/customers";
import { queryKeys } from "@/lib/query/keys";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

export interface CustomerComboboxProps {
  value: string;
  onChange: (id: string, customer: CustomerListItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  initialLabel?: string;
}

export function CustomerCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Sélectionner un client…",
  initialLabel,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);
  const enabled = open && debounced.trim().length >= 1;

  const list = useQuery({
    queryKey: queryKeys.customers.list({
      search: debounced,
      page: 1,
      pageSize: 20,
    }),
    queryFn: ({ signal }) =>
      customersApi.list({ search: debounced, page: 1, pageSize: 20 }, signal),
    enabled,
    staleTime: 5_000,
  });

  const customers = list.data?.items ?? [];
  const selected = customers.find((c) => c.id === value);
  const label = selected?.fullName ?? initialLabel ?? "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">{label || placeholder}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Rechercher un client…"
          />
          <CommandList>
            {!enabled ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tapez pour rechercher.
              </div>
            ) : list.isFetching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Recherche…
              </div>
            ) : customers.length === 0 ? (
              <CommandEmpty>Aucun client trouvé.</CommandEmpty>
            ) : (
              <CommandGroup>
                {customers.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onChange(c.id, c);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === c.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{c.fullName}</span>
                      {(c.email || c.phone) && (
                        <span className="text-xs text-muted-foreground">
                          {c.email ?? c.phone}
                        </span>
                      )}
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
