using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleSalesModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vehicle_registration_details",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstRegisteredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CertificateIssuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    HolderName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    HolderAddress = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    TypeVariantVersion = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    NationalTypeCode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    CommercialName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    TypeApprovalNumber = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    EuCategory = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    NationalGenre = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    EuBodyType = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    NationalBodyType = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    TechnicallyPermissibleMaxMassKg = table.Column<int>(type: "integer", nullable: true),
                    MaxMassInServiceKg = table.Column<int>(type: "integer", nullable: true),
                    MaxTrainMassKg = table.Column<int>(type: "integer", nullable: true),
                    MassInServiceKg = table.Column<int>(type: "integer", nullable: true),
                    NationalEmptyMassKg = table.Column<int>(type: "integer", nullable: true),
                    EngineDisplacementCm3 = table.Column<int>(type: "integer", nullable: true),
                    MaxNetPowerKw = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    FuelCode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    FiscalHorsepower = table.Column<int>(type: "integer", nullable: true),
                    PowerToMassRatio = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true),
                    SeatingCapacity = table.Column<int>(type: "integer", nullable: true),
                    StandingCapacity = table.Column<int>(type: "integer", nullable: true),
                    SoundLevelDb = table.Column<int>(type: "integer", nullable: true),
                    EngineSpeedRpm = table.Column<int>(type: "integer", nullable: true),
                    Co2GramsPerKm = table.Column<int>(type: "integer", nullable: true),
                    EmissionClass = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    LastTechnicalInspectionAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TechnicalInspectionValidUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CertificateFormulaNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_registration_details", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_sale_channel_posts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Channel = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ExternalReference = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisplayedPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_sale_channel_posts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_sale_inquiries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContactName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Channel = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OfferAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    TestDriveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NextFollowUpAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LostReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_sale_inquiries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_sale_listings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: true),
                    Equipment = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    InternalNotes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    AskingPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    FloorPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    PurchasePrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    ReconditioningCost = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    IsPriceNegotiable = table.Column<bool>(type: "boolean", nullable: false),
                    SoldPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    SoldAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SoldToCustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    BuyerName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    ListedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Origin = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    OwnersCount = table.Column<int>(type: "integer", nullable: true),
                    HasServiceBook = table.Column<bool>(type: "boolean", nullable: false),
                    HasRegistrationCertificate = table.Column<bool>(type: "boolean", nullable: false),
                    NonPledgeCertificateAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    KeysCount = table.Column<int>(type: "integer", nullable: true),
                    WarrantyMonths = table.Column<int>(type: "integer", nullable: true),
                    IsDamagedHistory = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_sale_listings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_sale_photos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    StoredFileId = table.Column<Guid>(type: "uuid", nullable: false),
                    ThumbnailFileId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Caption = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    OriginalSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    OriginalFileName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_sale_photos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_sale_price_changes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Price = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PreviousPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_sale_price_changes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_registration_details_OrganizationId_VehicleId",
                table: "vehicle_registration_details",
                columns: new[] { "OrganizationId", "VehicleId" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_channel_posts_OrganizationId_ListingId",
                table: "vehicle_sale_channel_posts",
                columns: new[] { "OrganizationId", "ListingId" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_inquiries_OrganizationId_ListingId_ReceivedAt",
                table: "vehicle_sale_inquiries",
                columns: new[] { "OrganizationId", "ListingId", "ReceivedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_inquiries_OrganizationId_Status_NextFollowUpAt",
                table: "vehicle_sale_inquiries",
                columns: new[] { "OrganizationId", "Status", "NextFollowUpAt" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_listings_OrganizationId_Status_ListedAt",
                table: "vehicle_sale_listings",
                columns: new[] { "OrganizationId", "Status", "ListedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_listings_OrganizationId_VehicleId",
                table: "vehicle_sale_listings",
                columns: new[] { "OrganizationId", "VehicleId" },
                unique: true,
                filter: "\"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_photos_OrganizationId_ListingId_SortOrder",
                table: "vehicle_sale_photos",
                columns: new[] { "OrganizationId", "ListingId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_photos_StoredFileId",
                table: "vehicle_sale_photos",
                column: "StoredFileId");

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_price_changes_OrganizationId_ListingId_Changed~",
                table: "vehicle_sale_price_changes",
                columns: new[] { "OrganizationId", "ListingId", "ChangedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vehicle_registration_details");

            migrationBuilder.DropTable(
                name: "vehicle_sale_channel_posts");

            migrationBuilder.DropTable(
                name: "vehicle_sale_inquiries");

            migrationBuilder.DropTable(
                name: "vehicle_sale_listings");

            migrationBuilder.DropTable(
                name: "vehicle_sale_photos");

            migrationBuilder.DropTable(
                name: "vehicle_sale_price_changes");
        }
    }
}
