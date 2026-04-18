using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Workspaces.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Workspaces.Queries.GetWorkspaces;

public sealed class GetWorkspacesHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetWorkspacesQuery, IReadOnlyList<WorkspaceDto>>
{
    public async Task<IReadOnlyList<WorkspaceDto>> Handle(GetWorkspacesQuery request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();

        return await db.Workspaces
            .AsNoTracking()
            .Where(w => w.UserId == currentUser.UserId && !w.IsDeleted)
            .OrderBy(w => w.Name)
            .Select(w => new WorkspaceDto(w.Id, w.Name, w.Description, w.ColorHex))
            .ToListAsync(ct);
    }
}
