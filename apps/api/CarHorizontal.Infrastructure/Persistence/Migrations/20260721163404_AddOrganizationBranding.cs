using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationBranding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BrandCoverImageUrl",
                table: "organizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandLogoUrl",
                table: "organizations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandPrimaryColor",
                table: "organizations",
                type: "character varying(9)",
                maxLength: 9,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BrandTagline",
                table: "organizations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "organizations",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BrandCoverImageUrl",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "BrandLogoUrl",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "BrandPrimaryColor",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "BrandTagline",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "organizations");
        }
    }
}
