"""remove_unique_orthanc_id_add_composite_constraint

Revision ID: ab7cc99d5850
Revises: 19517262c8c5
Create Date: 2025-06-29 02:13:36.852253

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab7cc99d5850'
down_revision: Union[str, None] = '19517262c8c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove the unique constraint on orthanc_id
    op.drop_index('ix_images_orthanc_id', table_name='images')
    
    # Create a new index on orthanc_id (non-unique)
    op.create_index('ix_images_orthanc_id', 'images', ['orthanc_id'], unique=False)
    
    # Create a composite unique constraint on orthanc_id, project_id, and folder_id
    # This prevents the same image from being uploaded to the same folder in the same project
    op.create_unique_constraint('uq_images_orthanc_project_folder', 'images', ['orthanc_id', 'project_id', 'folder_id'])


def downgrade() -> None:
    # Remove the composite unique constraint
    op.drop_constraint('uq_images_orthanc_project_folder', 'images', type_='unique')
    
    # Remove the non-unique index
    op.drop_index('ix_images_orthanc_id', table_name='images')
    
    # Restore the original unique constraint on orthanc_id
    op.create_index('ix_images_orthanc_id', 'images', ['orthanc_id'], unique=True)
