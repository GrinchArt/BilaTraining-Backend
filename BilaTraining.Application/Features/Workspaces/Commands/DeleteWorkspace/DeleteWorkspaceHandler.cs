using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Workspaces.Commands.DeleteWorkspace;

public sealed class DeleteWorkspaceHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<DeleteWorkspaceCommand, bool>
{
    public async Task<bool> Handle(DeleteWorkspaceCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();

        var workspace = await db.Workspaces
            .SingleOrDefaultAsync(
                w => w.Id == request.Id && w.UserId == currentUser.UserId && !w.IsDeleted,
                ct);

        if (workspace is null)
            throw new KeyNotFoundException($"Workspace '{request.Id}' was not found.");

        workspace.SoftDelete();
        await db.SaveChangesAsync(ct);

        return true;
    }
}
