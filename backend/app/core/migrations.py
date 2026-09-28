"""Add missing columns and preserve legacy records/files without trusting their provenance."""
from sqlalchemy import inspect, text
from alembic.migration import MigrationContext
from alembic.operations import Operations

def migrate(connection, metadata):
    metadata.create_all(connection)
    inspector = inspect(connection)
    for table in metadata.sorted_tables:
        existing = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name not in existing:
                name = connection.dialect.identifier_preparer.quote(column.name)
                table_name = connection.dialect.identifier_preparer.quote(table.name)
                type_sql = column.type.compile(dialect=connection.dialect)
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {name} {type_sql}"))
    columns = {c["name"]: c for c in inspect(connection).get_columns("satellite_scenes")}
    if not columns["acquisition_datetime"]["nullable"]:
        ops = Operations(MigrationContext.configure(connection))
        with ops.batch_alter_table("satellite_scenes") as batch:
            batch.alter_column("acquisition_datetime", existing_type=columns["acquisition_datetime"]["type"], nullable=True)
    # Only migrate records without an explicit modern registry; keep original payloads and files.
    from app.models.satellite import SatelliteScene
    rows = connection.execute(SatelliteScene.__table__.select()).mappings()
    for row in rows:
        if (row["metadata_json"] or {}).get("registry_version"):
            continue
        source = row["source"] or "LEGACY_UNVERIFIED"
        if not row["is_demo"]:
            source = "LEGACY_UNVERIFIED"
        connection.execute(SatelliteScene.__table__.update().where(SatelliteScene.id == row["id"]).values(
            source=source, status="NEEDS_VALIDATION", scene_id=row["scene_id"] or row["id"]))
