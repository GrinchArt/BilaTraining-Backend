using BilaTraining.Application.Abstractions;
using BilaTraining.Domain.Common;
using BilaTraining.Domain.Entities;
using BilaTraining.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Infrastructure.Persistence;

public sealed class ApplicationDbContext
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<WorkspaceClient> WorkspaceClients => Set<WorkspaceClient>();
    public DbSet<SessionExercise> SessionExercises => Set<SessionExercise>();
    public DbSet<SessionExerciseSet> SessionExerciseSets => Set<SessionExerciseSet>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditingRules();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditingRules()
    {
        var auditableEntries = ChangeTracker.Entries<AuditableEntity>();

        foreach (var entry in auditableEntries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Property(x => x.CreatedAtUtc).CurrentValue = DateTime.UtcNow;
                entry.Property(x => x.UpdatedAtUtc).CurrentValue = DateTime.UtcNow;
                continue;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Property(x => x.CreatedAtUtc).IsModified = false;
                entry.Property(x => x.UpdatedAtUtc).CurrentValue = DateTime.UtcNow;
                continue;
            }

            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.SoftDelete();
            }
        }

        var userEntries = ChangeTracker.Entries<AppUser>();

        foreach (var entry in userEntries)
        {
            if (entry.State == EntityState.Added)
            {
                entry.Property(x => x.CreatedAtUtc).CurrentValue = DateTime.UtcNow;
                entry.Property(x => x.UpdatedAtUtc).CurrentValue = DateTime.UtcNow;
                continue;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Property(x => x.CreatedAtUtc).IsModified = false;
                entry.Property(x => x.UpdatedAtUtc).CurrentValue = DateTime.UtcNow;
                continue;
            }

            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAtUtc = DateTime.UtcNow;
                entry.Entity.UpdatedAtUtc = DateTime.UtcNow;
            }
        }
    }
}
