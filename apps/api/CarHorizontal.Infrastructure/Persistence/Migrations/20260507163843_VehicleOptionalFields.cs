using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class VehicleOptionalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_vehicles_OrganizationId_LicensePlate",
                table: "vehicles");

            migrationBuilder.AlterColumn<int>(
                name: "Year",
                table: "vehicles",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "LicensePlate",
                table: "vehicles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "EngineType",
                table: "vehicles",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.CreateIndex(
                name: "IX_vehicles_OrganizationId_LicensePlate",
                table: "vehicles",
                columns: new[] { "OrganizationId", "LicensePlate" },
                unique: true,
                filter: "\"LicensePlate\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_vehicles_OrganizationId_LicensePlate",
                table: "vehicles");

            migrationBuilder.AlterColumn<int>(
                name: "Year",
                table: "vehicles",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LicensePlate",
                table: "vehicles",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "EngineType",
                table: "vehicles",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicles_OrganizationId_LicensePlate",
                table: "vehicles",
                columns: new[] { "OrganizationId", "LicensePlate" },
                unique: true);
        }
    }
}
