import unittest
from unittest.mock import MagicMock, patch
from typer.testing import CliRunner
from evidverse.main import app
from evidverse.context import context
import json
from pathlib import Path
import re

runner = CliRunner()

def strip_ansi(text):
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

class TestEvidverseCLI(unittest.TestCase):

    def setUp(self):
        # Mock API Client
        self.api_patcher = patch('evidverse.main.APIClient')
        self.mock_api_class = self.api_patcher.start()
        self.mock_api = self.mock_api_class.return_value
        
        # Mock Context
        self.context_patcher = patch('evidverse.main.context')
        self.mock_context = self.context_patcher.start()
        
        # Mock Config (get_token)
        self.token_patcher = patch('evidverse.main.get_token')
        self.mock_get_token = self.token_patcher.start()
        self.mock_get_token.return_value = "mock-token"

    def tearDown(self):
        self.api_patcher.stop()
        self.context_patcher.stop()
        self.token_patcher.stop()

    def test_version(self):
        result = runner.invoke(app, ["--version"])
        self.assertEqual(result.exit_code, 0)
        self.assertIn("Evidverse CLI version:", strip_ansi(result.stdout))

    def test_status_not_logged_in(self):
        self.mock_get_token.return_value = None
        result = runner.invoke(app, ["status"])
        self.assertEqual(result.exit_code, 0)
        self.assertIn("Not logged in", strip_ansi(result.stdout))

    def test_status_logged_in(self):
        self.mock_api.get_me.return_value = {"id": 1, "email": "test@example.com"}
        self.mock_api.get_projects.return_value = [
            {"id": 101, "name": "Project A", "description": "Desc A"}
        ]
        self.mock_context.evidverse_path = None # Not in repo

        result = runner.invoke(app, ["status"])
        
        self.assertEqual(result.exit_code, 0)
        output = strip_ansi(result.stdout)
        self.assertIn("Logged in as: test@example.com", output)
        self.assertIn("Project A", output)

    def test_init(self):
        self.mock_api.create_project.return_value = {"id": 123, "name": "NewProj"}
        
        # Simulate user input for name
        result = runner.invoke(app, ["init"], input="NewProj\n")
        
        self.assertEqual(result.exit_code, 0)
        output = strip_ansi(result.stdout)
        self.assertIn("Project 'NewProj' created successfully", output)
        self.mock_context.init.assert_called_with(123)

    def test_branch_list(self):
        # Mock context config
        self.mock_context.get_config.return_value = {"project_id": 123, "current_branch": "main"}
        self.mock_context.evidverse_path = Path("/tmp/.evidverse")
        
        self.mock_api.get_branches.return_value = [
            {"name": "main"}, {"name": "dev"}
        ]
        
        result = runner.invoke(app, ["branch"])
        
        self.assertEqual(result.exit_code, 0)
        output = strip_ansi(result.stdout)
        self.assertIn("* main", output)
        self.assertIn("dev", output)

    def test_checkout_existing(self):
        self.mock_context.get_config.return_value = {"project_id": 123, "current_branch": "main"}
        self.mock_context.evidverse_path = Path("/tmp/.evidverse")
        
        self.mock_api.get_branches.return_value = [{"name": "main"}, {"name": "dev"}]
        
        result = runner.invoke(app, ["checkout", "dev"])
        
        self.assertEqual(result.exit_code, 0)
        output = strip_ansi(result.stdout)
        self.assertIn("Switched to branch 'dev'", output)
        self.mock_context.update_config.assert_called_with("current_branch", "dev")

    def test_checkout_non_existing(self):
        self.mock_context.get_config.return_value = {"project_id": 123, "current_branch": "main"}
        self.mock_context.evidverse_path = Path("/tmp/.evidverse")
        
        self.mock_api.get_branches.return_value = [{"name": "main"}]
        
        result = runner.invoke(app, ["checkout", "feature-x"])
        
        self.assertEqual(result.exit_code, 0)
        output = strip_ansi(result.stdout)
        self.assertIn("Branch 'feature-x' does not exist", output)

if __name__ == '__main__':
    unittest.main()
