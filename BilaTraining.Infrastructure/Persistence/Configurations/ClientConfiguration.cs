using BilaTraining.Domain.Entities;
using BilaTraining.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> builder)
    {
        builder.ToTable("Clients");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.LastName).HasMaxLength(100);
        builder.Property(x => x.Phone).HasMaxLength(50);
        builder.Property(x => x.Email).HasMaxLength(320);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.Property(x => x.CreatedAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.UpdatedAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.DeletedAtUtc).HasColumnType("datetime2(0)");

        builder.HasIndex(x => new { x.UserId, x.Email })
            .IsUnique()
            .HasDatabaseName("IX_Clients_UserId_Email")
            .HasFilter("[Email] IS NOT NULL AND [IsDeleted] = 0");

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
