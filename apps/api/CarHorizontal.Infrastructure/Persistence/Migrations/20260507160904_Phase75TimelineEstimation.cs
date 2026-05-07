using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CarHorizontal.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase75TimelineEstimation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EstimatedDueAt",
                table: "timeline_events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EstimatedKmRemaining",
                table: "timeline_events",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MileageConfidenceAtGeneration",
                table: "timeline_events",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EstimatedDueAt",
                table: "timeline_events");

            migrationBuilder.DropColumn(
                name: "EstimatedKmRemaining",
                table: "timeline_events");

            migrationBuilder.DropColumn(
                name: "MileageConfidenceAtGeneration",
                table: "timeline_events");
        }
    }
}
