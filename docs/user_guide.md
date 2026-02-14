# Yivid User Guide

Welcome to Yivid! Yivid is an AI-powered video editor with Git-like version control capabilities.

## Getting Started

1.  **Sign Up/Login**: Create an account to start managing your video projects.
2.  **Dashboard**: You will land on your dashboard where you can see your projects.
3.  **Create Project**: Click "New Project" to start a fresh video editing workspace.

## Features

### 🎬 Video Editing
- **Timeline**: Drag and drop clips, trim, and arrange them.
- **AI Generation**: Use the "Generate" tab to create characters and scenes using AI prompts.
- **Preview**: Real-time preview of your video sequence.

### 🌿 Version Control
Yivid brings Git concepts to video editing:
- **Project Detail Page**: The central hub for your project. View description, author info, stats, and the full commit history graph.
- **Commits**: Save snapshots of your project state. Every edit can be committed with a message.
- **Branches**: Experiment with different editing styles by creating branches (e.g., `director-cut`, `short-version`).
- **Graph View**: Visualize your project history in a commit graph (available in both Detail Page and Editor).
- **Forking**: Fork public projects to remix them in your own workspace.
- **Merge Requests**: (For owners) Review and merge changes from other branches directly from the Detail Page.

### 🌐 Community
- **Discover**: Browse the "Discover" feed to see public projects from other creators.
- **Likes**: Like projects you appreciate.
- **Profile**: Showcase your public portfolio on your user profile.

## CLI Tool
Yivid also provides a Command Line Interface (CLI) for power users.
```bash
pip install yivid-cli
yivid login
yivid clone <project_id>
yivid status
yivid commit -m "My update"
```

## Support
For issues and feature requests, please visit our GitHub repository.
