import torch
from transformers import AutoImageProcessor, AutoModelForObjectDetection
from PIL import Image
import requests # To fetch images from URLs for testing
import io

# Choose a pre-trained object detection model from Hugging Face.
# yolos-tiny is small and fast, suitable for edge or CPU inference.
MODEL_NAME = "hustvl/yolos-tiny"


class WorkspaceMonitor:
    def __init__(self, model_name: str = MODEL_NAME, confidence_threshold: float = 0.3):
        print(f"Initializing Workspace Monitor with model: {model_name}")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        self.threshold = confidence_threshold
        
        try:
            self.image_processor = AutoImageProcessor.from_pretrained(model_name)
            self.model = AutoModelForObjectDetection.from_pretrained(model_name)
            self.model.to(self.device)
            self.model.eval() # Set model to evaluation mode
            print("Object detection model and processor loaded successfully.")
        except Exception as e:
            print(f"Error loading model or processor: {e}")
            self.image_processor = None
            self.model = None
            raise RuntimeError(f"Failed to load ML model: {e}")

    def _preprocess_image(self, image_source) -> Image.Image:
        """Loads and preprocesses an image from a file path, URL, or bytes."""
        if isinstance(image_source, str):
            if image_source.startswith(('http://', 'https://')):
                response = requests.get(image_source)
                response.raise_for_status()
                image = Image.open(io.BytesIO(response.content)).convert("RGB")
            else:
                image = Image.open(image_source).convert("RGB")
        elif isinstance(image_source, bytes):
            image = Image.open(io.BytesIO(image_source)).convert("RGB")
        elif isinstance(image_source, Image.Image):
             image = image_source.convert("RGB")
        else:
            raise ValueError("Invalid image source type. Use file path, URL, bytes, or PIL Image.")
        return image

    async def detect_people(self, image_source) -> dict:
        """Detects people in an image and returns count and details."""
        if not self.model or not self.image_processor:
             raise RuntimeError("WorkspaceMonitor is not properly initialized.")

        try:
            image = self._preprocess_image(image_source)
        except Exception as e:
             return {"error": f"Failed to load or preprocess image: {e}", "person_count": 0, "detections": []}

        inputs = self.image_processor(images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)

        # Convert outputs to COCO API format and filter based on threshold and labels
        target_sizes = torch.tensor([image.size[::-1]]).to(self.device) # (height, width)
        results = self.image_processor.post_process_object_detection(
            outputs, target_sizes=target_sizes, threshold=self.threshold
        )[0]

        person_count = 0
        detections = []
        for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
            # Check if the detected object is a person (label ID 1 in COCO typically)
            # Model labels can be checked via self.model.config.id2label
            if self.model.config.id2label[label.item()] == 'person':
                person_count += 1
                box_coords = [round(i, 2) for i in box.tolist()]
                detections.append({
                    "confidence": round(score.item(), 4),
                    "box": box_coords # [xmin, ymin, xmax, ymax]
                })
                # print(f"Detected {self.model.config.id2label[label.item()]} with confidence "
                #       f"{round(score.item(), 3)} at {box_coords}")

        return {
            "person_count": person_count,
            "detections": detections
        }

# Example Usage (for testing):
# if __name__ == "__main__":
#     import asyncio
#     monitor = WorkspaceMonitor()
    
#     async def main():
#         # Test with a URL
#         image_url = 'http://images.cocodataset.org/val2017/000000039769.jpg'
#         results = await monitor.detect_people(image_url)
#         print(f"Detected {results['person_count']} person(s) in image from URL.")
#         print(results['detections'])
        
#         # Add test with a local file path if needed
#         # image_path = 'path/to/your/image.jpg'
#         # results_local = await monitor.detect_people(image_path)
#         # print(f"Detected {results_local['person_count']} person(s) in local image.")

#     asyncio.run(main()) 