using BilaTraining.Application.Abstractions;
using BilaTraining.Domain.Entities;
using BilaTraining.Domain.Enums;
using BilaTraining.Infrastructure.Identity;
using BilaTraining.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class ClientInvitationsController : ControllerBase
{
    private static readonly TimeSpan InvitationLifetime = TimeSpan.FromDays(7);

    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly UserManager<AppUser> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;

    public ClientInvitationsController(
        ApplicationDbContext db,
        ICurrentUser currentUser,
        UserManager<AppUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager)
    {
        _db = db;
        _currentUser = currentUser;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    [Authorize(Roles = AppRoles.Trainer)]
    [HttpPost("clients/{clientId:guid}/invitation")]
    public async Task<ActionResult<CreateInvitationResponse>> Create(Guid clientId, CancellationToken ct)
    {
        var client = await _db.Clients.SingleOrDefaultAsync(
            item => item.Id == clientId && item.UserId == _currentUser.UserId && !item.IsDeleted,
            ct);

        if (client is null)
            return NotFound();

        var relationship = await _db.CoachClientRelationships.SingleOrDefaultAsync(
            item => item.CoachUserId == _currentUser.UserId && item.ClientId == clientId && !item.IsDeleted,
            ct);

        relationship ??= new CoachClientRelationship(_currentUser.UserId, clientId);

        if (relationship.Status is CoachClientRelationshipStatus.Active or CoachClientRelationshipStatus.Paused)
            return Conflict(new { message = "This client is already linked to an account." });

        var now = DateTime.UtcNow;
        var previousInvitations = await _db.ClientInvitations
            .Where(item => item.RelationshipId == relationship.Id && item.AcceptedAtUtc == null && item.RevokedAtUtc == null)
            .ToListAsync(ct);

        foreach (var previousInvitation in previousInvitations)
            previousInvitation.Revoke();

        relationship.StartInvitation();
        if (_db.Entry(relationship).State == EntityState.Detached)
            _db.CoachClientRelationships.Add(relationship);

        var token = CreateToken();
        var expiresAtUtc = now.Add(InvitationLifetime);
        _db.ClientInvitations.Add(new ClientInvitation(
            relationship.Id,
            _currentUser.UserId,
            HashToken(token),
            expiresAtUtc));

        await _db.SaveChangesAsync(ct);
        return Ok(new CreateInvitationResponse(token, expiresAtUtc));
    }

    [AllowAnonymous]
    [HttpGet("invitations/{token}")]
    public async Task<ActionResult<InvitationPreviewResponse>> Preview(string token, CancellationToken ct)
    {
        var tokenHash = HashToken(token);
        var preview = await (
            from invitation in _db.ClientInvitations.AsNoTracking()
            join relationship in _db.CoachClientRelationships.AsNoTracking()
                on invitation.RelationshipId equals relationship.Id
            join client in _db.Clients.AsNoTracking() on relationship.ClientId equals client.Id
            join coach in _db.Users.AsNoTracking() on relationship.CoachUserId equals coach.Id
            where invitation.TokenHash == tokenHash &&
                  invitation.AcceptedAtUtc == null &&
                  invitation.RevokedAtUtc == null &&
                  !relationship.IsDeleted &&
                  !client.IsDeleted &&
                  !coach.IsDeleted
            select new InvitationPreviewResponse(
                coach.DisplayName ?? coach.Email ?? "Trainer",
                FormatClientName(client.FirstName, client.LastName),
                invitation.ExpiresAtUtc))
            .SingleOrDefaultAsync(ct);

        if (preview is null)
            return NotFound(new { message = "Invitation was not found or has been revoked." });

        if (preview.ExpiresAtUtc <= DateTime.UtcNow)
            return StatusCode(StatusCodes.Status410Gone, new { message = "Invitation has expired." });

        return Ok(preview);
    }

    [Authorize]
    [HttpPost("invitations/{token}/accept")]
    public async Task<ActionResult<AcceptInvitationResponse>> Accept(string token, CancellationToken ct)
    {
        var tokenHash = HashToken(token);
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);

        var invitation = await _db.ClientInvitations.SingleOrDefaultAsync(
            item => item.TokenHash == tokenHash &&
                    item.AcceptedAtUtc == null &&
                    item.RevokedAtUtc == null &&
                    item.ExpiresAtUtc > DateTime.UtcNow,
            ct);

        if (invitation is null)
            return NotFound(new { message = "Invitation was not found, expired, or has already been used." });

        var relationship = await _db.CoachClientRelationships.SingleOrDefaultAsync(
            item => item.Id == invitation.RelationshipId && !item.IsDeleted,
            ct);
        if (relationship is null)
            return NotFound();

        var client = await _db.Clients.SingleOrDefaultAsync(
            item => item.Id == relationship.ClientId && !item.IsDeleted,
            ct);
        if (client is null)
            return NotFound();

        if (client.LinkedUserId.HasValue && client.LinkedUserId.Value != _currentUser.UserId)
            return Conflict(new { message = "This client card is already linked to another account." });

        var user = await _userManager.FindByIdAsync(_currentUser.UserId.ToString());
        if (user is null || user.IsDeleted)
            return Unauthorized();

        await EnsureRoleAsync(AppRoles.Client);
        if (!await _userManager.IsInRoleAsync(user, AppRoles.Client))
        {
            var roleResult = await _userManager.AddToRoleAsync(user, AppRoles.Client);
            if (!roleResult.Succeeded)
                return BadRequest(new { errors = roleResult.Errors.Select(error => error.Description).ToArray() });
        }

        client.LinkUser(user.Id);
        relationship.Activate();
        invitation.Accept();

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(new AcceptInvitationResponse(relationship.Id, client.Id, relationship.Status));
    }

    [Authorize(Roles = AppRoles.Trainer)]
    [HttpDelete("clients/{clientId:guid}/invitation")]
    public async Task<IActionResult> Revoke(Guid clientId, CancellationToken ct)
    {
        var relationship = await _db.CoachClientRelationships.SingleOrDefaultAsync(
            item => item.ClientId == clientId &&
                    item.CoachUserId == _currentUser.UserId &&
                    !item.IsDeleted,
            ct);

        if (relationship is null)
            return NotFound();

        if (relationship.Status != CoachClientRelationshipStatus.Pending)
            return Conflict(new { message = "There is no pending invitation to revoke." });

        var invitations = await _db.ClientInvitations
            .Where(item => item.RelationshipId == relationship.Id && item.AcceptedAtUtc == null && item.RevokedAtUtc == null)
            .ToListAsync(ct);

        foreach (var invitation in invitations)
            invitation.Revoke();

        relationship.CancelInvitation();
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task EnsureRoleAsync(string roleName)
    {
        if (await _roleManager.RoleExistsAsync(roleName))
            return;

        var result = await _roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
        if (!result.Succeeded)
            throw new InvalidOperationException($"Could not create role '{roleName}'.");
    }

    private static string CreateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static string HashToken(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string FormatClientName(string firstName, string? lastName) =>
        string.Join(' ', new[] { firstName, lastName }.Where(value => !string.IsNullOrWhiteSpace(value)));

    public sealed record CreateInvitationResponse(string Token, DateTime ExpiresAtUtc);
    public sealed record InvitationPreviewResponse(string CoachName, string ClientName, DateTime ExpiresAtUtc);
    public sealed record AcceptInvitationResponse(
        Guid RelationshipId,
        Guid ClientId,
        CoachClientRelationshipStatus Status);
}
