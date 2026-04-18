using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.WorkspaceClients.Commands.AddClientToWorkspace;

public sealed class AddClientToWorkspaceHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<AddClientToWorkspaceCommand, bool>
{
    public async Task<bool> Handle(AddClientToWorkspaceCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var workspaceExists = await db.Workspaces.AnyAsync(
            w => w.Id == request.WorkspaceId && w.UserId == currentUser.UserId && !w.IsDeleted,
            ct);

        if (!workspaceExists)
            throw new KeyNotFoundException($"Workspace '{request.WorkspaceId}' was not found.");

        var clientExists = await db.Clients.AnyAsync(
            c => c.Id == request.ClientId && c.UserId == currentUser.UserId && !c.IsDeleted,
            ct);

        if (!clientExists)
            throw new KeyNotFoundException($"Client '{request.ClientId}' was not found.");

        var exists = await db.WorkspaceClients.AnyAsync(
            wc => wc.WorkspaceId == request.WorkspaceId && wc.ClientId == request.ClientId,
            ct);

        if (exists)
            return true;

        db.WorkspaceClients.Add(new WorkspaceClient(request.WorkspaceId, request.ClientId));
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
