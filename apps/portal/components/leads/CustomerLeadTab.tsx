"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlarmClock,
  CalendarPlus,
  Check,
  History,
  Loader2,
  Mail,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Phone,
  StickyNote,
  Users as UsersIcon,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AsyncButton } from "@/components/ui/AsyncButton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  leadsApi,
  type LeadFollowUp,
  type LeadStageApi,
} from "@/lib/api/leads";
import type { InteractionTypeApi } from "@/lib/api/customers";
import { queryKeys } from "@/lib/query/keys";
import { extractApiErrorMessage } from "@/lib/api/errors";
import {
  followUpChannelLabels,
  leadSourceLabels,
} from "@/lib/schemas/lead";
import { LeadStagePipeline } from "@/components/leads/LeadStagePipeline";
import { isOverdue } from "@/components/leads/LeadsTable";
import { FollowUpDialog } from "@/components/leads/FollowUpDialog";
import { CompleteFollowUpDialog } from "@/components/leads/CompleteFollowUpDialog";
import { LeadInfoDialog } from "@/components/leads/LeadInfoDialog";

const TYPE_ICON: Record<InteractionTypeApi, LucideIcon> = {
  Call: Phone,
  Visit: UsersIcon,
  Sms: MessageSquare,
  Email: Mail,
  Note: StickyNote,
};

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export interface CustomerLeadTabProps {
  customerId: string;
  onAddInteraction: () => void;
}

