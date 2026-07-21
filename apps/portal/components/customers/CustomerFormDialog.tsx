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
import { AsyncButton } from "@/components/ui/AsyncButton";
import {
  customersApi,
  type CustomerDetail,
  type CustomerStatusApi,
} from "@/lib/api/customers";
import {
  customerFormSchema,
  emptyToUndefined,
  type CustomerFormValues,
} from "@/lib/schemas/customer";
import { queryKeys } from "@/lib/query/keys";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { extractApiErrorMessage } from "@/lib/api/errors";

type Mode =
  | { kind: "create"; defaultStatus?: CustomerStatusApi }
  | { kind: "edit"; customer: CustomerDetail };

export interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  onSaved?: (customer: CustomerDetail) => void;
}

function buildDefaults(status: CustomerStatusApi = "Active"): CustomerFormValues {
  return {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
    acquiredAt: new Date().toISOString().slice(0, 10),
    status,
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
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: buildDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      isEdit ? toFormValues(mode.customer) : buildDefaults(mode.defaultStatus),
    );
  }, [open, isEdit, mode, form]);

  const mutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = {
        fullName: values.fullName.trim(),
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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customers.all(),
      });
      if (isEdit) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.customers.detail(saved.id),
        });
      }
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(extractApiErrorMessage(error, "Une erreur est survenue."));
    },
  });

  const submit = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    await mutation.mutateAsync(form.getValues());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Modifier le client"
              : mode.defaultStatus === "Prospect"
                ? "Nouveau prospect"
                : "Nouveau client"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations de ce client."
              : mode.defaultStatus === "Prospect"
                ? "Ajoutez un prospect à suivre dans votre pipeline."
                : "Ajoutez un nouveau client à votre garage."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
        >
          <CustomerForm
            register={form.register}
            control={form.control}
            errors={form.formState.errors}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Annuler
            </Button>
            <AsyncButton type="submit" onClick={submit}>
              {isEdit ? "Enregistrer" : "Créer"}
            </AsyncButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
