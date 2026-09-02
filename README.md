# Consolidado de Liquidaciones

Dashboard web independiente para consultar, filtrar y exportar el consolidado de liquidaciones de SCAIN.

## Ejecución local

```bash
npm install
npm start
```

Abre `http://localhost:10000`. El modo demostrativo está activo por defecto.

## Conexión a SQL Server

Las credenciales nunca se almacenan en GitHub. Configura las variables descritas en `.env.example` desde Render y cambia `DEMO_MODE` a `false`. La vista predeterminada es `Vista_Resumen_Mensual_Operativo_COMPLETA`; el adaptador reconoce nombres comunes de columnas y puede ajustarse al esquema definitivo.

## Render

El archivo `render.yaml` declara un servicio web nuevo llamado `consolidado-liquidaciones`, preparado para el plan gratuito.
