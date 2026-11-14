using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryManagementSystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddBookReservations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnRequestedAtUtc",
                table: "Borrowings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BookReservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    BookId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReservedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BorrowingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReturnRequestedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReturnApprovedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReturnApprovedByName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookReservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BookReservations_AspNetUsers_StudentId",
                        column: x => x.StudentId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookReservations_Books_BookId",
                        column: x => x.BookId,
                        principalTable: "Books",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookReservations_Borrowings_BorrowingId",
                        column: x => x.BorrowingId,
                        principalTable: "Borrowings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BookReservations_BookId_Open",
                table: "BookReservations",
                column: "BookId",
                unique: true,
                filter: "[Status] IN ('Reserved', 'Borrowed', 'ReturnRequested')");

            migrationBuilder.CreateIndex(
                name: "IX_BookReservations_BorrowingId",
                table: "BookReservations",
                column: "BorrowingId");

            migrationBuilder.CreateIndex(
                name: "IX_BookReservations_Status",
                table: "BookReservations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_BookReservations_StudentId_ReservedAtUtc",
                table: "BookReservations",
                columns: new[] { "StudentId", "ReservedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookReservations");

            migrationBuilder.DropColumn(
                name: "ReturnRequestedAtUtc",
                table: "Borrowings");
        }
    }
}
