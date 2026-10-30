using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryManagementSystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeCards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TimeCards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalHours = table.Column<int>(type: "int", nullable: false),
                    TotalMinutes = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeCards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimeCards_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ClockEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TimeCardId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClockInUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClockOutUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClockEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClockEntries_TimeCards_TimeCardId",
                        column: x => x.TimeCardId,
                        principalTable: "TimeCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClockEntries_TimeCardId",
                table: "ClockEntries",
                column: "TimeCardId");

            migrationBuilder.CreateIndex(
                name: "IX_TimeCards_UserId_Date",
                table: "TimeCards",
                columns: new[] { "UserId", "Date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClockEntries");

            migrationBuilder.DropTable(
                name: "TimeCards");
        }
    }
}
