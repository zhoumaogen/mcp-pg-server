import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { z } from "zod";

const { Pool } = pg;
const currentDir = dirname(fileURLToPath(import.meta.url));

function loadEnvFiles() {
  const candidates = [
    resolve(currentDir, ".env"),
    resolve(process.cwd(), ".env")
  ];

  for (const envPath of candidates) {
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath });
      return;
    }
  }
}

loadEnvFiles();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isReadOnlySql(sql: string): boolean {
  const normalized = sql.trim().toLowerCase();
  return normalized.startsWith("select") || normalized.startsWith("with");
}

function hasLimitClause(sql: string): boolean {
  return /\blimit\s+\d+\s*$/i.test(sql.trim().replace(/;$/, ""));
}

function buildPool() {
  return new Pool({
    host: requireEnv("PGHOST"),
    port: Number(process.env.PGPORT ?? 5432),
    user: requireEnv("PGUSER"),
    password: requireEnv("PGPASSWORD"),
    database: requireEnv("PGDATABASE"),
    ssl:
      process.env.PGSSL === "true"
        ? { rejectUnauthorized: false }
        : false
  });
}

const pool = buildPool();

const server = new McpServer({
  name: "pg-query-server",
  version: "1.0.0"
});

server.tool(
  "query_pg",
  {
    sql: z
      .string()
      .min(1)
      .describe("Read-only PostgreSQL SQL. Only SELECT or WITH queries are allowed."),
    limit: z
      .number()
      .int()
      .positive()
      .max(1000)
      .optional()
      .describe("Optional row limit to append if the SQL does not already include LIMIT.")
  },
  async ({ sql, limit }) => {
    try {
      if (!isReadOnlySql(sql)) {
        throw new Error("Only SELECT and WITH read-only queries are allowed.");
      }

      let finalSql = sql.trim().replace(/;$/, "");
      if (limit && !hasLimitClause(finalSql)) {
        finalSql = `${finalSql} LIMIT ${limit}`;
      }

      const result = await pool.query(finalSql);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                rowCount: result.rowCount,
                rows: result.rows
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Query failed: ${message}` }],
        isError: true
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

const shutdown = async () => {
  await pool.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
