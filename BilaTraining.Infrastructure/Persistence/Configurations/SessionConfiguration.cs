using BilaTraining.Domain.Entities;
using BilaTraining.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.ToTable("Sessions", table =>
        {
            table.HasCheckConstraint("CK_Sessions_EndAfterStart", "[EndAtUtc] > [StartAtUtc]");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.WorkspaceId).IsRequired();
        builder.Property(x => x.ClientId).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(2000);

        builder.Property(x => x.StartAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.EndAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.Status).HasConversion<byte>().IsRequired();

        builder.Property(x => x.CreatedAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.UpdatedAtUtc).HasColumnType("datetime2(0)");
        builder.Property(x => x.DeletedAtUtc).HasColumnType("datetime2(0)");

        builder.HasIndex(x => new { x.WorkspaceId, x.StartAtUtc })
            .HasDatabaseName("IX_Sessions_WorkspaceId_StartAtUtc");

        builder.HasIndex(x => new { x.ClientId, x.StartAtUtc })
            .HasDatabaseName("IX_Sessions_ClientId_StartAtUtc");

        builder.HasIndex(x => new { x.UserId, x.StartAtUtc })
            .HasDatabaseName("IX_Sessions_UserId_StartAtUtc");

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Workspace>()
            .WithMany()
            .HasForeignKey(x => x.WorkspaceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Client>()
            .WithMany()
            .HasForeignKey(x => x.ClientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
