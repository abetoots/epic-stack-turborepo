## Connecting to your production database

The location of the sqlite database is kinda funny. The real location is in
`/var/lib/litefs/dbs/sqlite.db`. See `litefsy.yml` under `data` section. Make
sure they are in sync with `fly.toml` mounts section. However, during
development you connect to it via the fake filesystem managed by LiteFS so it
can propagate any changes to your database to all replicas.

So to connect to your database, you'll want to connect to it at
`${LITEFS_DIR}/sqlite.db` in the deployed application. See `litefsy.yml` under
`fuse` section. This is set in the `Dockerfile`. Because it is SQLite, you
cannot connect to it unless you're running a command-line session on the
machine. You can do this using `fly ssh console`. The Dockerfile simplifies this
further by adding a `database-cli` command. See `Dockerfile`. You can connect to
the live database by running `fly ssh console -C database-cli`.

Change all `npm run prisma:studio` commands to
`npm run prisma:studio --prefix apps/{YOUR_APP_NAME}`.

Add `--schema ./{PATH_TO_SCHEMA}` to all `npx prisma migrate` commands mentioned
in doc.
