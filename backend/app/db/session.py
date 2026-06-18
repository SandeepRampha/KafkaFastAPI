from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession


from app.core.config import settings

engine = create_async_engine(
    settings.sqlalchemy_database_uri,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_timeout=60,
    connect_args={
        "timeout": 60,
        "command_timeout": 60
    }
)

SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with SessionLocal() as db:
        yield db
