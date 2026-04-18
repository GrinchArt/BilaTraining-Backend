using BilaTraining.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.ToTable("Users");

        builder.Property(x => x.Email).HasMaxLength(320).IsRequired();
        builder.Property(x => x.NormalizedEmail).HasMaxLength(320);
        builder.Property(x => x.UserName).HasMaxLength(320).IsRequired();
        builder.Property(x => x.NormalizedUserName).HasMaxLength(320);
        builder.Property(x => x.DisplayName).HasMaxLength(200);

        builder.Property(x => x.CreatedAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.UpdatedAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.DeletedAtUtc).HasColumnType("datetime2(0)");

        builder.HasIndex(x => x.Email)
            .IsUnique()
            .HasDatabaseName("IX_Users_Email")
            .HasFilter("[Email] IS NOT NULL AND [IsDeleted] = 0");
    }
}
