using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.WorkspaceClients.Commands.RemoveClientFromWorkspace;

public sealed class RemoveClientFromWorkspaceHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<RemoveClientFromWorkspaceCommand, bool>
{
    public async Task<bool> Handle(RemoveClientFromWorkspaceCommand request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var workspaceClient = await (
            from wc in db.WorkspaceClients
            join w in db.Workspaces on wc.WorkspaceId equals w.Id
            join c in db.Clients on wc.ClientId equals c.Id
            where wc.WorkspaceId == request.WorkspaceId
                && wc.ClientId == request.ClientId
                && w.UserId == currentUser.UserId
                && c.UserId == currentUser.UserId
                && !w.IsDeleted
                && !c.IsDeleted
            select wc)
            .SingleOrDefaultAsync(ct);

        if (workspaceClient is null)
            throw new KeyNotFoundException("Workspace client link was not found.");

        db.WorkspaceClients.Remove(workspaceClient);
        await db.SaveChangesAsync(ct);

        return true;
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
