using BilaTraining.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class IdentityRoleConfiguration : IEntityTypeConfiguration<IdentityRole<Guid>>
{
    public void Configure(EntityTypeBuilder<IdentityRole<Guid>> builder)
    {
        builder.HasData(
            new IdentityRole<Guid>
            {
                Id = AppRoles.TrainerId,
                Name = AppRoles.Trainer,
                NormalizedName = AppRoles.Trainer.ToUpperInvariant(),
                ConcurrencyStamp = "trainer-role-v1"
            },
            new IdentityRole<Guid>
            {
                Id = AppRoles.ClientId,
                Name = AppRoles.Client,
                NormalizedName = AppRoles.Client.ToUpperInvariant(),
                ConcurrencyStamp = "client-role-v1"
            });
    }
}
