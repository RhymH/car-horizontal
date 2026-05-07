using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase75MileageReadings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vehicle_mileage_readings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Mileage = table.Column<int>(type: "integer", nullable: false),
                    ObservedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RecordedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_mileage_readings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_mileage_readings_OrganizationId_VehicleId_ObservedAt",
                table: "vehicle_mileage_readings",
                columns: new[] { "OrganizationId", "VehicleId", "ObservedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_mileage_readings_VehicleId",
                table: "vehicle_mileage_readings",
                column: "VehicleId");

            // Backfill : un reading "Manual" par véhicule existant à partir de
            // (CurrentMileage, MileageUpdatedAt). Source = 0 (Manual).
            migrationBuilder.Sql(@"
                INSERT INTO vehicle_mileage_readings
                    (""Id"", ""VehicleId"", ""Mileage"", ""ObservedAt"", ""Source"", ""RecordedAt"",
                     ""RecordedBy"", ""Notes"", ""CreatedAt"", ""UpdatedAt"", ""DeletedAt"",
                     ""CreatedBy"", ""UpdatedBy"", ""OrganizationId"")
                SELECT
                    gen_random_uuid(),
                    v.""Id"",
                    v.""CurrentMileage"",
                    v.""MileageUpdatedAt"",
                    0,
                    v.""MileageUpdatedAt"",
                    NULL,
                    NULL,
                    v.""MileageUpdatedAt"",
                    v.""MileageUpdatedAt"",
                    NULL,
                    '00000000-0000-0000-0000-000000000000'::uuid,
                    NULL,
                    v.""OrganizationId""
                FROM vehicles v
                WHERE v.""DeletedAt"" IS NULL
                  AND v.""CurrentMileage"" > 0;
            ");

            // Backfill : un reading par MaintenanceRecord existant. Source = 1 (MaintenanceRecord).
            migrationBuilder.Sql(@"
                INSERT INTO vehicle_mileage_readings
                    (""Id"", ""VehicleId"", ""Mileage"", ""ObservedAt"", ""Source"", ""RecordedAt"",
                     ""RecordedBy"", ""Notes"", ""CreatedAt"", ""UpdatedAt"", ""DeletedAt"",
                     ""CreatedBy"", ""UpdatedBy"", ""OrganizationId"")
                SELECT
                    gen_random_uuid(),
                    m.""VehicleId"",
                    m.""MileageAtService"",
                    m.""PerformedAt"",
                    1,
                    m.""CreatedAt"",
                    NULL,
                    NULL,
                    m.""CreatedAt"",
                    m.""CreatedAt"",
                    NULL,
                    '00000000-0000-0000-0000-000000000000'::uuid,
                    NULL,
                    m.""OrganizationId""
                FROM maintenance_records m
                WHERE m.""DeletedAt"" IS NULL
                  AND m.""MileageAtService"" > 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vehicle_mileage_readings");
        }
    }
}