export function CustomerLeadTab({
  customerId,
  onAddInteraction,
}: CustomerLeadTabProps) {
  const queryClient = useQueryClient();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<LeadFollowUp | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LeadFollowUp | null>(null);
  const [winOpen, setWinOpen] = useState(false);
  const [loseOpen, setLoseOpen] = useState(false);

  const detail = useQuery({
    queryKey: queryKeys.leads.detail(customerId),
    queryFn: ({ signal }) => leadsApi.get(customerId, signal),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(customerId),
      }),
    ]);
  };

  const stageMutation = useMutation({
    mutationFn: ({
      stage,
      lostReason,
    }: {
      stage: LeadStageApi;
      lostReason?: string;
    }) => {
      const lead = detail.data!;
      return leadsApi.update(customerId, {
        stage,
        source: lead.source,
        sourceDetail: lead.sourceDetail ?? undefined,
        assignedToUserId: lead.assignedToUserId,
        interestSummary: lead.interestSummary ?? undefined,
        lostReason,
      });
    },
    onSuccess: async (_data, vars) => {
      toast.success(
        vars.stage === "Won"
          ? "Prospect converti en client 🎉"
          : vars.stage === "Lost"
            ? "Prospect marqué comme perdu"
            : "Étape mise à jour",
      );
      await invalidate();
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Mise à jour impossible.")),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => leadsApi.cancelFollowUp(id),
    onSuccess: async () => {
      toast.success("Relance annulée");
      await invalidate();
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Annulation impossible.")),
  });

  if (detail.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Impossible de charger le suivi prospect.
      </p>
    );
  }

  const lead = detail.data;
  const pendingFollowUps = lead.followUps.filter((f) => f.status === "Pending");
  const pastFollowUps = lead.followUps.filter((f) => f.status !== "Pending");

  return (
    <div className="space-y-4">
      <LeadStagePipeline
        stage={lead.stage}
        lostReason={lead.lostReason}
        pending={stageMutation.isPending}
        onStageSelect={(stage) => stageMutation.mutate({ stage })}
        onWin={() => setWinOpen(true)}
        onLose={() => setLoseOpen(true)}
        onReopen={() => stageMutation.mutate({ stage: "Contacted" })}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <SectionCard
            title="Informations de suivi"
            actions={
              <Button variant="outline" size="sm" onClick={() => setInfoOpen(true)}>
                <Pencil />
                Modifier
              </Button>
            }
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Source
                </dt>
                <dd>
                  {leadSourceLabels[lead.source]}
                  {lead.sourceDetail ? ` · ${lead.sourceDetail}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Vendeur responsable
                </dt>
                <dd className={lead.assignedToName ? "" : "text-muted-foreground"}>
                  {lead.assignedToName ?? "Personne — pensez à assigner"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Projet du prospect
                </dt>
                <dd
                  className={cn(
                    "whitespace-pre-line",
                    !lead.interestSummary && "text-muted-foreground",
                  )}
                >
                  {lead.interestSummary ??
                    "Non renseigné. Notez le véhicule recherché, le budget, l'échéance…"}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title="Relances planifiées"
            description={
              pendingFollowUps.length === 0
                ? "Aucune relance à venir"
                : `${pendingFollowUps.length} relance(s) à venir`
            }
            actions={
              <Button size="sm" onClick={() => setFollowUpOpen(true)}>
                <CalendarPlus />
                Planifier
              </Button>
            }
          >
            {pendingFollowUps.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <AlarmClock className="size-4 shrink-0" />
                <span>
                  Aucune relance planifiée : ce prospect risque de tomber dans
                  l&apos;oubli. Planifiez la prochaine action.
                </span>
              </div>
            ) : (
              <ul className="space-y-2">
                {pendingFollowUps.map((f) => {
                  const overdue = isOverdue(f.dueAt);
                  const Icon = TYPE_ICON[f.channel];
                  return (
                    <li
                      key={f.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center",
                        overdue
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          overdue
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            overdue && "text-destructive",
                          )}
                        >
                          {dateFmt.format(new Date(f.dueAt))}
                          {overdue && " — en retard"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {followUpChannelLabels[f.channel]}
                          {f.note ? ` · ${f.note}` : ""}
                          {f.assignedToName ? ` · ${f.assignedToName}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCompleteTarget(f)}
                        >
                          <Check />
                          Faite
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Annuler la relance"
                          onClick={() => setCancelTarget(f)}
                        >
                          <X />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {pastFollowUps.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Relances passées
                </p>
                <ul className="space-y-1.5">
                  {pastFollowUps.slice(0, 5).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      {f.status === "Done" ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                      <span className="tabular-nums">
                        {dateFmt.format(new Date(f.dueAt))}
                      </span>
                      <span className="truncate">
                        {followUpChannelLabels[f.channel]}
                        {f.note ? ` · ${f.note}` : ""}
                      </span>
                      <span className="ml-auto shrink-0 text-xs">
                        {f.status === "Done" ? "Faite" : "Annulée"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Historique des interactions"
            description={
              lead.interactions.length === 0
                ? "Aucune interaction enregistrée"
                : `${lead.interactions.length} interaction(s)`
            }
            actions={
              <Button variant="outline" size="sm" onClick={onAddInteraction}>
                <MessageSquarePlus />
                Ajouter
              </Button>
            }
          >
            {lead.interactions.length === 0 ? (
              <EmptyState
                icon={History}
                title="Aucune interaction"
                description="Chaque appel, visite ou message compte : consignez-les pour garder le fil."
                action={
                  <Button size="sm" onClick={onAddInteraction}>
                    <MessageSquarePlus />
                    Première interaction
                  </Button>
                }
              />
            ) : (
              <ol className="relative space-y-4 pl-6">
                <span
                  aria-hidden
                  className="absolute left-2 top-1.5 bottom-1.5 w-px bg-border"
                />
                {lead.interactions.map((i) => {
                  const Icon = TYPE_ICON[i.type];
                  return (
                    <li key={i.id} className="relative">
                      <span className="absolute -left-6 top-1 flex size-4 items-center justify-center rounded-full bg-primary/10 ring-2 ring-background">
                        <Icon className="size-2.5 text-primary" />
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="font-medium uppercase tracking-wide">
                            {followUpChannelLabels[i.type]}
                            {i.authorName ? ` · ${i.authorName}` : ""}
                          </span>
                          <time dateTime={i.occurredAt}>
                            {dateTimeFmt.format(new Date(i.occurredAt))}
                          </time>
                        </div>
                        <p className="mt-0.5 text-sm leading-snug">{i.summary}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>
        </div>
      </div>

      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        customerId={customerId}
        customerName={lead.fullName}
      />

      <LeadInfoDialog open={infoOpen} onOpenChange={setInfoOpen} lead={lead} />

      {completeTarget && (
        <CompleteFollowUpDialog
          open={completeTarget !== null}
          onOpenChange={(o) => !o && setCompleteTarget(null)}
          followUp={completeTarget}
          onPlanNext={() => setFollowUpOpen(true)}
        />
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Annuler cette relance ?"
        description="Elle ne sera plus proposée. L'historique n'est pas modifié."
        confirmLabel="Annuler la relance"
        variant="destructive"
        onConfirm={async () => {
          if (!cancelTarget) return;
          await cancelMutation.mutateAsync(cancelTarget.id);
          setCancelTarget(null);
        }}
      />

      <ConfirmDialog
        open={winOpen}
        onOpenChange={setWinOpen}
        title="Marquer ce prospect comme gagné ?"
        description={`${lead.fullName} passera en client actif du garage. Les relances en attente restent consultables.`}
        confirmLabel="C'est gagné"
        onConfirm={async () => {
          await stageMutation.mutateAsync({ stage: "Won" });
          setWinOpen(false);
        }}
      />

      <LoseDialog
        open={loseOpen}
        onOpenChange={setLoseOpen}
        pending={stageMutation.isPending}
        onConfirm={async (reason) => {
          await stageMutation.mutateAsync({
            stage: "Lost",
            lostReason: reason || undefined,
          });
          setLoseOpen(false);
        }}
      />
    </div>
  );
}

function LoseDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setReason("");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marquer comme perdu</DialogTitle>
          <DialogDescription>
            La raison aide à comprendre ce qui bloque (prix, délai, concurrent…)
            et à améliorer vos prochaines ventes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Raison de la perte
          </Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex. : a acheté ailleurs, budget insuffisant, plus de réponse…"
            maxLength={500}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <AsyncButton
            variant="destructive"
            onClick={() => onConfirm(reason.trim())}
          >
            Marquer comme perdu
          </AsyncButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
