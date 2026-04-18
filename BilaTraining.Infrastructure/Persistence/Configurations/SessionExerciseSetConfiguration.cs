using BilaTraining.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BilaTraining.Infrastructure.Persistence.Configurations;

internal sealed class SessionExerciseSetConfiguration : IEntityTypeConfiguration<SessionExerciseSet>
{
    public void Configure(EntityTypeBuilder<SessionExerciseSet> builder)
    {
        builder.ToTable("SessionExerciseSets");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.SessionExerciseId).IsRequired();
        builder.Property(x => x.SetNumber).IsRequired();
        builder.Property(x => x.Weight).HasColumnType("decimal(10,2)");
        builder.Property(x => x.WeightUnit).HasMaxLength(10);
        builder.Property(x => x.Notes).HasMaxLength(300);

        builder.HasIndex(x => new { x.SessionExerciseId, x.SetNumber })
            .IsUnique()
            .HasDatabaseName("UQ_SessionExerciseSets");

        builder.HasIndex(x => x.SessionExerciseId)
            .HasDatabaseName("IX_SessionExerciseSets_SessionExerciseId");

        builder.HasOne<SessionExercise>()
            .WithMany()
            .HasForeignKey(x => x.SessionExerciseId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
