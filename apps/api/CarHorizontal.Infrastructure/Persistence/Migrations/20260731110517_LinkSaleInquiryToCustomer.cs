using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class LinkSaleInquiryToCustomer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactName",
                table: "vehicle_sale_inquiries");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "vehicle_sale_inquiries");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "vehicle_sale_inquiries");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "vehicle_sale_inquiries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehicle_sale_inquiries_OrganizationId_CustomerId_ReceivedAt",
                table: "vehicle_sale_inquiries",
                columns: new[] { "OrganizationId", "CustomerId", "ReceivedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_vehicle_sale_inquiries_OrganizationId_CustomerId_ReceivedAt",
                table: "vehicle_sale_inquiries");

            migrationBuilder.AlterColumn<Guid>(
                name: "CustomerId",
                table: "vehicle_sale_inquiries",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "ContactName",
                table: "vehicle_sale_inquiries",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "vehicle_sale_inquiries",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "vehicle_sale_inquiries",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);
        }
    }
}
