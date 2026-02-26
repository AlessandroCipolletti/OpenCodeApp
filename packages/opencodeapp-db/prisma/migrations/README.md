# Prisma Migrations

Migrations are managed by Prisma. To create a new migration:

```bash
npm run migrate:dev -w packages/opencodeapp-db -- --name <migration_name>
```

To apply migrations in production:

```bash
npm run migrate -w packages/opencodeapp-db
```
