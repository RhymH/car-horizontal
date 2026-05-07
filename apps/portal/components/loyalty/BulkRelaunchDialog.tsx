"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  remindersApi,
  reminderChannels,
  reminderChannelLabels,
  type ReminderChannelApi,
} from "@/lib/api/reminders";
import type { LoyaltyCustomer } from "@/lib/api/loyalty";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: LoyaltyCustomer[];
  defaultSelectedIds?: string[];
}

export function BulkRelaunchDialog({
  open,
  onOpenChange,
  candidates,
  defaultSelectedIds,
}: Props) {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<ReminderChannelApi>("Email");
  const [subject, setSubject] = useState("On prend de vos nouvelles");
  const [body, setBody] = useState(
    "Bonjour, cela fait un moment qu'on ne s'est pas vus. Souhaitez-vous prendre rendez-vous pour faire le point sur votre véhicule ?",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const initial = defaultSelectedIds && defaultSelectedIds.length > 0
      ? new Set(defaultSelectedIds)
      : new Set(candidates.map((c) => c.id));
    setSelected(initial);
  }, [open, candidates, defaultSelectedIds]);

  const selectedCount = selected.size;
  const allSelected = useMemo(
    () => candidates.length > 0 && selectedCount === candidates.length,
    [candidates.length, selectedCount],
  );

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const trimmedSubject = subject.trim();
      const trimmedBody = body.trim();
      const scheduledAt = new Date().toISOString();
      const results = await Promise.allSettled(
        ids.map((id) =>
          remindersApi.create({
            customerId: id,
            channel,
            scheduledAt,
            resolvedSubject: trimmedSubject || undefined,
            resolvedBody: trimmedBody || undefined,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { sent: ids.length - failed, failed };
    },
    onSuccess: async ({ sent, failed }) => {
      if (failed === 0) {
        toast.success(`${sent} rappel${sent > 1 ? "s" : ""} programmé${sent > 1 ? "s" : ""}`);
      } else {
        toast.warning(`${sent} envoyés, ${failed} en échec`);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.atRisk() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.lost() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.overview() }),
      ]);
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(extractApiErrorMessage(error, "La campagne a échoué.")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campagne de relance</DialogTitle>
          <DialogDescription>
            Programme un rappel personnalisé pour chaque client sélectionné.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Canal
            </Label>
            <Select
              items={reminderChannelLabels}
              value={channel}
              onValueChange={(v) => setChannel(v as ReminderChannelApi)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reminderChannels.map((c) => (
                  <SelectItem key={c} value={c}>
                    {reminderChannelLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Clients sélectionnés
            </Label>
            <div className="flex h-10 items-center justify-between rounded-md border border-input bg-muted/30 px-3 text-sm">
              <span>
                {selectedCount} / {candidates.length}
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {allSelected ? "Tout décocher" : "Tout cocher"}
              </button>
            </div>
          </div>
        </div>

        {channel !== "Sms" && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Sujet
            </Label>
            <Textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={1}
              className="min-h-9"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Message
          </Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Destinataires
          </Label>
          <ScrollArea className="h-44 rounded-md border border-border">
            <ul className="divide-y divide-border">
              {candidates.map((c) => {
                const checked = selected.has(c.id);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleOne(c.id)}
                      id={`relaunch-${c.id}`}
                    />
                    <label
                      htmlFor={`relaunch-${c.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{c.fullName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.daysSinceLastContact ?? "—"}j sans contact
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={selectedCount === 0 || mutation.isPending}
            onClick={() => void mutation.mutateAsync()}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Lancer la campagne ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
