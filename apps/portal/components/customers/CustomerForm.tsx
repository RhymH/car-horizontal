"use client";

import {
  type Control,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/customers/TagInput";
import {
  customerStatuses,
  customerStatusLabels,
  type CustomerFormValues,
  type CustomerStatus,
} from "@/lib/schemas/customer";
import { leadsApi } from "@/lib/api/leads";
import { queryKeys } from "@/lib/query/keys";
import { Controller } from "react-hook-form";
import { cn } from "@/lib/utils";

/** Le Select ne peut pas porter "" : sentinelle pour « aucun commercial ». */
export const NO_SALESPERSON = "none";

export interface CustomerFormProps {
  register: UseFormRegister<CustomerFormValues>;
  control: Control<CustomerFormValues>;
  errors: FieldErrors<CustomerFormValues>;
}

export function CustomerForm({ register, control, errors }: CustomerFormProps) {
  const team = useQuery({
    queryKey: queryKeys.leads.team(),
    queryFn: ({ signal }) => leadsApi.team(signal),
    staleTime: 5 * 60 * 1000,
  });
  const members = team.data ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom complet *" error={errors.fullName?.message} span={2}>
        <Input autoFocus {...register("fullName")} />
      </Field>

      <Field label="Email" error={errors.email?.message}>
        <Input type="email" {...register("email")} />
      </Field>

      <Field label="Téléphone" error={errors.phone?.message} hint="">
        <Input placeholder="06 12 34 56 78" {...register("phone")} />
      </Field>

      <Field label="Date d'acquisition *" error={errors.acquiredAt?.message}>
        <Input type="date" {...register("acquiredAt")} />
      </Field>

      <Field label="Statut">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              items={customerStatusLabels}
              value={field.value}
              onValueChange={(v) => field.onChange(v as CustomerStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customerStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {customerStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label="Commercial"
        span={2}
        hint="Optionnel — le membre de l'équipe qui suit ce client."
      >
        <Controller
          control={control}
          name="salespersonUserId"
          render={({ field }) => (
            <Select
              items={{
                [NO_SALESPERSON]: "Non assigné",
                ...Object.fromEntries(
                  members.map((m) => [m.userId, m.fullName]),
                ),
              }}
              value={field.value || NO_SALESPERSON}
              onValueChange={(v) => field.onChange(v ?? NO_SALESPERSON)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SALESPERSON}>Non assigné</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field label="Adresse" error={errors.address?.message} span={2}>
        <Input {...register("address")} />
      </Field>

      <Field label="Ville" error={errors.city?.message}>
        <Input {...register("city")} />
      </Field>

      <Field label="Code postal" error={errors.postalCode?.message}>
        <Input {...register("postalCode")} />
      </Field>

      <Field label="Tags" span={2} hint="Tapez puis Entrée pour ajouter.">
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} />
          )}
        />
      </Field>

      <Field label="Notes" error={errors.notes?.message} span={2}>
        <Textarea rows={4} {...register("notes")} />
      </Field>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  span,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  span?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", span === 2 && "sm:col-span-2")}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
