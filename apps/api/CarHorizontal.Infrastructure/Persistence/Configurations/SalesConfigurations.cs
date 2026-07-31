using CarHorizontal.Domain.Entities.Sales;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CarHorizontal.Infrastructure.Persistence.Configurations;

public class VehicleSaleListingConfiguration : IEntityTypeConfiguration<VehicleSaleListing>
{
    public void Configure(EntityTypeBuilder<VehicleSaleListing> builder)
    {
        builder.ToTable("vehicle_sale_listings");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.Title).HasMaxLength(200);
        builder.Property(l => l.Description).HasMaxLength(8000);
        builder.Property(l => l.Equipment).HasMaxLength(4000);
        builder.Property(l => l.InternalNotes).HasMaxLength(4000);
        builder.Property(l => l.Origin).HasMaxLength(120);
        builder.Property(l => l.BuyerName).HasMaxLength(160);

        builder.Property(l => l.AskingPrice).HasPrecision(12, 2);
        builder.Property(l => l.FloorPrice).HasPrecision(12, 2);
        builder.Property(l => l.PurchasePrice).HasPrecision(12, 2);
        builder.Property(l => l.ReconditioningCost).HasPrecision(12, 2);
        builder.Property(l => l.SoldPrice).HasPrecision(12, 2);

        builder.Property(l => l.Status).HasConversion<int>();

        // Un seul dossier de vente par véhicule : c'est ce qui autorise l'accès
        // « fiche véhicule → dossier » sans désambiguïsation côté appelant.
        builder.HasIndex(l => new { l.OrganizationId, l.VehicleId })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");

        // Vue « stock » : les véhicules en vente, triés par ancienneté d'annonce.
        builder.HasIndex(l => new { l.OrganizationId, l.Status, l.ListedAt });
    }
}

public class VehicleSalePriceChangeConfiguration : IEntityTypeConfiguration<VehicleSalePriceChange>
{
    public void Configure(EntityTypeBuilder<VehicleSalePriceChange> builder)
    {
        builder.ToTable("vehicle_sale_price_changes");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Price).HasPrecision(12, 2);
        builder.Property(p => p.PreviousPrice).HasPrecision(12, 2);
        builder.Property(p => p.Reason).HasMaxLength(500);

        builder.HasIndex(p => new { p.OrganizationId, p.ListingId, p.ChangedAt });
    }
}

public class VehicleSaleChannelPostConfiguration : IEntityTypeConfiguration<VehicleSaleChannelPost>
{
    public void Configure(EntityTypeBuilder<VehicleSaleChannelPost> builder)
    {
        builder.ToTable("vehicle_sale_channel_posts");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Channel).HasMaxLength(80).IsRequired();
        builder.Property(c => c.Url).HasMaxLength(2000);
        builder.Property(c => c.ExternalReference).HasMaxLength(120);
        builder.Property(c => c.Notes).HasMaxLength(1000);
        builder.Property(c => c.DisplayedPrice).HasPrecision(12, 2);
        builder.Property(c => c.Status).HasConversion<int>();

        builder.HasIndex(c => new { c.OrganizationId, c.ListingId });
    }
}

public class VehicleSalePhotoConfiguration : IEntityTypeConfiguration<VehicleSalePhoto>
{
    public void Configure(EntityTypeBuilder<VehicleSalePhoto> builder)
    {
        builder.ToTable("vehicle_sale_photos");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Caption).HasMaxLength(300);
        builder.Property(p => p.OriginalFileName).HasMaxLength(300);

        // La galerie lit toujours les photos d'un dossier dans l'ordre d'affichage.
        builder.HasIndex(p => new { p.OrganizationId, p.ListingId, p.SortOrder });
        builder.HasIndex(p => p.StoredFileId);
    }
}

public class VehicleSaleInquiryConfiguration : IEntityTypeConfiguration<VehicleSaleInquiry>
{
    public void Configure(EntityTypeBuilder<VehicleSaleInquiry> builder)
    {
        builder.ToTable("vehicle_sale_inquiries");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.LostReason).HasMaxLength(500);
        builder.Property(i => i.Notes).HasMaxLength(2000);
        builder.Property(i => i.OfferAmount).HasPrecision(12, 2);
        builder.Property(i => i.Channel).HasConversion<int>();
        builder.Property(i => i.Status).HasConversion<int>();

        builder.HasIndex(i => new { i.OrganizationId, i.ListingId, i.ReceivedAt });
        // Balayage des relances dues, tous véhicules confondus.
        builder.HasIndex(i => new { i.OrganizationId, i.Status, i.NextFollowUpAt });
        // Lecture depuis la fiche client : « sur quels véhicules ce contact a-t-il porté ? »
        builder.HasIndex(i => new { i.OrganizationId, i.CustomerId, i.ReceivedAt });
    }
}
