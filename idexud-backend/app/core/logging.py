import logging
import sys

def configurar_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    # Silenciar un poco el ruido de SQLAlchemy
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)