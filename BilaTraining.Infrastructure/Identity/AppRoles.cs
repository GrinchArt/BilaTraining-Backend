namespace BilaTraining.Infrastructure.Identity;

public static class AppRoles
{
    public const string Trainer = "Trainer";
    public const string Client = "Client";

    public static readonly Guid TrainerId = Guid.Parse("8d7a3568-682f-4a4d-b7d5-9805016e42f1");
    public static readonly Guid ClientId = Guid.Parse("99555d6a-cef4-4a89-b110-b721582ebd67");
}
