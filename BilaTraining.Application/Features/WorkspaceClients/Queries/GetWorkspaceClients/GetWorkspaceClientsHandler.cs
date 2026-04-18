using BilaTraining.Application.Abstractions;
using BilaTraining.Application.Features.WorkspaceClients.Dtos;
using BilaTraining.Application.Messaging;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Application.Features.WorkspaceClients.Queries.GetWorkspaceClients;

public sealed class GetWorkspaceClientsHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser
) : IRequestHandler<GetWorkspaceClientsQuery, IReadOnlyList<WorkspaceClientDto>>
{
    public async Task<IReadOnlyList<WorkspaceClientDto>> Handle(GetWorkspaceClientsQuery request, CancellationToken ct)
    {
        EnsureAuthenticated(currentUser);

        var workspaceExists = await db.Workspaces.AnyAsync(
            w => w.Id == request.WorkspaceId && w.UserId == currentUser.UserId && !w.IsDeleted,
            ct);

        if (!workspaceExists)
            throw new KeyNotFoundException($"Workspace '{request.WorkspaceId}' was not found.");

        return await db.WorkspaceClients
            .AsNoTracking()
            .Where(wc => wc.WorkspaceId == request.WorkspaceId)
            .OrderBy(wc => wc.AddedAtUtc)
            .Select(wc => new WorkspaceClientDto(wc.WorkspaceId, wc.ClientId, wc.AddedAtUtc))
            .ToListAsync(ct);
    }

    private static void EnsureAuthenticated(ICurrentUser currentUser)
    {
        if (!currentUser.IsAuthenticated)
            throw new UnauthorizedAccessException();
    }
}
