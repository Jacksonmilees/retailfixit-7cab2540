using Microsoft.IdentityModel.Tokens;
using RetailFixIt.Contracts.Auth;
using RetailFixIt.Infrastructure.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RetailFixIt.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/auth");

        // POST /v1/auth/login
        group.MapPost("/login", async (
            LoginRequest request,
            RetailFixItDbContext db,
            IConfiguration config) =>
        {
            // For demo purposes - in production, verify password hash
            var user = db.Users.FirstOrDefault(u => u.Email == request.Email);
            if (user == null)
            {
                // Return demo users for the mock implementation
                user = db.Users.First();
            }

            var token = GenerateJwtToken(user, config);
            var refreshToken = GenerateRefreshToken();

            return Results.Ok(new LoginResponse
            {
                AccessToken = token,
                RefreshToken = refreshToken,
                User = new UserDto
                {
                    Id = user.Id.ToString(),
                    TenantId = user.TenantId.ToString(),
                    Email = user.Email,
                    Name = user.Name,
                    Roles = user.GetRoles()
                }
            });
        }).AllowAnonymous();

        // POST /v1/auth/refresh
        group.MapPost("/refresh", (
            RefreshRequest request,
            IConfiguration config) =>
        {
            // In production: validate refresh token against database
            var newAccessToken = GenerateNewAccessTokenFromRefresh(request.RefreshToken, config);
            var newRefreshToken = GenerateRefreshToken();

            return Results.Ok(new { AccessToken = newAccessToken, RefreshToken = newRefreshToken });
        });

        // POST /v1/auth/logout
        group.MapPost("/logout", () =>
        {
            // In production: revoke refresh token
            return Results.Ok();
        });

        // GET /v1/auth/me
        group.MapGet("/me", async (
            ClaimsPrincipal user,
            RetailFixItDbContext db) =>
        {
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId == null) return Results.Unauthorized();

            var dbUser = await db.Users.FindAsync(Guid.Parse(userId));
            if (dbUser == null) return Results.NotFound();

            return Results.Ok(new UserDto
            {
                Id = dbUser.Id.ToString(),
                TenantId = dbUser.TenantId.ToString(),
                Email = dbUser.Email,
                Name = dbUser.Name,
                Roles = dbUser.GetRoles()
            });
        });

        return app;
    }

    private static string GenerateJwtToken(Domain.Entities.User user, IConfiguration config)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("tid", user.TenantId.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Add role claims
        claims = claims.Concat(user.GetRoles().Select(r => new Claim(ClaimTypes.Role, r))).ToArray();

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(Guid.NewGuid().ToByteArray());
    }

    private static string GenerateNewAccessTokenFromRefresh(string refreshToken, IConfiguration config)
    {
        // In production: validate refresh token and get user
        // For now, return a placeholder
        return "new-access-token";
    }
}
