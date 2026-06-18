import asyncio
import logging
from sqlalchemy import text
from app.db.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("schema_migration")

async def migrate_schema():
    async with engine.begin() as conn:
        logger.info("Starting database schema migration for governance_requests...")
        
        # 1. Add 'operation' column
        # Note: governanceoperation type already exists based on research
        try:
            logger.info("Adding 'operation' column...")
            await conn.execute(text("""
                ALTER TABLE governance_requests 
                ADD COLUMN IF NOT EXISTS operation governanceoperation NOT NULL DEFAULT 'CREATE';
            """))
            logger.info("Successfully added 'operation' column.")
        except Exception as e:
            logger.error(f"Failed to add 'operation' column: {e}")
            
        # 2. Add 'old_payload' column
        try:
            logger.info("Adding 'old_payload' column...")
            await conn.execute(text("""
                ALTER TABLE governance_requests 
                ADD COLUMN IF NOT EXISTS old_payload JSON;
            """))
            logger.info("Successfully added 'old_payload' column.")
        except Exception as e:
            logger.error(f"Failed to add 'old_payload' column: {e}")
            
        logger.info("Migration finished.")

if __name__ == "__main__":
    asyncio.run(migrate_schema())
