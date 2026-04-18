using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Messaging;
using BilaTraining.Domain.Entities;

namespace BilaTraining.Application.Features.Workspaces.Commands.CreateWorkspace;

public sealed class CreateWorkspaceHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<CreateWorkspaceCommand, Guid>
{
    public async Task<Guid> Handle(CreateWorkspaceCommand request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();

        var workspace = new Workspace(
            userId: currentUser.UserId,
            name: request.Name,
            description: request.Description,
            colorHex: request.ColorHex
        );

        db.Workspaces.Add(workspace);
        await db.SaveChangesAsync(ct);

        return workspace.Id;
    }
}
