using BilaTraining.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class WorkspaceClientConfiguration : IEntityTypeConfiguration<WorkspaceClient>
{
    public void Configure(EntityTypeBuilder<WorkspaceClient> builder)
    {
        builder.ToTable("WorkspaceClients");

        builder.HasKey(x => new { x.WorkspaceId, x.ClientId })
            .HasName("PK_WorkspaceClients");

        builder.Property(x => x.AddedAtUtc).HasColumnType("datetime2(0)");

        builder.HasOne<Workspace>()
            .WithMany()
            .HasForeignKey(x => x.WorkspaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Client>()
            .WithMany()
            .HasForeignKey(x => x.ClientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
