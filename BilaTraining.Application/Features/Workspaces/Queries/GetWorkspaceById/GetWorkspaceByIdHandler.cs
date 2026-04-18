using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.Workspaces.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.Workspaces.Queries.GetWorkspaceById;

public sealed class GetWorkspaceByIdHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetWorkspaceByIdQuery, WorkspaceDto>
{
    public async Task<WorkspaceDto> Handle(GetWorkspaceByIdQuery request, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();

        var workspace = await db.Workspaces
            .AsNoTracking()
            .Where(w => w.Id == request.Id && w.UserId == currentUser.UserId && !w.IsDeleted)
            .Select(w => new WorkspaceDto(w.Id, w.Name, w.Description, w.ColorHex))
            .SingleOrDefaultAsync(ct);

        return workspace ?? throw new KeyNotFoundException($"Workspace '{request.Id}' was not found.");
    }
}
