using Microsoft.AspNetCore.Identity;

namespace BilaTraining.Infrastructure.Identity;

public sealed class AppUser : IdentityUser<Guid>
{
    public string? DisplayName { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
}
