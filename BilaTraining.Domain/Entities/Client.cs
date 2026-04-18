using BilaTraining.Domain.Common;

namespace BilaTraining.Domain.Entities;

public sealed class Client : AuditableEntity
{
    public Guid UserId { get; private set; }

    public string FirstName { get; private set; } = default!;
    public string? LastName { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? Notes { get; private set; }

    private Client() { }

    public Client(Guid userId, string firstName, string? lastName = null)
    {
        UserId = userId;
        UpdateProfile(firstName, lastName, null, null, null);
    }

    public void UpdateContacts(string? phone, string? email)
    {
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        MarkUpdated();
    }

    public void UpdateNotes(string? notes)
    {
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        MarkUpdated();
    }

    public void UpdateProfile(
        string firstName,
        string? lastName,
        string? phone,
        string? email,
        string? notes)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new ArgumentException("FirstName is required.", nameof(firstName));

        FirstName = firstName.Trim();
        LastName = string.IsNullOrWhiteSpace(lastName) ? null : lastName.Trim();
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        MarkUpdated();
    }
}
