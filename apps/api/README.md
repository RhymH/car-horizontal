# CarHorizontal — API

ASP.NET Core 10 backend pour CarHorizontal. Solution `CarHorizontal.Api.slnx`
regroupant trois projets : `CarHorizontal.Api`, `CarHorizontal.Domain`,
`CarHorizontal.Infrastructure`.

## Postgres local (dev)

```powershell
docker-compose up -d
```

Lance Postgres 17 sur `localhost:5432` :

| Param      | Valeur            |
|------------|-------------------|
| Database   | `db_carhorizontal` |
| User       | `chdbuser`        |
| Password   | `ch_local_dev`    |

Connection string par défaut (à mettre dans `appsettings.Development.json`) :

```
Host=localhost;Port=5432;Database=db_carhorizontal;Username=chdbuser;Password=ch_local_dev
```

Test de connexion :

```powershell
docker exec -it carhorizontal-db psql -U chdbuser -d db_carhorizontal -c "select 1;"
```

## Build / run

```powershell
dotnet build
dotnet run --project CarHorizontal.Api
```

Migrations EF Core (CLI uniquement) :

```powershell
dotnet ef migrations add <Name> -p CarHorizontal.Infrastructure -s CarHorizontal.Api
dotnet ef database update            -p CarHorizontal.Infrastructure -s CarHorizontal.Api
```
