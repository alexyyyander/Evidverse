# Local AI Models Integration for Evidverse

This document describes the local AI models integration for Evidverse, enabling offline generation of novel scripts, images, and videos using local models.

---

## Overview

The integration provides a unified adapter system that automatically switches between local and cloud AI providers based on configuration. Local models are optimized for 24GB VRAM GPUs (RTX 4090).

---

## Models

| Task | Model | VRAM | Implementation |
|------|-------|------|----------------|
| **LLM (Scripts)** | Qwen3-8B | ~8GB | 用户自部署（vLLM / sglang / Ollama 等） |
| **Image-to-Image** | FLUX.2-klein-4B | ~8-12GB | ComfyUI |
| **Text-to-Image** | Z-Image-Turbo | ~8-12GB | ComfyUI |
| **Image-to-Video** | ltx-2-19b-distilled | ~12-16GB | Diffusers |

---

## Architecture

```
ai_engine/
├── models/                      # Model configuration & downloads
│   ├── config.py               # Settings (USE_LOCAL_MODELS, etc.)
│   ├── registry.py             # Model registry
│   └── downloads/              # Download scripts
├── local/                       # Local model clients
│   ├── llm_client.py          # Ollama wrapper
│   ├── image_client.py        # ComfyUI API
│   └── video_client.py        # LTX-Video
└── adapters/                   # Unified adapter
    ├── base.py                # Abstract interface
    ├── local_adapter.py        # Local models
    ├── cloud_adapter.py       # Cloud APIs (fallback)
    └── __init__.py           # UnifiedAdapter (auto-switches)
```

---

## Configuration

### Environment Variables

Add to `backend/.env`:

```bash
# Master toggle
USE_LOCAL_MODELS=true          # Set to true to use local models
FALLBACK_TO_CLOUD=true        # Fallback to cloud if local fails

# Local LLM provider
# - ollama: use Ollama HTTP API
# - vllm / sglang / openai_compatible: use OpenAI-compatible HTTP API
LOCAL_LLM_PROVIDER=vllm

# OpenAI-compatible local LLM servers (vLLM / sglang / etc.)
LLM_OPENAI_BASE_URL=http://localhost:8001
LLM_OPENAI_API_KEY=
LLM_OPENAI_MODEL=Qwen/Qwen3-8B

# Ollama (optional)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

# ComfyUI (Image Generation)
COMFYUI_HOST=http://localhost:8188
IMAGE_MODEL=flux2-klein-4b    # or z-image-turbo

# LTX-Video
LTX_MODEL_PATH=./models/LTX-Video
LTX_MODEL_VARIANT=ltx-2-19b-distilled
```

---

## Installation

### 1. Download Models

```bash
# Download all models
bash ai_engine/models/downloads/download_all.sh

# Or individually
bash ai_engine/models/downloads/download_llm.sh    # qwen3:8b
bash ai_engine/models/downloads/download_image.sh  # FLUX.2, Z-Image-Turbo
bash ai_engine/models/downloads/download_video.sh   # LTX-Video
```

### 2. Start Services

**LLM（任选其一，自行部署）：**

**A) vLLM / sglang（OpenAI 兼容服务）：**
```bash
# 启动后需确保提供 OpenAI 兼容接口，例如：
# POST ${LLM_OPENAI_BASE_URL}/v1/chat/completions
```

**B) Ollama（可选）：**
```bash
ollama serve
ollama pull qwen3:8b
```

**ComfyUI (Image Generation):**
```bash
# Install ComfyUI if not present
git clone https://github.com/comfyanonymous/ComfyUI.git ~/ComfyUI

# Copy downloaded models to ComfyUI
cp -r ./models/ComfyUI/* ~/ComfyUI/models/checkpoints/

# Start ComfyUI
cd ~/ComfyUI
python main.py
# Available at http://localhost:8188
```

### 3. Enable Local Models

Edit `backend/.env`:
```bash
USE_LOCAL_MODELS=true
```

### 4. Restart Backend

```bash
cd backend
uvicorn app.main:app --reload
```

---

## Usage

### Using the Unified Adapter

The system automatically selects between local and cloud based on:

1. `USE_LOCAL_MODELS` setting
2. `FALLBACK_TO_CLOUD` setting
3. Health status of local services

```python
from ai_engine.adapters import adapter

# Script generation
storyboard = await adapter.generate_script("A day in the life of a robot")

# Image generation
image_bytes = await adapter.generate_image(
    prompt="A beautiful sunset over mountains",
    width=512,
    height=512
)

# Image-to-image
image_bytes = await adapter.generate_image_to_image(
    prompt="Turn this into a painting",
    input_image=input_bytes,
    strength=0.7
)

# Video generation
video_bytes = await adapter.generate_video(
    prompt="Camera panning left",
    input_image=image_bytes,
    num_frames=81,
    fps=24
)

# Health check
health = await adapter.health_check()
```

### Backend Service

```python
from app.services.generation_service import generation_service

# Generate storyboard
storyboard = await generation_service.generate_script(topic)

# Generate image
image = await generation_service.generate_image(prompt)

# Generate video
video = await generation_service.generate_video(prompt, input_image)
```

---

## Health Check

Check which provider is active:

```bash
curl http://localhost:8000/api/v1/health/ai
```

Returns:
```json
{
  "use_local": true,
  "fallback_to_cloud": true,
  "active_adapter": "local",
  "local": {
    "llm": true,
    "image": true,
    "video": true
  },
  "cloud": {
    "llm": true,
    "image": true,
    "video": true
  }
}
```

---

## Troubleshooting

### Ollama not running
```bash
# Start Ollama
ollama serve

# Check models
ollama list
```

### ComfyUI not responding
```bash
# Check if ComfyUI is running
curl http://localhost:8188/system_stats

# Restart ComfyUI
cd ~/ComfyUI
python main.py
```

### LTX-Video out of memory
- Reduce `num_frames` to 41
- Use `ltx-2-19b-distilled` variant (already optimized)
- Close other GPU applications

---

## Files Created

### Model Management
- `ai_engine/models/config.py` - Settings and configuration
- `ai_engine/models/registry.py` - Model registry
- `ai_engine/models/downloads/download_llm.sh` - LLM download script
- `ai_engine/models/downloads/download_image.sh` - Image models download script
- `ai_engine/models/downloads/download_video.sh` - Video models download script
- `ai_engine/models/downloads/download_all.sh` - Master download script

### Local Clients
- `ai_engine/local/llm_client.py` - Ollama client
- `ai_engine/local/image_client.py` - ComfyUI client
- `ai_engine/local/video_client.py` - LTX-Video client

### Adapters
- `ai_engine/adapters/base.py` - Base adapter interface
- `ai_engine/adapters/local_adapter.py` - Local models implementation
- `ai_engine/adapters/cloud_adapter.py` - Cloud APIs implementation
- `ai_engine/adapters/__init__.py` - Unified adapter

### Backend Integration
- `backend/app/services/generation_service.py` - Unified generation service
- `backend/app/core/config.py` - Added local model settings

---

*Last updated: 2026-02-16*
