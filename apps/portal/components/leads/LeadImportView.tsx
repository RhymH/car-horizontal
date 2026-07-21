"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  MinusCircle,
  RefreshCw,
  Upload,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsBadge, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  leadsApi,
  type LeadImportResult,
  type LeadImportRow,
  type LeadSourceApi,
} from "@/lib/api/leads";
import { extractApiErrorMessage } from "@/lib/api/errors";
import { leadSourceLabels } from "@/lib/schemas/lead";
import {
  autoMapColumns,
  IMPORT_FIELD_HINTS,
  IMPORT_FIELD_LABELS,
  IMPORT_FIELDS,
  parseCsv,
  type ImportField,
  type ParsedCsv,
} from "@/lib/leads/csv";

const IGNORE = "ignore";

type Step = "file" | "mapping" | "preview" | "done";

const ACTION_LABELS: Record<string, string> = {
  Created: "Créé",
  Updated: "Complété",
  Skipped: "Ignoré",
  Error: "Erreur",
};

const ACTION_TONES: Record<string, "success" | "info" | "neutral" | "danger"> = {
  Created: "success",
  Updated: "info",
  Skipped: "neutral",
  Error: "danger",
};

const MATCHED_BY_LABELS: Record<string, string> = {
  ExternalRef: "réf. externe",
  Phone: "téléphone",
  Email: "email",
};

