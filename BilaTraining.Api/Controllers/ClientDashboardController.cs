using BilaTraining.Application.Abstractions;
using BilaTraining.Domain.Enums;
using BilaTraining.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/client-dashboard")]
public sealed class ClientDashboardController(
    ApplicationDbContext db,
    ICurrentUser currentUser
) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ClientDashboardResponse>> Get(CancellationToken ct)
    {
        var relationships = await (
            from relationship in db.CoachClientRelationships.AsNoTracking()
            join client in db.Clients.AsNoTracking() on relationship.ClientId equals client.Id
            join coach in db.Users.AsNoTracking() on relationship.CoachUserId equals coach.Id
            where client.LinkedUserId == currentUser.UserId &&
                  !client.IsDeleted &&
                  !relationship.IsDeleted &&
                  !coach.IsDeleted &&
                  relationship.Status != CoachClientRelationshipStatus.Ended
            orderby relationship.CreatedAtUtc
            select new ClientRelationshipDto(
                relationship.Id,
                client.Id,
                coach.DisplayName ?? coach.Email ?? "Trainer",
                relationship.Status,
                relationship.StartedAtUtc))
            .ToListAsync(ct);

        var sessions = await (
            from session in db.Sessions.AsNoTracking()
            join client in db.Clients.AsNoTracking() on session.ClientId equals client.Id
            join relationship in db.CoachClientRelationships.AsNoTracking()
                on new { CoachUserId = session.UserId, ClientId = session.ClientId }
                equals new { relationship.CoachUserId, relationship.ClientId }
            join coach in db.Users.AsNoTracking() on relationship.CoachUserId equals coach.Id
            join workspace in db.Workspaces.AsNoTracking() on session.WorkspaceId equals workspace.Id
            where client.LinkedUserId == currentUser.UserId &&
                  !client.IsDeleted &&
                  !session.IsDeleted &&
                  !relationship.IsDeleted &&
                  relationship.Status != CoachClientRelationshipStatus.Ended
            orderby session.StartAtUtc
            select new ClientSessionDto(
                session.Id,
                relationship.Id,
                coach.DisplayName ?? coach.Email ?? "Trainer",
                workspace.Name,
                session.StartAtUtc,
                session.EndAtUtc,
                session.Status,
                session.Notes))
            .Take(100)
            .ToListAsync(ct);

        return Ok(new ClientDashboardResponse(relationships, sessions));
    }

    public sealed record ClientDashboardResponse(
        IReadOnlyList<ClientRelationshipDto> Relationships,
        IReadOnlyList<ClientSessionDto> Sessions);

    public sealed record ClientRelationshipDto(
        Guid Id,
        Guid ClientId,
        string CoachName,
        CoachClientRelationshipStatus Status,
        DateTime? StartedAtUtc);

    public sealed record ClientSessionDto(
        Guid Id,
        Guid RelationshipId,
        string CoachName,
        string WorkspaceName,
        DateTime StartAtUtc,
        DateTime EndAtUtc,
        SessionStatus Status,
        string? Notes);
}
