from setuptools import setup, find_packages

setup(
    name="vidgit",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "click>=8.1.7",
        "requests>=2.31.0",
        "rich>=13.7.0",
    ],
    entry_points={
        "console_scripts": [
            "vidgit=vidgit.main:cli",
        ],
    },
)
