using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryManagementSystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddBookReservationRowVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "BookReservations",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "BookReservations");
        }
    }
}
