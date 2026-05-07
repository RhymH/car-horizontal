using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CarHorizontal.Infrastructure.Persistence;

internal class DesignTimeCurrentUserService : ICurrentUserService
{
    public Guid? UserId => null;
    public Guid? OrganizationId => null;
    public string? Role => null;
    public bool IsAuthenticated => false;
}

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("CARHORIZONTAL_DESIGN_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=db_carhorizontal;Username=chdbuser;Password=ch_local_dev";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AppDbContext(options, new DesignTimeCurrentUserService());
    }
}
