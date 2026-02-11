import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.branch_service import BranchService
from app.core.cache import cache

@pytest.mark.asyncio
async def test_get_project_graph_cache():
    # Mock DB session
    mock_db = AsyncMock()
    
    # Setup mock result for db.execute
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    
    # db.execute is async, returns mock_result
    mock_db.execute.return_value = mock_result
    
    # Mock Cache
    with patch.object(cache, 'get', new_callable=AsyncMock) as mock_get, \
         patch.object(cache, 'set', new_callable=AsyncMock) as mock_set:
        
        # Case 1: Cache Miss
        mock_get.return_value = None
        
        await BranchService.get_project_graph(mock_db, project_id=1)
        
        mock_get.assert_called_with("project_graph:1")
        mock_set.assert_called_once() # Should set cache
        
        # Case 2: Cache Hit
        mock_get.return_value = {"branches": [], "commits": []}
        mock_set.reset_mock()
        
        result = await BranchService.get_project_graph(mock_db, project_id=1)
        
        mock_get.assert_called_with("project_graph:1")
        mock_set.assert_not_called() # Should NOT set cache again
        assert result == {"branches": [], "commits": []}
