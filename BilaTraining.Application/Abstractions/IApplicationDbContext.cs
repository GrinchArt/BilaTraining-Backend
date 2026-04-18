using BilaTraining.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Abstractions;

public interface IApplicationDbContext
{
    DbSet<Workspace> Workspaces { get; }
    DbSet<Client> Clients { get; }
    DbSet<Exercise> Exercises { get; }
    DbSet<Session> Sessions { get; }
    DbSet<WorkspaceClient> WorkspaceClients { get; }

    DbSet<SessionExercise> SessionExercises { get; }
    DbSet<SessionExerciseSet> SessionExerciseSets { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
