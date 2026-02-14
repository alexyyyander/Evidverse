import typer
import sys
import time
import uuid
import requests
from pathlib import Path
from rich.console import Console
from rich.table import Table
from typing import Optional, Dict, Any
from evidverse.api import api_client, APIClient
from evidverse.config import save_token, get_token, clear_token
from evidverse.context import context
from evidverse import __version__

app = typer.Typer(help="Evidverse CLI - Git for AI Video Generation")
console = Console()

def version_callback(value: bool):
    if value:
        console.print(f"Evidverse CLI version: [bold cyan]{__version__}[/bold cyan]")
        raise typer.Exit()

@app.callback()
def main(
    version: Optional[bool] = typer.Option(
        None, "--version", "-v", callback=version_callback, is_eager=True, help="Show version and exit"
    )
):
    pass

@app.command()
def login(username: str = typer.Option(..., prompt=True), password: str = typer.Option(..., prompt=True, hide_input=True)):
    """
    Login to Evidverse.
    """
    try:
        token = api_client.login(username, password)
        save_token(token)
        console.print("[green]Login successful![/green]")
    except requests.exceptions.HTTPError as e:
        console.print(f"[red]Login failed: {e}[/red]")
    except Exception as e:
        console.print(f"[red]An error occurred: {e}[/red]")

@app.command()
def logout():
    """
    Logout from Evidverse.
    """
    clear_token()
    console.print("[green]Logged out.[/green]")

@app.command()
def init(name: str = typer.Option(None, prompt="Project Name"), description: str = typer.Option(None)):
    """
    Initialize a new Evidverse project (create on remote).
    """
    token = get_token()
    if not token:
        console.print("[red]Not logged in. Please run `evidverse login` first.[/red]")
        raise typer.Exit(code=1)

    # Re-initialize client to ensure token is picked up if login just happened
    client = APIClient() 
    
    try:
        project = client.create_project(name, description)
        console.print(f"[green]Project '{project['name']}' created successfully![/green]")
        console.print(f"Project ID: {project['id']}")
        
        context.init(project['id'])
        console.print(f"[blue]Initialized empty Evidverse repository in {Path.cwd() / '.evidverse'}[/blue]")

    except Exception as e:
        console.print(f"[red]Failed to create project: {e}[/red]")

@app.command(name="status")
@app.command(name="st", hidden=True, help="Alias for status")
def status():
    """
    Check current status (user info and projects).
    """
    token = get_token()
    if not token:
        console.print("[yellow]Not logged in.[/yellow]")
        return

    client = APIClient()
    try:
        user = client.get_me()
        console.print(f"Logged in as: [bold]{user['email']}[/bold] (ID: {user['id']})")
        
        # Check if in a repo
        if context.evidverse_path:
            config = context.get_config()
            console.print(f"Current Repository: Project ID {config['project_id']}, Branch: {config.get('current_branch', 'main')}")
        
        projects = client.get_projects()
        if projects:
            table = Table(title="My Projects")
            table.add_column("ID", justify="right", style="cyan", no_wrap=True)
            table.add_column("Name", style="magenta")
            table.add_column("Description", style="green")
            
            for p in projects:
                table.add_row(str(p['id']), p['name'], p.get('description') or "")
            
            console.print(table)
        else:
            console.print("No projects found.")

    except Exception as e:
        console.print(f"[red]Failed to fetch status: {e}[/red]")

