"use client";

import { Car, CircleCheck, FileText, Pencil, TriangleAlert } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RegistrationDetail, RegistrationReadiness } from "@/lib/api/sales";
import { numberFmt, shortDate } from "@/components/sales/saleFormat";
import { cn } from "@/lib/utils";

/**
 * Données du certificat d'immatriculation, avec l'encart d'aide qui liste ce qui
 * manque encore pour monter le dossier. Les repères officiels (B, D.2, P.6…) sont
 * affichés à côté de chaque valeur pour que la recopie depuis la carte grise soit
 * mécanique.
 */
export function RegistrationSection({
  registration,
  readiness,
  onEdit,
  onEditVehicle,
}: {
  registration: RegistrationDetail | null;
  readiness: RegistrationReadiness;
  onEdit: () => void;
  /** Ouvre la fiche véhicule : certains champs attendus (VIN, plaque) y vivent. */
  onEditVehicle: () => void;
}) {
  const r = registration;

  return (
    <div className="flex flex-col gap-4">
      <RegistrationReadinessCard
        readiness={readiness}
        onEdit={onEdit}
        onEditVehicle={onEditVehicle}
      />

      <SectionCard
        title="Certificat d'immatriculation"
        description="Ce qui figure sur la carte grise du véhicule"
        actions={
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            {r ? "Modifier" : "Saisir"}
          </Button>
        }
      >
        {!r ? (
          <p className="py-2 text-sm text-muted-foreground">
            Aucune donnée saisie. Renseignez la carte grise une fois : elle servira
            ensuite pour la vente, la cession et toute démarche d&apos;immatriculation.
          </p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Item marker="B" label="1re immatriculation" value={shortDate(r.firstRegisteredAt)} />
            <Item marker="I" label="Date du certificat" value={shortDate(r.certificateIssuedAt)} />
            <Item label="N° de formule" value={r.certificateFormulaNumber} />
            <Item marker="C.1" label="Titulaire" value={r.holderName} />
            <Item marker="C.3" label="Adresse" value={r.holderAddress} />
            <Item marker="D.2" label="Type/variante/version" value={r.typeVariantVersion} />
            <Item marker="D.2.1" label="Type national" value={r.nationalTypeCode} />
            <Item marker="D.3" label="Dénomination commerciale" value={r.commercialName} />
            <Item marker="K" label="Réception par type" value={r.typeApprovalNumber} />
            <Item marker="J" label="Catégorie CE" value={r.euCategory} />
            <Item marker="J.1" label="Genre national" value={r.nationalGenre} />
            <Item marker="J.3" label="Carrosserie" value={r.nationalBodyType} />
            <Item marker="F.1" label="MMA technique" value={kg(r.technicallyPermissibleMaxMassKg)} />
            <Item marker="F.2" label="MMA en service" value={kg(r.maxMassInServiceKg)} />
            <Item marker="G" label="Masse en service" value={kg(r.massInServiceKg)} />
            <Item marker="G.1" label="Poids à vide national" value={kg(r.nationalEmptyMassKg)} />
            <Item
              marker="P.1"
              label="Cylindrée"
              value={r.engineDisplacementCm3 ? `${numberFmt.format(r.engineDisplacementCm3)} cm³` : null}
            />
            <Item
              marker="P.2"
              label="Puissance nette"
              value={r.maxNetPowerKw ? `${r.maxNetPowerKw} kW` : null}
            />
            <Item marker="P.3" label="Carburant" value={r.fuelCode} />
            <Item
              marker="P.6"
              label="Puissance administrative"
              value={r.fiscalHorsepower ? `${r.fiscalHorsepower} CV` : null}
            />
            <Item marker="S.1" label="Places assises" value={r.seatingCapacity?.toString()} />
            <Item
              marker="V.7"
              label="CO₂"
              value={r.co2GramsPerKm != null ? `${r.co2GramsPerKm} g/km` : null}
            />
            <Item marker="V.9" label="Classe environnementale" value={r.emissionClass} />
            <Item
              marker="X.1"
              label="Dernier contrôle technique"
              value={shortDate(r.lastTechnicalInspectionAt)}
            />
            <Item
              label="Validité du contrôle technique"
              value={shortDate(r.technicalInspectionValidUntil)}
            />
          </dl>
        )}
      </SectionCard>
    </div>
  );
}

