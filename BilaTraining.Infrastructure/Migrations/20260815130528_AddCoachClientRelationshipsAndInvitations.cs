using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BilaTraining.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCoachClientRelationshipsAndInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LinkedUserId",
                table: "Clients",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CoachClientRelationships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CoachUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<byte>(type: "smallint", nullable: false),
                    StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PausedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoachClientRelationships", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoachClientRelationships_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CoachClientRelationships_Users_CoachUserId",
                        column: x => x.CoachUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClientInvitations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RelationshipId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AcceptedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientInvitations_CoachClientRelationships_RelationshipId",
                        column: x => x.RelationshipId,
                        principalTable: "CoachClientRelationships",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClientInvitations_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Existing clients were already owned by the user stored in Clients.UserId.
            // Preserve that ownership in the new explicit relationship model.
            migrationBuilder.Sql(
                """
                INSERT INTO "CoachClientRelationships"
                    ("Id", "CoachUserId", "ClientId", "Status", "CreatedAtUtc", "UpdatedAtUtc", "IsDeleted")
                SELECT
                    gen_random_uuid(),
                    c."UserId",
                    c."Id",
                    0,
                    c."CreatedAtUtc",
                    c."UpdatedAtUtc",
                    FALSE
                FROM "Clients" AS c
                WHERE c."IsDeleted" = FALSE
                  AND NOT EXISTS (
                      SELECT 1
                      FROM "CoachClientRelationships" AS r
                      WHERE r."CoachUserId" = c."UserId"
                        AND r."ClientId" = c."Id"
                  );
                """);

            migrationBuilder.InsertData(
                table: "AspNetRoles",
                columns: new[] { "Id", "ConcurrencyStamp", "Name", "NormalizedName" },
                values: new object[,]
                {
                    { new Guid("8d7a3568-682f-4a4d-b7d5-9805016e42f1"), "trainer-role-v1", "Trainer", "TRAINER" },
                    { new Guid("99555d6a-cef4-4a89-b110-b721582ebd67"), "client-role-v1", "Client", "CLIENT" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Clients_LinkedUserId",
                table: "Clients",
                column: "LinkedUserId",
                filter: "\"LinkedUserId\" IS NOT NULL AND \"IsDeleted\" = FALSE");

            migrationBuilder.CreateIndex(
                name: "IX_ClientInvitations_CreatedByUserId",
                table: "ClientInvitations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientInvitations_Relationship_Expires",
                table: "ClientInvitations",
                columns: new[] { "RelationshipId", "ExpiresAtUtc" });

            migrationBuilder.CreateIndex(
                name: "UQ_ClientInvitations_TokenHash",
                table: "ClientInvitations",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CoachClientRelationships_ClientId",
                table: "CoachClientRelationships",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_CoachClientRelationships_Coach_Status",
                table: "CoachClientRelationships",
                columns: new[] { "CoachUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "UQ_CoachClientRelationships_Coach_Client",
                table: "CoachClientRelationships",
                columns: new[] { "CoachUserId", "ClientId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Users_LinkedUserId",
                table: "Clients",
                column: "LinkedUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Users_LinkedUserId",
                table: "Clients");

            migrationBuilder.DropTable(
                name: "ClientInvitations");

            migrationBuilder.DropTable(
                name: "CoachClientRelationships");

            migrationBuilder.DropIndex(
                name: "IX_Clients_LinkedUserId",
                table: "Clients");

            // Role assignments may have been created after this migration was applied.
            // Remove those join rows first so the seeded roles can be deleted cleanly.
            migrationBuilder.Sql(
                """
                DELETE FROM "AspNetUserRoles"
                WHERE "RoleId" IN (
                    '8d7a3568-682f-4a4d-b7d5-9805016e42f1'::uuid,
                    '99555d6a-cef4-4a89-b110-b721582ebd67'::uuid
                );
                """);

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: new Guid("8d7a3568-682f-4a4d-b7d5-9805016e42f1"));

            migrationBuilder.DeleteData(
                table: "AspNetRoles",
                keyColumn: "Id",
                keyValue: new Guid("99555d6a-cef4-4a89-b110-b721582ebd67"));

            migrationBuilder.DropColumn(
                name: "LinkedUserId",
                table: "Clients");
        }
    }
}