export function LeadImportView() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [defaultSource, setDefaultSource] = useState<LeadSourceApi>("Import");
  const [preview, setPreview] = useState<LeadImportResult | null>(null);
  const [finalResult, setFinalResult] = useState<LeadImportResult | null>(null);
  const [resultFilter, setResultFilter] = useState<string>("All");

  const readFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error("Fichier vide ou illisible.");
        return;
      }
      if (parsed.rows.length > 2000) {
        toast.error("Maximum 2 000 lignes par import. Découpez votre fichier.");
        return;
      }
      setFileName(file.name);
      setCsv(parsed);
      setMapping(autoMapColumns(parsed.headers));
      setPreview(null);
      setStep("mapping");
    } catch {
      toast.error("Impossible de lire ce fichier.");
    }
  };

  const buildRows = (): LeadImportRow[] => {
    if (!csv) return [];
    const get = (row: string[], field: ImportField): string | undefined => {
      const idx = mapping[field];
      if (idx === undefined) return undefined;
      const v = row[idx]?.trim();
      return v ? v : undefined;
    };
    return csv.rows.map((row) => ({
      externalRef: get(row, "externalRef"),
      fullName: get(row, "fullName") ?? "",
      email: get(row, "email"),
      phone: get(row, "phone"),
      address: get(row, "address"),
      city: get(row, "city"),
      postalCode: get(row, "postalCode"),
      notes: get(row, "notes"),
      interestSummary: get(row, "interestSummary"),
      sourceDetail: get(row, "sourceDetail"),
      tags: get(row, "tags")
        ?.split(/[|/]/)
        .map((t) => t.trim())
        .filter(Boolean),
    }));
  };

  const dryRunMutation = useMutation({
    mutationFn: () =>
      leadsApi.import({
        fileName,
        dryRun: true,
        defaultSource,
        rows: buildRows(),
      }),
    onSuccess: (result) => {
      setPreview(result);
      setResultFilter("All");
      setStep("preview");
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Analyse du fichier impossible.")),
  });

  const commitMutation = useMutation({
    mutationFn: () =>
      leadsApi.import({
        fileName,
        dryRun: false,
        defaultSource,
        rows: buildRows(),
      }),
    onSuccess: (result) => {
      setFinalResult(result);
      setResultFilter("All");
      setStep("done");
      toast.success(
        `Import terminé : ${result.created} créé(s), ${result.updated} complété(s).`,
      );
    },
    onError: (e) =>
      toast.error(extractApiErrorMessage(e, "Import impossible.")),
  });

  const mappedCount = Object.values(mapping).filter(
    (v) => v !== undefined,
  ).length;
  const hasIdentityColumn =
    mapping.externalRef !== undefined ||
    mapping.phone !== undefined ||
    mapping.email !== undefined;
  const canPreview = csv !== null && mapping.fullName !== undefined;

  const activeResult = step === "done" ? finalResult : preview;
  const filteredRows = useMemo(() => {
    if (!activeResult) return [];
    if (resultFilter === "All") return activeResult.rows;
    return activeResult.rows.filter((r) => r.action === resultFilter);
  }, [activeResult, resultFilter]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          href="/clients"
          className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux clients
        </Link>
      </div>
      <PageHeader
        title="Import de prospects"
        description="Importez une liste CSV. Ré-importer le même fichier ne crée jamais de doublons : les fiches existantes sont retrouvées par référence externe, téléphone ou email."
      />

      <StepIndicator step={step} />

      {step === "file" && (
        <SectionCard
          title="1. Choisissez votre fichier"
          actions={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href="/modele-import-prospects.csv"
                  download="modele-import-prospects.csv"
                />
              }
            >
              <Download />
              Télécharger le modèle
            </Button>
          }
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
            className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSpreadsheet className="size-6" />
            </span>
            <span className="text-sm font-medium">
              Glissez votre fichier CSV ici ou cliquez pour parcourir
            </span>
            <span className="text-xs text-muted-foreground">
              Jusqu&apos;à 2 000 lignes. Séparateur point-virgule, virgule ou
              tabulation — détecté automatiquement.
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
              e.target.value = "";
            }}
          />
          <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Conseil</p>
            <p>
              Incluez une colonne d&apos;identifiant unique (référence, id) en
              plus du téléphone et de l&apos;email : c&apos;est elle qui garantit
              un ré-import sans doublons, même si un numéro change.
            </p>
          </div>
        </SectionCard>
      )}

      {step === "mapping" && csv && (
        <SectionCard
          title="2. Faites correspondre les colonnes"
          description={`${fileName} — ${csv.rows.length} ligne(s), ${csv.headers.length} colonne(s). ${mappedCount} champ(s) reconnu(s) automatiquement.`}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCsv(null);
                setStep("file");
              }}
            >
              <RefreshCw />
              Changer de fichier
            </Button>
          }
        >
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {IMPORT_FIELDS.map((field) => {
              const columnItems: Record<string, string> = {
                [IGNORE]: "— Ignorer —",
                ...Object.fromEntries(
                  csv.headers.map((h, i) => [String(i), h || `Colonne ${i + 1}`]),
                ),
              };
              const missingRequired =
                field === "fullName" && mapping.fullName === undefined;
              return (
                <div key={field} className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "text-xs font-medium uppercase tracking-wide",
                      missingRequired ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {IMPORT_FIELD_LABELS[field]}
                    {field === "fullName" && " *"}
                  </span>
                  <Select
                    items={columnItems}
                    value={
                      mapping[field] === undefined ? IGNORE : String(mapping[field])
                    }
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...m,
                        [field]: v === IGNORE || v === null ? undefined : Number(v),
                      }))
                    }
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IGNORE}>— Ignorer —</SelectItem>
                      {csv.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Colonne ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {IMPORT_FIELD_HINTS[field] && (
                    <span className="text-xs text-muted-foreground">
                      {IMPORT_FIELD_HINTS[field]}
                    </span>
                  )}
                </div>
              );
            })}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Source par défaut
              </span>
              <Select
                items={leadSourceLabels}
                value={defaultSource}
                onValueChange={(v) => setDefaultSource(v as LeadSourceApi)}
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(leadSourceLabels) as LeadSourceApi[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {leadSourceLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Appliquée aux nouveaux prospects créés par cet import.
              </span>
            </div>
          </div>

          {!hasIdentityColumn && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Aucune colonne d&apos;identification (référence, téléphone ou
                email) n&apos;est mappée : toutes les lignes seront rejetées, car
                rien ne permettrait d&apos;éviter les doublons au prochain
                import.
              </span>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => dryRunMutation.mutate()}
              disabled={!canPreview || dryRunMutation.isPending}
            >
              {dryRunMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ArrowRight />
              )}
              Analyser le fichier
            </Button>
          </div>
        </SectionCard>
      )}

      {(step === "preview" || step === "done") && activeResult && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryCard
              icon={UserPlus}
              tone="success"
              label={step === "done" ? "Créés" : "Seront créés"}
              value={activeResult.created}
            />
            <SummaryCard
              icon={CheckCircle2}
              tone="info"
              label={step === "done" ? "Complétés" : "Seront complétés"}
              value={activeResult.updated}
            />
            <SummaryCard
              icon={MinusCircle}
              tone="neutral"
              label="Ignorés (déjà présents)"
              value={activeResult.skipped}
            />
            <SummaryCard
              icon={AlertTriangle}
              tone="danger"
              label="Erreurs"
              value={activeResult.errors}
            />
          </div>

          <SectionCard
            title={
              step === "done"
                ? "Rapport d'import"
                : "3. Vérifiez avant d'importer"
            }
            description={
              step === "done"
                ? `${fileName} — import terminé. Rien n'a été écrasé : seuls les champs vides des fiches existantes ont été complétés.`
                : "Aucune donnée n'a encore été enregistrée. Les fiches déjà connues sont retrouvées par référence, téléphone ou email — jamais par simple similarité de nom."
            }
            actions={
              step === "preview" ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("mapping")}
                  >
                    <ArrowLeft />
                    Corriger le mapping
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => commitMutation.mutate()}
                    disabled={
                      commitMutation.isPending ||
                      activeResult.created + activeResult.updated === 0
                    }
                  >
                    {commitMutation.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Upload />
                    )}
                    Importer ({activeResult.created + activeResult.updated})
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCsv(null);
                      setPreview(null);
                      setFinalResult(null);
                      setStep("file");
                    }}
                  >
                    <RefreshCw />
                    Nouvel import
                  </Button>
                  <Button size="sm" onClick={() => router.push("/clients")}>
                    Voir les prospects
                  </Button>
                </div>
              )
            }
          >
            <Tabs
              value={resultFilter}
              onValueChange={(v) => v && setResultFilter(v)}
            >
              <TabsList size="sm">
                <TabsTrigger value="All">
                  Tout
                  <TabsBadge>{activeResult.rows.length}</TabsBadge>
                </TabsTrigger>
                {(["Created", "Updated", "Skipped", "Error"] as const).map(
                  (action) => {
                    const count = activeResult.rows.filter(
                      (r) => r.action === action,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <TabsTrigger key={action} value={action}>
                        {ACTION_LABELS[action]}
                        <TabsBadge>{count}</TabsBadge>
                      </TabsTrigger>
                    );
                  },
                )}
              </TabsList>
            </Tabs>
            <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-14">Ligne</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Résultat</TableHead>
                    <TableHead>Détail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {r.row}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.customerId && step === "done" ? (
                          <Link
                            href={`/clients/${r.customerId}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {r.fullName || "—"}
                          </Link>
                        ) : (
                          (r.fullName || "—")
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={ACTION_TONES[r.action] ?? "neutral"}>
                          {ACTION_LABELS[r.action] ?? r.action}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[
                          r.matchedBy
                            ? `Retrouvé par ${MATCHED_BY_LABELS[r.matchedBy] ?? r.matchedBy}`
                            : null,
                          r.message,
                        ]
                          .filter(Boolean)
                          .join(" — ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "file", label: "Fichier" },
    { key: "mapping", label: "Colonnes" },
    { key: "preview", label: "Vérification" },
    { key: "done", label: "Import" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="h-px w-6 bg-border" />}
          <span
            className={cn(
              "flex items-center gap-1.5",
              i === currentIndex
                ? "font-medium text-foreground"
                : i < currentIndex
                  ? "text-primary"
                  : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-xs",
                i === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : i < currentIndex
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i < currentIndex ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </span>
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SummaryCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIconType;
  tone: "success" | "info" | "neutral" | "danger";
  label: string;
  value: number;
}) {
  const toneClasses: Record<string, string> = {
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    info: "bg-primary/10 text-primary",
    neutral: "bg-muted text-muted-foreground",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          toneClasses[tone],
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

type LucideIconType = React.ComponentType<{ className?: string }>;
