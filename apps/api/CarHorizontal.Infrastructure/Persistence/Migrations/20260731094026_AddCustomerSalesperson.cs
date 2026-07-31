using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerSalesperson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SalespersonUserId",
                table: "customers",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_customers_OrganizationId_SalespersonUserId",
                table: "customers",
                columns: new[] { "OrganizationId", "SalespersonUserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_customers_OrganizationId_SalespersonUserId",
                table: "customers");

            migrationBuilder.DropColumn(
                name: "SalespersonUserId",
                table: "customers");
        }
    }
}
