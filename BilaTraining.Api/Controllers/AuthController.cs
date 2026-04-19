using BilaTraining.Infrastructure.Auth;
using BilaTraining.Infrastructure.Identity;
using BilaTraining.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;

namespace BilaTraining.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly JwtTokenGenerator _jwtTokenGenerator;
    private readonly JwtOptions _jwtOptions;
    private readonly ApplicationDbContext _dbContext;

    public AuthController(
        UserManager<AppUser> userManager,
        JwtTokenGenerator jwtTokenGenerator,
        JwtOptions jwtOptions,
        ApplicationDbContext dbContext)
    {
        _userManager = userManager;
        _jwtTokenGenerator = jwtTokenGenerator;
        _jwtOptions = jwtOptions;
        _dbContext = dbContext;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
            return Conflict(new { message = "A user with this email already exists." });

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = request.Email.Trim(),
            UserName = request.Email.Trim(),
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim(),
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description).ToArray() });

        var response = await IssueAuthResponseAsync(user, HttpContext.RequestAborted);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || user.IsDeleted)
            return Unauthorized(new { message = "Invalid email or password." });

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword)
            return Unauthorized(new { message = "Invalid email or password." });

        var response = await IssueAuthResponseAsync(user, HttpContext.RequestAborted);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct)
    {
        var existingToken = await _dbContext.RefreshTokens
            .SingleOrDefaultAsync(x => x.Token == request.RefreshToken, ct);

        if (existingToken is null || !existingToken.IsActive)
            return Unauthorized(new { message = "Refresh token is invalid or expired." });

        var user = await _userManager.FindByIdAsync(existingToken.UserId.ToString());
        if (user is null || user.IsDeleted)
            return Unauthorized(new { message = "Refresh token is invalid or expired." });

        existingToken.RevokedAtUtc = DateTime.UtcNow;

        var response = await IssueAuthResponseAsync(user, ct, existingToken);
        return Ok(response);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken ct)
    {
        var refreshToken = await _dbContext.RefreshTokens
            .SingleOrDefaultAsync(x => x.Token == request.RefreshToken, ct);

        if (refreshToken is not null && refreshToken.RevokedAtUtc is null)
        {
            refreshToken.RevokedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(ct);
        }

        return NoContent();
    }

    private async Task<AuthResponse> IssueAuthResponseAsync(
        AppUser user,
        CancellationToken ct,
        RefreshToken? replacedToken = null)
    {
        var accessToken = _jwtTokenGenerator.GenerateToken(user);
        var refreshTokenValue = CreateRefreshTokenValue();

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenValue,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays)
        };

        if (replacedToken is not null)
        {
            replacedToken.ReplacedByToken = refreshTokenValue;
        }

        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(ct);

        return new AuthResponse(accessToken, refreshTokenValue, user.Id, user.Email!, user.DisplayName);
    }

    private static string CreateRefreshTokenValue()
    {
        Span<byte> buffer = stackalloc byte[64];
        RandomNumberGenerator.Fill(buffer);
        return Convert.ToBase64String(buffer)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public sealed record RegisterRequest(string Email, string Password, string? DisplayName);

    public sealed record LoginRequest(string Email, string Password);

    public sealed record RefreshRequest(string RefreshToken);

    public sealed record LogoutRequest(string RefreshToken);

    public sealed record AuthResponse(
        string AccessToken,
        string RefreshToken,
        Guid UserId,
        string Email,
        string? DisplayName);
}
