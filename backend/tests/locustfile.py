from locust import HttpUser, task, between

class VidgitUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def view_feed(self):
        self.client.get("/api/v1/projects/feed")

    @task(1)
    def view_project_graph(self):
        # Assuming project ID 1 exists
        self.client.get("/api/v1/projects/1/graph")
