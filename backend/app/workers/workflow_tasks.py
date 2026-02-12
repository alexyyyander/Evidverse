import asyncio
from app.core.celery_app import celery_app
from app.services.story_service import story_service
from app.workers.image_tasks import generate_character_image
from app.workers.video_tasks import generate_video_from_image

# We need a workflow orchestrator.
# Celery chains/groups are powerful but can be complex for dynamic workflows.
# For MVP, we can write a task that calls other tasks or services.
# Calling tasks from tasks is generally discouraged (if waiting for results), 
# but for a "Workflow Task" it is sometimes acceptable if careful.
# Better approach: This task coordinates the steps and returns the final result.

@celery_app.task
def generate_clip_workflow(topic: str, user_id: int) -> dict:
    """
    Orchestrate the video generation workflow:
    1. Generate Script (LLM)
    2. For each scene:
       a. Generate Image (SD)
       b. Generate Video (Seedance) from Image
    3. Return list of video clips
    """
    
    # 1. Generate Script
    # Since this is sync task, we need to run async service code
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        storyboard = loop.run_until_complete(story_service.generate_storyboard(topic))
    except Exception as e:
        return {"status": "failed", "error": str(e)}
    finally:
        loop.close()

    # Now loop is closed. We can run other tasks.
    
    final_clips = []
    
    for scene in storyboard:
        visual_desc = scene.get("visual_description")
        if not isinstance(visual_desc, str) or not visual_desc.strip():
            final_clips.append({"scene": scene, "error": "Invalid storyboard scene: visual_description"})
            continue
        
        # 2a. Generate Image
        # Using .apply() to run synchronously in this worker
        # This will create a NEW loop inside `generate_character_image`
        img_task_res = generate_character_image.apply(args=[visual_desc, user_id]).result
        
        if img_task_res.get("status") != "succeeded":
            final_clips.append({"scene": scene, "error": "Image generation failed"})
            continue
            
        image_url = img_task_res.get("image_url")
        
        # 2b. Generate Video
        # Using .apply()
        vid_task_res = generate_video_from_image.apply(args=[image_url, visual_desc]).result
        
        if vid_task_res.get("status") != "succeeded":
             final_clips.append({"scene": scene, "error": "Video generation failed", "image_url": image_url})
             continue
             
        video_url = vid_task_res.get("video_url")
        final_clips.append({
            "scene_number": scene.get("scene_number"),
            "narration": scene.get("narration"),
            "image_url": image_url,
            "video_url": video_url
        })

    return {"status": "succeeded", "clips": final_clips}


@celery_app.task
def generate_segment_workflow(narration: str, visual_description: str, user_id: int, image_url: str | None = None) -> dict:
    """
    Generate one segment clip:
    - Use provided image_url if present; otherwise generate an image from visual_description.
    - Generate a short video from the image.
    """
    visual_desc = visual_description
    if not isinstance(visual_desc, str) or not visual_desc.strip():
        return {"status": "failed", "error": "visual_description is required"}

    final_image_url = image_url
    if not isinstance(final_image_url, str) or not final_image_url.strip():
        img_task_res = generate_character_image.apply(args=[visual_desc, user_id]).result
        if img_task_res.get("status") != "succeeded":
            return {"status": "failed", "error": img_task_res.get("error") or "Image generation failed"}
        final_image_url = img_task_res.get("image_url")

    try:
        vid_task_res = generate_video_from_image.apply(args=[final_image_url, visual_desc]).result
    except Exception as e:
        return {"status": "failed", "error": str(e), "image_url": final_image_url}

    if vid_task_res.get("status") != "succeeded":
        return {"status": "failed", "error": vid_task_res.get("error") or "Video generation failed", "image_url": final_image_url}

    return {
        "status": "succeeded",
        "narration": narration,
        "image_url": final_image_url,
        "video_url": vid_task_res.get("video_url"),
    }
