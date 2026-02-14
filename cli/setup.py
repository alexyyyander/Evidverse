from setuptools import setup, find_packages

setup(
    name="evidverse",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "typer[all]>=0.9.0",
        "requests>=2.31.0",
        "rich>=13.7.0",
        "python-dotenv>=1.0.0",
    ],
    entry_points={
        "console_scripts": [
            "evidverse=evidverse.main:app",
            "ev=evidverse.main:app",
        ],
    },
)
