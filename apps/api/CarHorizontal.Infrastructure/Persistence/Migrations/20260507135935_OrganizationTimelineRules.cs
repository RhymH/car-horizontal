using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OrganizationTimelineRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "organization_timeline_rules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RuleCode = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_timeline_rules", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_organization_timeline_rules_OrganizationId_RuleCode",
                table: "organization_timeline_rules",
                columns: new[] { "OrganizationId", "RuleCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "organization_timeline_rules");
        }
    }
}
