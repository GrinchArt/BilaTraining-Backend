using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Workspaces.Commands.UpdateWorkspace;

public sealed class UpdateWorkspaceHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<UpdateWorkspaceCommand, bool>
{
    public async Task<bool> Handle(UpdateWorkspaceCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();

        var workspace = await db.Workspaces
            .SingleOrDefaultAsync(
                w => w.Id == request.Id && w.UserId == currentUser.UserId && !w.IsDeleted,
                ct);

        if (workspace is null)
            throw new KeyNotFoundException($"Workspace '{request.Id}' was not found.");

        workspace.Rename(request.Name);
        workspace.UpdateDetails(request.Description, request.ColorHex);

        await db.SaveChangesAsync(ct);
        return true;
    }
}
