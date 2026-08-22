using BilaTraining.Domain.Entities;
using BilaTraining.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class BodyMeasurementConfiguration : IEntityTypeConfiguration<BodyMeasurement>
{
    public void Configure(EntityTypeBuilder<BodyMeasurement> builder)
    {
        builder.ToTable("BodyMeasurements");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).IsRequired();
        builder.Property(x => x.RecordedOn).HasColumnType("date").IsRequired();
        builder.Property(x => x.WeightKg).HasPrecision(6, 2);
        builder.Property(x => x.HeightCm).HasPrecision(6, 2);
        builder.Property(x => x.BodyFatPercent).HasPrecision(5, 2);
        builder.Property(x => x.NeckCm).HasPrecision(6, 2);
        builder.Property(x => x.ChestCm).HasPrecision(6, 2);
        builder.Property(x => x.WaistCm).HasPrecision(6, 2);
        builder.Property(x => x.HipsCm).HasPrecision(6, 2);
        builder.Property(x => x.BicepsCm).HasPrecision(6, 2);
        builder.Property(x => x.ThighCm).HasPrecision(6, 2);
        builder.Property(x => x.CalfCm).HasPrecision(6, 2);
        builder.Property(x => x.Notes).HasMaxLength(1000);

        builder.HasIndex(x => new { x.UserId, x.RecordedOn })
            .HasDatabaseName("IX_BodyMeasurements_UserId_RecordedOn");

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
