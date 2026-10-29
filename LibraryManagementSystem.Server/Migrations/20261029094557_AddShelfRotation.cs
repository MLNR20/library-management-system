using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryManagementSystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddShelfRotation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Rotation",
                table: "Shelves",
                type: "int",
                nullable: false,
                defaultValue: 90);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shelves_Rotation",
                table: "Shelves",
                sql: "[Rotation] IN (90, 180)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Shelves_Rotation",
                table: "Shelves");

            migrationBuilder.DropColumn(
                name: "Rotation",
                table: "Shelves");
        }
    }
}