/**
 * Champs de la checklist qui ne sont pas sur la carte grise mais sur la fiche
 * véhicule : les corriger passe par « Modifier le véhicule », pas par le
 * formulaire de carte grise.
 */
const VEHICLE_FIELDS = new Set(["licensePlate", "vin", "make", "currentMileage"]);

/** Encart d'aide : ce qu'il reste à saisir pour immatriculer ou céder le véhicule. */
function RegistrationReadinessCard({
  readiness,
  onEdit,
  onEditVehicle,
}: {
  readiness: RegistrationReadiness;
  onEdit: () => void;
  onEditVehicle: () => void;
}) {
  const required = readiness.missing.filter((m) => m.level === "Required");
  const recommended = readiness.missing.filter((m) => m.level === "Recommended");
  const complete = readiness.missing.length === 0;
  const needsVehicleEdit = readiness.missing.some((m) => VEHICLE_FIELDS.has(m.field));
  const needsRegistrationEdit = readiness.missing.some(
    (m) => !VEHICLE_FIELDS.has(m.field),
  );

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4",
        complete
          ? "border-emerald-500/30 bg-emerald-500/5"
          : readiness.isReady
            ? "border-border bg-muted/30"
            : "border-amber-500/40 bg-amber-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
              complete
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            )}
          >
            {complete ? (
              <CircleCheck className="size-4" />
            ) : (
              <TriangleAlert className="size-4" />
            )}
          </span>
          <div>
            <h3 className="text-sm font-semibold">
              {complete
                ? "Dossier d'immatriculation complet"
                : readiness.isReady
                  ? "Dossier d'immatriculation prêt"
                  : "Dossier d'immatriculation incomplet"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {complete
                ? "Toutes les informations attendues sont renseignées."
                : readiness.isReady
                  ? "Les informations obligatoires sont là ; quelques compléments sont recommandés."
                  : `Il manque ${required.length} information${required.length > 1 ? "s" : ""} obligatoire${required.length > 1 ? "s" : ""}.`}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-lg font-semibold tabular-nums">
          {readiness.completionPercent}%
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            readiness.isReady ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${readiness.completionPercent}%` }}
        />
      </div>

      {readiness.technicalInspectionWarning && (
        <p className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {readiness.technicalInspectionWarning}
        </p>
      )}

      {readiness.missing.length > 0 && (
        <div className="mt-3 space-y-2">
          <MissingList title="Obligatoire" items={required} tone="required" />
          <MissingList title="Recommandé" items={recommended} tone="recommended" />
          <div className="mt-1 flex flex-wrap gap-2">
            {needsRegistrationEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <FileText />
                Compléter la carte grise
              </Button>
            )}
            {needsVehicleEdit && (
              <Button variant="outline" size="sm" onClick={onEditVehicle}>
                <Car />
                Compléter la fiche véhicule
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MissingList({
  title,
  items,
  tone,
}: {
  title: string;
  items: { field: string; marker: string | null; label: string }[];
  tone: "required" | "recommended";
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item.field}>
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                tone === "required"
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground",
              )}
            >
              {item.marker && (
                <span className="mr-1 font-mono text-[10px] opacity-70">{item.marker}</span>
              )}
              {item.label}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Item({
  marker,
  label,
  value,
}: {
  marker?: string;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {marker && (
          <span className="rounded bg-muted px-1 font-mono text-[10px]">{marker}</span>
        )}
        {label}
      </dt>
      <dd className="text-sm">{value && value !== "—" ? value : "—"}</dd>
    </div>
  );
}

function kg(value: number | null): string | null {
  return value == null ? null : `${numberFmt.format(value)} kg`;
}
