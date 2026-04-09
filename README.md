# MCP PostgreSQL Server

A minimal [Model Context Protocol](https://modelcontextprotocol.io) server that exposes a read-only PostgreSQL query tool over stdio.

## Features

- MCP `query_pg` tool for PostgreSQL queries
- Read-only guard that only accepts `SELECT` and `WITH`
- Optional row limit injection to keep responses small
- Simple env-based configuration

## Prerequisites

- Node.js 20+
- A PostgreSQL database
- A read-only database user is strongly recommended

## Setup

```bash
npm install
cp .env.example .env
```

Set the environment variables in `.env` or in your MCP client configuration:

```bash
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=readonly_user
PGPASSWORD=change_me
PGDATABASE=postgres
PGSCHEMA=public
PGSSL=false
```

## Build and run

```bash
npm run build
npm start
```

## Tool

### `query_pg`

Parameters:

- `sql`: Read-only SQL. Only `SELECT` and `WITH` are allowed.
- `limit`: Optional max rows to append when the SQL does not already include `LIMIT`.

Example prompt in an MCP client:

```text
Use query_pg to list the latest 10 users.
```

## Example MCP client config

```json
{
  "mcpServers": {
    "pg-query": {
      "command": "node",
      "args": ["C:/absolute/path/to/build/index.js"],
      "env": {
        "PGHOST": "127.0.0.1",
        "PGPORT": "5432",
        "PGUSER": "readonly_user",
        "PGPASSWORD": "change_me",
        "PGDATABASE": "postgres",
        "PGSCHEMA": "public",
        "PGSSL": "false"
      }
    }
  }
}
```

## Notes

- Do not print logs to stdout in an MCP stdio server.
- Use a read-only PostgreSQL user in production.
- If you need stronger safety, replace free-form SQL with table-specific tools.
