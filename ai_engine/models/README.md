# Local AI Models for Evidverse

This directory contains model configurations and download scripts for local AI models.

## Directory Structure

```
models/
├── config.py           # Model configuration and settings
├── registry.py        # Model registry
├── downloads/         # Download scripts
│   ├── download_llm.sh
│   ├── download_image.sh
│   ├── download_video.sh
│   └── download_all.sh
```

## Models

| Task | Model | VRAM | Implementation |
|------|-------|------|----------------|
| LLM (Scripts) | Qwen3-8B | ~8GB | 用户自部署（vLLM / sglang / Ollama 等） |
| Image-to-Image | FLUX.2-klein-4B | ~8-12GB | ComfyUI |
| Text-to-Image | Z-Image-Turbo | ~8-12GB | ComfyUI |
| Image-to-Video | ltx-2-19b-distilled | ~12-16GB | Diffusers |

## Usage

Run the download scripts to download all models:

```bash
# Download all models
bash ai_engine/models/downloads/download_all.sh

# Or individually
bash ai_engine/models/downloads/download_llm.sh    # Ollama only (optional)
bash ai_engine/models/downloads/download_image.sh
bash ai_engine/models/downloads/download_video.sh
```
