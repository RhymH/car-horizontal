using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalRef",
                table: "customers",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MergedIntoCustomerId",
                table: "customers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "lead_follow_ups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    DueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Channel = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_follow_ups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lead_import_batches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: false),
                    CreatedCount = table.Column<int>(type: "integer", nullable: false),
                    UpdatedCount = table.Column<int>(type: "integer", nullable: false),
                    SkippedCount = table.Column<int>(type: "integer", nullable: false),
                    ErrorCount = table.Column<int>(type: "integer", nullable: false),
                    ReportJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_import_batches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lead_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Stage = table.Column<int>(type: "integer", nullable: false),
                    StageChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    SourceDetail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AssignedToUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    InterestSummary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    LostReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    NextFollowUpAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_profiles", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_customers_OrganizationId_Email",
                table: "customers",
                columns: new[] { "OrganizationId", "Email" });

            migrationBuilder.CreateIndex(
                name: "IX_customers_OrganizationId_ExternalRef",
                table: "customers",
                columns: new[] { "OrganizationId", "ExternalRef" },
                unique: true,
                filter: "\"ExternalRef\" IS NOT NULL AND \"DeletedAt\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_customers_OrganizationId_Phone",
                table: "customers",
                columns: new[] { "OrganizationId", "Phone" });

            migrationBuilder.CreateIndex(
                name: "IX_lead_follow_ups_OrganizationId_CustomerId_Status",
                table: "lead_follow_ups",
                columns: new[] { "OrganizationId", "CustomerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_lead_follow_ups_OrganizationId_Status_DueAt",
                table: "lead_follow_ups",
                columns: new[] { "OrganizationId", "Status", "DueAt" });

            migrationBuilder.CreateIndex(
                name: "IX_lead_import_batches_OrganizationId_CreatedAt",
                table: "lead_import_batches",
                columns: new[] { "OrganizationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_lead_profiles_OrganizationId_CustomerId",
                table: "lead_profiles",
                columns: new[] { "OrganizationId", "CustomerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lead_profiles_OrganizationId_Stage_NextFollowUpAt",
                table: "lead_profiles",
                columns: new[] { "OrganizationId", "Stage", "NextFollowUpAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lead_follow_ups");

            migrationBuilder.DropTable(
                name: "lead_import_batches");

            migrationBuilder.DropTable(
                name: "lead_profiles");

            migrationBuilder.DropIndex(
                name: "IX_customers_OrganizationId_Email",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "IX_customers_OrganizationId_ExternalRef",
                table: "customers");

            migrationBuilder.DropIndex(
                name: "IX_customers_OrganizationId_Phone",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "ExternalRef",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "MergedIntoCustomerId",
                table: "customers");
        }
    }
}
