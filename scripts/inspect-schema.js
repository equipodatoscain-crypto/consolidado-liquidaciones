const sql = require("mssql");

(async () => {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });
  const result = await pool.request().query(`
    SELECT s.name AS esquema, o.name AS objeto, o.type_desc
    FROM sys.objects o
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.type IN ('U', 'V')
    ORDER BY o.type_desc, o.name
  `);
  console.log(result.recordset.map((item) => `${item.esquema}.${item.objeto} [${item.type_desc}]`).join("\n") || "NO_MATCHES");
  await pool.close();
})().catch((error) => {
  console.error("DISCOVERY_ERROR:", error.message);
  process.exit(1);
});
