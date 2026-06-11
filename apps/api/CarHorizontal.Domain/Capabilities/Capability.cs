namespace CarHorizontal.Domain.Capabilities;

/// <summary>
/// Metadata describing a plugin capability that an organization can enable.
/// </summary>
/// <param name="Key">Stable machine key (used in JWT/config/DB). Never change once shipped.</param>
/// <param name="Label">Human label shown in the UI.</param>
/// <param name="Description">Short explanation of what the plugin provides.</param>
/// <param name="DefaultEnabled">
/// Effective value when an organization has no explicit row. Plugins ship OFF by
/// default (opt-in / sellable add-ons); flip per org via the admin toggle.
/// </param>
public sealed record CapabilityInfo(string Key, string Label, string Description, bool DefaultEnabled);

/// <summary>
/// Central registry of plugin capabilities — the single source of truth.
/// Adding a plugin = adding one entry here; the gating, the /me/capabilities
/// endpoint and the admin toggle all read from this list.
/// </summary>
public static class Capabilities
{
    public const string Leasing = "leasing";
    public const string Sales = "sales";
    public const string Promotions = "promotions";
    public const string ArticleRecommendations = "article-recommendations";
    public const string ClientPortal = "client-portal";

    /// <summary>All known capabilities. Order is the suggested display order.</summary>
    public static readonly IReadOnlyList<CapabilityInfo> All = new[]
    {
        new CapabilityInfo(Leasing, "Leasing",
            "Suivi des contrats de leasing et des échéances associées (fin de contrat, plafond kilométrique, renouvellement).", false),
        new CapabilityInfo(Sales, "Vente de véhicules",
            "Gestion de la vente de véhicules.", false),
        new CapabilityInfo(Promotions, "Offres & promotions",
            "Campagnes et offres commerciales poussées aux clients.", false),
        new CapabilityInfo(ArticleRecommendations, "Recommandation d'articles",
            "Suggestions de produits pertinents par véhicule (huile, kit d'entretien…).", false),
        new CapabilityInfo(ClientPortal, "Portail client",
            "Accès client : suivi du véhicule, saisie kilométrage, prise de contact.", false),
    };

    /// <summary>True when the key matches a known capability.</summary>
    public static bool IsKnown(string key) => Find(key) is not null;

    public static CapabilityInfo? Find(string key) =>
        All.FirstOrDefault(c => string.Equals(c.Key, key, StringComparison.OrdinalIgnoreCase));
}
