namespace CarHorizontal.Api.Modules.Auth;

public class AuthException : Exception
{
    public AuthException(string message) : base(message) { }
}

public class InvalidCredentialsException : AuthException
{
    public InvalidCredentialsException() : base("Invalid email or password.") { }
}

public class UserAlreadyExistsException : AuthException
{
    public UserAlreadyExistsException(string email) : base($"A user with email '{email}' already exists.") { }
}

public class OrganizationMembershipException : AuthException
{
    public OrganizationMembershipException() : base("User is not a member of the requested organization.") { }
}

public class InvalidRefreshTokenException : AuthException
{
    public InvalidRefreshTokenException() : base("Refresh token is invalid or expired.") { }
}
