using System.Text.Json;
using CarHorizontal.Api.Modules.Auth;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace CarHorizontal.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await WriteProblemAsync(context, ex);
        }
    }

    private async Task WriteProblemAsync(HttpContext context, Exception ex)
    {
        var (status, title, detail) = ex switch
        {
            ValidationException ve => (StatusCodes.Status400BadRequest, "Validation failed", BuildValidationDetail(ve)),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "Forbidden", ex.Message),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Resource not found", ex.Message),
            InvalidCredentialsException => (StatusCodes.Status401Unauthorized, "Invalid credentials", ex.Message),
            UserAlreadyExistsException => (StatusCodes.Status409Conflict, "User already exists", ex.Message),
            OrganizationMembershipException => (StatusCodes.Status403Forbidden, "Forbidden", ex.Message),
            InvalidRefreshTokenException => (StatusCodes.Status401Unauthorized, "Invalid refresh token", ex.Message),
            AuthException => (StatusCodes.Status400BadRequest, "Authentication error", ex.Message),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred", _env.IsDevelopment() ? ex.ToString() : "Internal server error")
        };

        if (status >= 500)
        {
            _logger.LogError(ex, "Unhandled exception while processing {Method} {Path}", context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning(ex, "Handled exception ({Status}) while processing {Method} {Path}", status, context.Request.Method, context.Request.Path);
        }

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.com/{status}",
            Instance = context.Request.Path
        };

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem, JsonOptions));
    }

    private static string BuildValidationDetail(ValidationException ve)
    {
        if (ve.Errors is null) return ve.Message;
        return string.Join("; ", ve.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}"));
    }
}
