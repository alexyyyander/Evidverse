import asyncio
import sys
import os
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import selectinload

# Add backend to sys.path
sys.path.append(os.getcwd())

from app.core.db import AsyncSessionLocal
from app.models.project import Project
from app.models.like import Like
from app.services.feed_service import FeedService

async def debug_feed():
    async with AsyncSessionLocal() as db:
        print("--- Debugging Feed Service ---")
        
        # Check total projects
        res = await db.execute(select(func.count(Project.internal_id)))
        count = res.scalar()
        print(f"Total projects in DB: {count}")

        # Check public projects
        res = await db.execute(select(func.count(Project.internal_id)).where(Project.is_public == True))
        public_count = res.scalar()
        print(f"Public projects in DB: {public_count}")
        
        # Test sort="new"
        print("\nTesting sort='new'...")
        projects_new = await FeedService.get_public_feed(db, None, sort="new")
        print(f"Projects found with sort='new': {len(projects_new)}")
        for p in projects_new:
            print(f"  - {p.name} (id={p.public_id}, created_at={p.created_at})")

        # Test sort="hot"
        print("\nTesting sort='hot'...")
        projects_hot = await FeedService.get_public_feed(db, None, sort="hot")
        print(f"Projects found with sort='hot': {len(projects_hot)}")
        for p in projects_hot:
            print(f"  - {p.name} (id={p.public_id}, created_at={p.created_at}, likes={p.likes_count})")

if __name__ == "__main__":
    asyncio.run(debug_feed())
