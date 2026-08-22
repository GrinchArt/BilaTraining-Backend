using BilaTraining.Domain.Entities;
using BilaTraining.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class CoachClientRelationshipConfiguration : IEntityTypeConfiguration<CoachClientRelationship>
{
    public void Configure(EntityTypeBuilder<CoachClientRelationship> builder)
    {
        builder.ToTable("CoachClientRelationships");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.CoachUserId).IsRequired();
        builder.Property(x => x.ClientId).IsRequired();
        builder.Property(x => x.Status).HasConversion<byte>().IsRequired();

        builder.HasIndex(x => new { x.CoachUserId, x.ClientId })
            .IsUnique()
            .HasDatabaseName("UQ_CoachClientRelationships_Coach_Client");

        builder.HasIndex(x => new { x.CoachUserId, x.Status })
            .HasDatabaseName("IX_CoachClientRelationships_Coach_Status");

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.CoachUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Client>()
            .WithMany()
            .HasForeignKey(x => x.ClientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
