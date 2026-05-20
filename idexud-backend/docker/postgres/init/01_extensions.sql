-- =============================================================================
-- docker/postgres/init/01_extensions.sql
-- Se ejecuta UNA SOLA VEZ al crear el contenedor de PostgreSQL por primera vez.
-- =============================================================================

-- UUID como tipo de dato disponible (útil para tokens futuros)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Búsqueda de texto en español (para filtros de contratistas / pólizas)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Índices trigram (búsqueda parcial en nombres sin LIKE '%...%' lento)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Mensaje de confirmación visible en los logs del contenedor
DO $$
BEGIN
  RAISE NOTICE '✅ Extensiones de Idexud instaladas: uuid-ossp, unaccent, pg_trgm';
END
$$;
