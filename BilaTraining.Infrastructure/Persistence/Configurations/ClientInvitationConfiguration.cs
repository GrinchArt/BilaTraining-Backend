using BilaTraining.Domain.Entities;
using BilaTraining.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class ClientInvitationConfiguration : IEntityTypeConfiguration<ClientInvitation>
{
    public void Configure(EntityTypeBuilder<ClientInvitation> builder)
    {
        builder.ToTable("ClientInvitations");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RelationshipId).IsRequired();
        builder.Property(x => x.CreatedByUserId).IsRequired();

        builder.HasIndex(x => x.TokenHash)
            .IsUnique()
            .HasDatabaseName("UQ_ClientInvitations_TokenHash");

        builder.HasIndex(x => new { x.RelationshipId, x.ExpiresAtUtc })
            .HasDatabaseName("IX_ClientInvitations_Relationship_Expires");

        builder.HasOne<CoachClientRelationship>()
            .WithMany()
            .HasForeignKey(x => x.RelationshipId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
