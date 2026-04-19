
using BilaTraining.Application;
using BilaTraining.Infrastructure;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
const string FrontendCorsPolicy = "Frontend";

// Add services to the container.

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            origin == "http://localhost:4200" ||
            origin == "https://localhost:4200" ||
            origin == "http://localhost:5173" ||
            origin == "https://localhost:5173" ||
            origin == "https://hadley-unrefutable-superrespectably.ngrok-free.dev" ||
            IsNetlifyOrigin(origin))
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "BilaTraining API", Version = "v1" });

    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        Description = "Paste a JWT bearer token here.",
        Reference = new OpenApiReference
        {
            Id = "Bearer",
            Type = ReferenceType.SecurityScheme
        }
    };

    options.AddSecurityDefinition("Bearer", jwtSecurityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [jwtSecurityScheme] = Array.Empty<string>()
    });
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();

static bool IsNetlifyOrigin(string origin)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        return false;

    return uri.Scheme == Uri.UriSchemeHttps &&
           uri.Host.EndsWith(".netlify.app", StringComparison.OrdinalIgnoreCase);
}
