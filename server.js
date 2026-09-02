const path = require("path");
const express = require("express");
const sql = require("mssql");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DEMO_MODE = String(process.env.DEMO_MODE || "true").toLowerCase() !== "false";

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool({
      server: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT || 1433),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: String(process.env.DB_ENCRYPT || "false").toLowerCase() === "true",
        trustServerCertificate: String(process.env.DB_TRUST_CERTIFICATE || "true").toLowerCase() !== "false"
      },
      pool: { max: 8, min: 0, idleTimeoutMillis: 30000 },
      connectionTimeout: 15000,
      requestTimeout: 30000
    }).connect().catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

const demoRows = [
  { id: "LQ-260901", fecha: "2026-09-01", unidad: "UT SCAIN", contrato: "CT-018", segmento: "ESCOLAR", ruta: "R-104", beneficiario: "TRANSPORTES ANDINOS", concepto: "OPERACIÓN MENSUAL", estado: "APROBADA", valor: 18450000 },
  { id: "LQ-260902", fecha: "2026-09-01", unidad: "UT SCAIN", contrato: "CT-018", segmento: "ESCOLAR", ruta: "R-087", beneficiario: "MOVILIDAD DEL SUR", concepto: "OPERACIÓN MENSUAL", estado: "EN REVISIÓN", valor: 12780000 },
  { id: "LQ-260903", fecha: "2026-09-02", unidad: "CONSORCIO 2026", contrato: "CT-022", segmento: "RURAL", ruta: "R-213", beneficiario: "RUTAS SEGURAS SAS", concepto: "AJUSTE DE KILOMETRAJE", estado: "PENDIENTE", valor: 6940000 },
  { id: "LQ-260904", fecha: "2026-09-02", unidad: "CONSORCIO 2026", contrato: "CT-022", segmento: "RURAL", ruta: "R-205", beneficiario: "LOGÍSTICA ESCOLAR", concepto: "OPERACIÓN MENSUAL", estado: "APROBADA", valor: 21160000 },
  { id: "LQ-260905", fecha: "2026-09-02", unidad: "UT SCAIN", contrato: "CT-018", segmento: "ESCOLAR", ruta: "R-119", beneficiario: "TRANSPORTES ANDINOS", concepto: "DESCUENTO", estado: "RECHAZADA", valor: 3580000 },
  { id: "LQ-260906", fecha: "2026-08-31", unidad: "UNIÓN TEMPORAL NORTE", contrato: "CT-031", segmento: "URBANO", ruta: "R-031", beneficiario: "MOVILIDAD DEL SUR", concepto: "OPERACIÓN MENSUAL", estado: "APROBADA", valor: 15790000 },
  { id: "LQ-260907", fecha: "2026-08-30", unidad: "UNIÓN TEMPORAL NORTE", contrato: "CT-031", segmento: "URBANO", ruta: "R-044", beneficiario: "RUTAS SEGURAS SAS", concepto: "NOVEDAD OPERATIVA", estado: "EN REVISIÓN", valor: 8240000 },
  { id: "LQ-260908", fecha: "2026-08-29", unidad: "UT SCAIN", contrato: "CT-018", segmento: "ESCOLAR", ruta: "R-072", beneficiario: "LOGÍSTICA ESCOLAR", concepto: "OPERACIÓN MENSUAL", estado: "APROBADA", valor: 19950000 }
];

function cleanIdentifier(value) {
  if (!/^[A-Za-z0-9_\.]+$/.test(value || "")) throw new Error("DB_VIEW inválida");
  return value.split(".").map((part) => `[${part}]`).join(".");
}

function normalize(row, index) {
  const keys = Object.keys(row);
  const find = (...candidates) => {
    const key = keys.find((item) => candidates.some((candidate) => item.toLowerCase() === candidate));
    return key ? row[key] : undefined;
  };
  return {
    id: String(find("id", "id_liquidacion", "liquidacion", "numero_liquidacion") ?? `LQ-${index + 1}`),
    fecha: find("fecha", "fecha_liquidacion", "fecha_registro") ?? null,
    unidad: String(find("ut", "unidad", "union_temporal") ?? "SIN UNIDAD"),
    contrato: String(find("contrato", "numero_contrato") ?? "SIN CONTRATO"),
    segmento: String(find("segmento", "tipo_servicio") ?? "SIN SEGMENTO"),
    ruta: String(find("ruta", "numero_ruta") ?? "SIN RUTA"),
    beneficiario: String(find("beneficiario", "proveedor", "contratista") ?? "SIN BENEFICIARIO"),
    concepto: String(find("concepto", "descripcion", "detalle") ?? "LIQUIDACIÓN"),
    estado: String(find("estado", "estado_liquidacion") ?? "PENDIENTE").toUpperCase(),
    valor: Number(find("valor", "valor_total", "total", "valor_liquidacion") ?? 0)
  };
}

app.get("/api/health", async (_req, res) => {
  const payload = { ok: true, service: "consolidado-liquidaciones", mode: DEMO_MODE ? "demo" : "database" };
  if (DEMO_MODE) return res.json(payload);
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    res.json({ ...payload, database: "connected" });
  } catch (_error) {
    res.status(503).json({ ...payload, ok: false, database: "unavailable" });
  }
});

app.get("/api/liquidaciones", async (_req, res) => {
  try {
    if (DEMO_MODE) return res.json({ mode: "demo", updatedAt: new Date().toISOString(), rows: demoRows });
    const pool = await getPool();
    const view = cleanIdentifier(process.env.DB_VIEW || "Vista_Resumen_Mensual_Operativo_COMPLETA");
    const result = await pool.request().query(`SELECT TOP (5000) * FROM ${view}`);
    res.json({ mode: "database", updatedAt: new Date().toISOString(), rows: result.recordset.map(normalize) });
  } catch (error) {
    console.error("Database query failed:", error.message);
    res.status(503).json({ error: "No fue posible consultar la base de datos." });
  }
});

app.use((_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`Consolidado disponible en puerto ${PORT}`));
