using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Sessions.Commands.CreateSession;

public sealed class CreateSessionHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<CreateSessionCommand, Guid>
{
    public async Task<Guid> Handle(CreateSessionCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);
        await EnsureOwnedSessionRelationsAsync(request.WorkspaceId, request.ClientId, db, currentUser, ct);

        var session = new Session(
            currentUser.UserId,
            request.WorkspaceId,
            request.ClientId,
            request.StartAtUtc,
            request.EndAtUtc,
            request.Notes);

        db.Sessions.Add(session);
        await db.SaveChangesAsync(ct);

        return session.Id;
    }

    internal static async Task EnsureOwnedSessionRelationsAsync(
        Guid workspaceId,
        Guid clientId,
        IApplicationDbContext db,
        ICurrentUser currentUser,
        CancellationToken ct)
    {
        var workspaceExists = await db.Workspaces.AnyAsync(
            w => w.Id == workspaceId && w.UserId == currentUser.UserId && !w.IsDeleted,
            ct);

        if (!workspaceExists)
            throw new KeyNotFoundException($"Workspace '{workspaceId}' was not found.");

        var clientExists = await db.Clients.AnyAsync(
            c => c.Id == clientId && c.UserId == currentUser.UserId && !c.IsDeleted,
            ct);

        if (!clientExists)
            throw new KeyNotFoundException($"Client '{clientId}' was not found.");
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
