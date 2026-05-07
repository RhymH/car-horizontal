using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase75Catalog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SelectedProgramId",
                table: "vehicles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VehicleModelId",
                table: "vehicles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ItemCode",
                table: "timeline_events",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Severity",
                table: "timeline_events",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "ItemCodes",
                table: "maintenance_records",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.CreateTable(
                name: "vehicle_models",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Make = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Model = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Trim = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    EngineCode = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    EngineDisplayName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    EngineType = table.Column<int>(type: "integer", nullable: false),
                    FuelType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ProductionStartYear = table.Column<int>(type: "integer", nullable: false),
                    ProductionEndYear = table.Column<int>(type: "integer", nullable: true),
                    MarketRegion = table.Column<int>(type: "integer", nullable: false),
                    Slug = table.Column<string>(type: "character varying(140)", maxLength: 140, nullable: false),
                    Aliases = table.Column<string[]>(type: "text[]", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehicle_models", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "vehicle_program_overrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: false),
                    ItemCode = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    OverrideIntervalMonths = table.Column<int>(type: "integer", nullable: true),
                    OverrideIntervalKm = table.Column<int>(type: "integer", nullable: true),
                    Disabled = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_vehicle_program_overrides", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "maintenance_programs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VehicleModelId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    SourceReference = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    ValidFromMileage = table.Column<int>(type: "integer", nullable: false),
                    ValidToMileage = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenance_programs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_maintenance_programs_vehicle_models_VehicleModelId",
                        column: x => x.VehicleModelId,
                        principalTable: "vehicle_models",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "maintenance_program_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProgramId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IntervalMonths = table.Column<int>(type: "integer", nullable: true),
                    IntervalKm = table.Column<int>(type: "integer", nullable: true),
                    FirstOccurrenceMonths = table.Column<int>(type: "integer", nullable: true),
                    FirstOccurrenceKm = table.Column<int>(type: "integer", nullable: true),
                    Trigger = table.Column<int>(type: "integer", nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    EstimatedDurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    EstimatedCostMin = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    EstimatedCostMax = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    RequiredParts = table.Column<string[]>(type: "text[]", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenance_program_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_maintenance_program_items_maintenance_programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "maintenance_programs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vehicles_VehicleModelId",
                table: "vehicles",
                column: "VehicleModelId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_program_items_ProgramId_Code",
                table: "maintenance_program_items",
                columns: new[] { "ProgramId", "Code" });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_programs_VehicleModelId_Name",
                table: "maintenance_programs",
                columns: new[] { "VehicleModelId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_models_Make_Model",
                table: "vehicle_models",
                columns: new[] { "Make", "Model" });

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_models_Slug",
                table: "vehicle_models",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_program_overrides_OrganizationId_VehicleId_ItemCode",
                table: "vehicle_program_overrides",
                columns: new[] { "OrganizationId", "VehicleId", "ItemCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "maintenance_program_items");

            migrationBuilder.DropTable(
                name: "vehicle_program_overrides");

            migrationBuilder.DropTable(
                name: "maintenance_programs");

            migrationBuilder.DropTable(
                name: "vehicle_models");

            migrationBuilder.DropIndex(
                name: "IX_vehicles_VehicleModelId",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "SelectedProgramId",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "VehicleModelId",
                table: "vehicles");

            migrationBuilder.DropColumn(
                name: "ItemCode",
                table: "timeline_events");

            migrationBuilder.DropColumn(
                name: "Severity",
                table: "timeline_events");

            migrationBuilder.DropColumn(
                name: "ItemCodes",
                table: "maintenance_records");
        }
    }
}
