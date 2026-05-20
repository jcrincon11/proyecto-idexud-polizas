import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Tu ruta de conexión actual
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/idexud_polizas"

async def relajar_base_de_datos():
    print("⏳ Conectando a la base de datos...")
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("🛠️ Relajando reglas de la tabla 'polizas'...")
        # Le decimos a la base de datos que ya no exija estos campos obligatoriamente
        await conn.execute(text("ALTER TABLE polizas ALTER COLUMN numero_poliza DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE polizas ALTER COLUMN vigencia_desde DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE polizas ALTER COLUMN vigencia_hasta DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE polizas ALTER COLUMN aseguradora_id DROP NOT NULL;"))
        await conn.execute(text("ALTER TABLE polizas ALTER COLUMN contratista_id DROP NOT NULL;"))
        
    print("✅ ¡ÉXITO! La base de datos ha sido relajada. Ya acepta Solicitudes de PMO.")
    await engine.dispose()

# Ejecutar el script
if __name__ == "__main__":
    asyncio.run(relajar_base_de_datos())