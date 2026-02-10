import click

@click.group()
def cli():
    """Vidgit CLI - Git for AI Video Generation"""
    pass

@cli.command()
def init():
    """Initialize a new Vidgit project"""
    click.echo("Initialized empty Vidgit repository")

if __name__ == "__main__":
    cli()