@app.command(name="generate")
@app.command(name="gen", hidden=True, help="Alias for generate")
def generate(prompt: str = typer.Argument(..., help="Text prompt for video generation")):
    """
    Generate video from prompt.
    """
    try:
        config = context.get_config()
        project_id = config["project_id"]
    except Exception:
         console.print("[red]Not a Evidverse repository. Run `evidverse init` first.[/red]")
         raise typer.Exit(code=1)
    
    client = APIClient()
    console.print(f"[yellow]Generating video for prompt: '{prompt}'...[/yellow]")
    
    try:
        task_id = client.generate_clip(project_id, prompt)
        console.print(f"Task ID: {task_id}")
        
        with console.status("[bold green]Generating...[/bold green]") as status:
            while True:
                task_status = client.get_task_status(task_id)
                state = task_status.get("status")
                
                if state == "succeeded":
                    result = task_status.get("result", {})
                    # video_tasks.py returns {"status": "succeeded", "video_url": ...}
                    video_url = result.get("video_url")
                    if video_url:
                        # Download
                        filename = f"{uuid.uuid4().hex[:8]}.mp4"
                        assets_dir = Path("assets")
                        assets_dir.mkdir(exist_ok=True)
                        filepath = assets_dir / filename
                        
                        console.print(f"Downloading to {filepath}...")
                        r = requests.get(video_url)
                        with open(filepath, "wb") as f:
                            f.write(r.content)
                        
                        # Update staging
                        context.update_staging({filename: video_url})
                        console.print(f"[green]Generation complete! Saved to {filepath}[/green]")
                        break
                    else:
                        console.print("[red]Generation succeeded but no video URL found.[/red]")
                        break
                        
                elif state == "failed":
                    error = task_status.get("result", {}).get("error") or "Unknown error"
                    console.print(f"[red]Generation failed: {error}[/red]")
                    break
                elif state == "REVOKED":
                     console.print(f"[red]Task revoked.[/red]")
                     break
                
                time.sleep(2)
                
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")

@app.command(name="commit")
@app.command(name="ci", hidden=True, help="Alias for commit")
def commit(message: str = typer.Option(..., "-m", "--message", help="Commit message")):
    """
    Commit staged changes (generated assets).
    """
    try:
        config = context.get_config()
        project_id = config["project_id"]
        branch_name = config.get("current_branch", "main")
    except Exception:
         console.print("[red]Not a Evidverse repository.[/red]")
         raise typer.Exit(code=1)

    client = APIClient()
    staging = context.get_staging()
    
    if not staging:
        console.print("[yellow]Nothing to commit (staging is empty).[/yellow]")
        return

    try:
        # Get parent hash (HEAD)
        head = client.get_head(project_id, branch_name)
        parent_hash_val = None
        if head and "head_commit" in head and head["head_commit"]:
             parent_hash_val = head["head_commit"].get("hash")

        # Create commit
        commit = client.create_commit(project_id, message, staging, branch_name, parent_hash_val)
        
        console.print(f"[green]Committed successfully! Commit ID: {commit['id']}[/green]")
        context.clear_staging()
        
    except Exception as e:
         console.print(f"[red]Commit failed: {e}[/red]")

@app.command(name="branch")
@app.command(name="br", hidden=True, help="Alias for branch")
def branch(name: Optional[str] = typer.Argument(None)):
    """
    List branches or create a new one.
    """
    try:
        config = context.get_config()
        project_id = config["project_id"]
    except Exception:
         console.print("[red]Not a Evidverse repository.[/red]")
         raise typer.Exit(code=1)
         
    client = APIClient()
    
    if name:
        # Create branch
        try:
             # Need current HEAD to branch from
             head = client.get_head(project_id, config.get("current_branch", "main"))
             head_hash = None
             if head and "head_commit" in head and head["head_commit"]:
                 head_hash = head["head_commit"].get("hash")
             
             if not head_hash:
                 console.print("[red]Cannot create branch: Current branch has no commits.[/red]")
                 return

             client.create_branch(project_id, name, head_hash)
             console.print(f"[green]Branch '{name}' created.[/green]")
        except Exception as e:
             console.print(f"[red]Failed to create branch: {e}[/red]")
    else:
        # List branches
        try:
            branches = client.get_branches(project_id)
            current = config.get("current_branch", "main")
            for b in branches:
                prefix = "*" if b["name"] == current else " "
                console.print(f"{prefix} {b['name']}")
        except Exception as e:
            console.print(f"[red]Failed to list branches: {e}[/red]")

@app.command(name="checkout")
@app.command(name="co", hidden=True, help="Alias for checkout")
def checkout(name: str):
    """
    Switch branch.
    """
    try:
        config = context.get_config()
        project_id = config["project_id"]
    except Exception:
         console.print("[red]Not a Evidverse repository.[/red]")
         raise typer.Exit(code=1)
         
    client = APIClient()
    try:
        branches = client.get_branches(project_id)
        # Check if branch exists
        if not any(b['name'] == name for b in branches):
            console.print(f"[red]Branch '{name}' does not exist.[/red]")
            return
            
        context.update_config("current_branch", name)
        console.print(f"[green]Switched to branch '{name}'[/green]")
        
    except Exception as e:
        console.print(f"[red]Failed to checkout: {e}[/red]")

if __name__ == "__main__":
    app()
