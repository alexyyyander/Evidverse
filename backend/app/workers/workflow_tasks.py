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
        
        results = []
        for scene in storyboard:
            visual_desc = scene.get("visual_description")
            
            # 2a. Generate Image
            # We reuse the logic from image_tasks. Since that task is also async wrapped in sync, 
            # we can't easily call it as a function if it creates its own loop.
            # We should refactor the core logic out of the Celery task wrappers.
            # For MVP speed, let's call the task synchronously via .apply() if we want to wait, 
            # OR refactor.
            # Refactoring is cleaner. But let's assume we can call the underlying logic if we import it?
            # No, logic is inside the task function.
            
            # Let's rely on Celery canvas (chain/chord) if possible, but dynamic length is tricky.
            # Simple approach: Just call the task delay/apply within loop (blocking).
            # Note: Blocking in a worker is bad for concurrency but fine for MVP workflow task.
            
            # However, calling .delay() returns immediately. calling .apply() executes locally.
            # If we use .apply(), we are running the task code in this worker process.
            # The task code creates a new loop. Nested loops might crash if not careful.
            # Since we are in a loop already created above? No, we closed it after storyboard?
            
            # Let's run storyboard first, close loop.
            pass
        
    finally:
        loop.close()

    # Now loop is closed. We can run other tasks.
    
    final_clips = []
    
    for scene in storyboard:
        visual_desc = scene.get("visual_description")
        
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
