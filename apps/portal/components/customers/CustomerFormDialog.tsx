"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2 } from "lucide-react";
import { customersApi, type CustomerDetail } from "@/lib/api/customers";
import {
  customerFormSchema,
  customerStatuses,
  customerStatusLabels,
  emptyToUndefined,
  type CustomerFormValues,
  type CustomerStatus,
} from "@/lib/schemas/customer";
import { queryKeys } from "@/lib/query/keys";
import { TagInput } from "@/components/customers/TagInput";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; customer: CustomerDetail };

export interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSaved?: (customer: CustomerDetail) => void;
}

function buildDefaults(): CustomerFormValues {
  return {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
    acquiredAt: new Date().toISOString().slice(0, 10),
    status: "Active",
    tags: [],
  };
}

function toFormValues(customer: CustomerDetail): CustomerFormValues {
  return {
    fullName: customer.fullName,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    postalCode: customer.postalCode ?? "",
    notes: customer.notes ?? "",
    acquiredAt: customer.acquiredAt.slice(0, 10),
    status: customer.status,
    tags: customer.tags,
  };
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  mode,
  onSaved,
}: CustomerFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = mode.kind === "edit";

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: buildDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(isEdit ? toFormValues(mode.customer) : buildDefaults());
  }, [open, isEdit, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = {
        fullName: values.fullName,
        email: emptyToUndefined(values.email),
        phone: emptyToUndefined(values.phone),
        address: emptyToUndefined(values.address),
        city: emptyToUndefined(values.city),
        postalCode: emptyToUndefined(values.postalCode),
        notes: emptyToUndefined(values.notes),
        acquiredAt: new Date(values.acquiredAt).toISOString(),
        status: values.status,
        tags: values.tags,
      };
      if (isEdit) {
        return customersApi.update(mode.customer.id, payload);
      }
      return customersApi.create(payload);
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Client mis à jour" : "Client créé");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all() });
      if (isEdit) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.customers.detail(saved.id),
        });
      }
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Une erreur est survenue.";
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le client" : "Nouveau client"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations de ce client."
              : "Ajoutez un nouveau client à votre garage."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <Field
            label="Nom complet *"
            error={form.formState.errors.fullName?.message}
            className="sm:col-span-2"
          >
            <Input autoFocus {...form.register("fullName")} />
          </Field>

          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </Field>

          <Field
            label="Téléphone (E.164)"
            error={form.formState.errors.phone?.message}
            hint="Ex. +33612345678"
          >
            <Input placeholder="+33..." {...form.register("phone")} />
          </Field>

          <Field
            label="Date d'acquisition *"
            error={form.formState.errors.acquiredAt?.message}
          >
            <Input type="date" {...form.register("acquiredAt")} />
          </Field>

          <Field label="Statut">
            <Select
              value={form.watch("status")}
              onValueChange={(v) =>
                form.setValue("status", v as CustomerStatus, {
                  shouldDirty: true,
                })
              }
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
          </Field>

          <Field
            label="Adresse"
            error={form.formState.errors.address?.message}
            className="sm:col-span-2"
          >
            <Input {...form.register("address")} />
          </Field>

          <Field label="Ville" error={form.formState.errors.city?.message}>
            <Input {...form.register("city")} />
          </Field>

          <Field
            label="Code postal"
            error={form.formState.errors.postalCode?.message}
          >
            <Input {...form.register("postalCode")} />
          </Field>

          <Field
            label="Tags"
            className="sm:col-span-2"
            hint="Tapez puis Entrée pour ajouter."
          >
            <TagInput
              value={form.watch("tags")}
              onChange={(tags) =>
                form.setValue("tags", tags, { shouldDirty: true })
              }
            />
          </Field>

          <Field
            label="Notes"
            error={form.formState.errors.notes?.message}
            className="sm:col-span-2"
          >
            <Textarea rows={4} {...form.register("notes")} />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
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

