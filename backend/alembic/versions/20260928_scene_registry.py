"""Preserve legacy data and enable validated scene registration."""
revision = "20260928_scene_registry"
down_revision = "8e6079917d08"
branch_labels = None
depends_on = None
def upgrade():
    from alembic import op
    from app.core.database import Base
    from app.core.migrations import migrate
    import app.models
    migrate(op.get_bind(), Base.metadata)
def downgrade():
    raise RuntimeError("Registry migration is forward-only to preserve user data.")
