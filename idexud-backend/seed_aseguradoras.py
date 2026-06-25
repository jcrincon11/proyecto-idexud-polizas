"""
seed_aseguradoras.py
====================
Pobla la tabla 'aseguradoras' con las entidades reales que opera IDEXUD.
Si un NIT ya existe en la BD, omite ese registro (ON CONFLICT DO NOTHING).

Uso:
    cd idexud-backend
    python seed_aseguradoras.py
"""

import os
import sys

# ── Intentar leer .env si python-dotenv está instalado ────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass  # sin dotenv: se usan los valores de entorno del sistema

import psycopg2
from psycopg2.extras import execute_values

# ── Conexión ──────────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     os.getenv("POSTGRES_HOST", "localhost"),
    "port":     int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname":   os.getenv("POSTGRES_DB",   "idexud_polizas"),
    "user":     os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
}

# ── Datos a insertar ──────────────────────────────────────────────────────────
ASEGURADORAS = [
    {
        "nombre":           "Seguros del Estado S.A.",
        "nit":              "860009578",
        "contacto_nombre":  None,
        "contacto_email":   None,
        "contacto_telefono": None,
    },
    {
        "nombre":           "Aseguradora Solidaria de Colombia Entidad Cooperativa",
        "nit":              "860503617",
        "contacto_nombre":  None,
        "contacto_email":   None,
        "contacto_telefono": None,
    },
    {
        "nombre":           "Seguros Comerciales Bolívar S.A.",
        "nit":              "860002503",
        "contacto_nombre":  None,
        "contacto_email":   None,
        "contacto_telefono": None,
    },
    {
        "nombre":           "Compañía Mundial de Seguros S.A.",
        "nit":              "860037013",
        "contacto_nombre":  None,
        "contacto_email":   None,
        "contacto_telefono": None,
    },
    {
        "nombre":           "Seguros Generales Suramericana S.A. (SURA)",
        "nit":              "890903407",
        "contacto_nombre":  None,
        "contacto_email":   None,
        "contacto_telefono": None,
    },
    {
        "nombre":           "Liberty Seguros S.A.",
        "nit":              "860039988",
        "contacto_nombre":  None,
        "contacto_email":   None,
        "contacto_telefono": None,
    },
    {
        "nombre":           "Compañía Aseguradora de Fianzas S.A. Confianza",
        "nit":              "860027842",
        "contacto_nombre":  None,
        "contacto_email":   None,
        "contacto_telefono": None,
    },
]

# ── Ejecución ─────────────────────────────────────────────────────────────────

def main() -> None:
    print("Conectando a PostgreSQL…")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
    except psycopg2.OperationalError as e:
        print(f"\n[ERROR] No se pudo conectar a la base de datos:\n  {e}")
        sys.exit(1)

    cur = conn.cursor()

    insertadas = 0
    omitidas   = 0

    for aseg in ASEGURADORAS:
        # Savepoint individual: una violación de unicidad no aborta toda la transacción
        cur.execute("SAVEPOINT sp_aseg")
        try:
            cur.execute(
                """
                INSERT INTO aseguradoras
                    (nombre, nit, contacto_nombre, contacto_email, contacto_telefono, activa)
                VALUES
                    (%(nombre)s, %(nit)s, %(contacto_nombre)s, %(contacto_email)s,
                     %(contacto_telefono)s, TRUE)
                ON CONFLICT (nit) DO NOTHING
                """,
                aseg,
            )
            cur.execute("RELEASE SAVEPOINT sp_aseg")
            if cur.rowcount == 1:
                insertadas += 1
                print(f"  [+] Insertada: {aseg['nombre']} (NIT {aseg['nit']})")
            else:
                omitidas += 1
                print(f"  [~] Omitida  (NIT ya existe): {aseg['nombre']}")
        except Exception as e:
            # Captura UniqueViolation en 'nombre' u otro conflicto
            cur.execute("ROLLBACK TO SAVEPOINT sp_aseg")
            cur.execute("RELEASE SAVEPOINT sp_aseg")
            omitidas += 1
            print(f"  [~] Omitida  (ya existe): {aseg['nombre']}  — {e!s:.80}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nListo. {insertadas} insertadas, {omitidas} omitidas.")


if __name__ == "__main__":
    main()
