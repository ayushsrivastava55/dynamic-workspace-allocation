import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict, Any, List, Optional
import math

# Choose a pre-trained model suitable for classification.
# distilbert-base-uncased-finetuned-sst-2-english is a common starting point,
# but ideally, you might fine-tune one on workspace-specific data later.
MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"

class WorkspaceAllocator:
    def __init__(self):
        print(f"Initializing Workspace Allocator with model: {MODEL_NAME}")
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            self.model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
            self.model.to(self.device)
            self.model.eval() # Set model to evaluation mode
            print("Model and tokenizer loaded successfully.")
        except Exception as e:
            print(f"Error loading model or tokenizer: {e}")
            # Fallback or raise error
            self.tokenizer = None
            self.model = None
            raise RuntimeError(f"Failed to load ML model: {e}")

    def _prepare_input_text(
        self, 
        user_data: Dict[str, Any],
        workspace_data: Dict[str, Any],
        context_data: Dict[str, Any]
    ) -> str:
        """Formats user, workspace, and context data into a single string for the model."""
        # Basic formatting - This can be significantly enhanced based on feature importance
        # Consider adding more descriptive text for the model to understand context
        text = (
            f"User level: {user_data.get('level', 'N/A')}. "
            f"User department: {user_data.get('department', 'N/A')}. "
            f"Workspace type: {workspace_data.get('type', 'N/A')}. "
            f"Capacity: {workspace_data.get('capacity', 0)}. "
            f"Floor: {workspace_data.get('floor', 'N/A')}. "
            f"Available facilities: {', '.join(workspace_data.get('facilities', []))}. "
            f"Team size needed: {context_data.get('team_size', 1)}. "
            f"Privacy need: {context_data.get('privacy_need', 'low')}. "
            f"Collaboration need: {context_data.get('collaboration_need', 'low')}. "
            f"Required facilities: {', '.join(context_data.get('required_facilities', []))}. "
            f"Time: {context_data.get('time_of_day', 'N/A')}. "
            f"Duration: {context_data.get('duration_hours', 0)} hours. "
            f"Day type: {context_data.get('day_type', 'weekday')}."
        )
        return text

    def _generate_reasoning(self,
        is_suitable: bool,
        user_data: Dict[str, Any],
        workspace_data: Dict[str, Any],
        context_data: Dict[str, Any]
    ) -> List[str]:
        """Generates human-readable reasons based on input factors (rule-based)."""
        reasons = []
        
        # Capacity Check (Always relevant)
        required_capacity = context_data.get('team_size', 1)
        actual_capacity = workspace_data.get('capacity', 0)
        if actual_capacity < required_capacity:
            reasons.append(f"Insufficient capacity ({actual_capacity}) for team size ({required_capacity}).")
            # If capacity is insufficient, it's likely unsuitable regardless of model
            if is_suitable: 
                reasons.append("Note: Model suggested suitable despite capacity mismatch.") 
        elif is_suitable:
             reasons.append(f"Capacity ({actual_capacity}) sufficient for team size ({required_capacity}).")

        # Facility Check
        missing_facilities = []
        available_facilities = set(workspace_data.get('facilities', []))
        for facility in context_data.get('required_facilities', []):
            if facility not in available_facilities:
                missing_facilities.append(facility)
        if missing_facilities:
            reasons.append(f"Missing required facilities: {', '.join(missing_facilities)}.")
            if is_suitable:
                 reasons.append("Note: Model suggested suitable despite missing facilities.")
        elif is_suitable and context_data.get('required_facilities', []):
             reasons.append("All required facilities are available.")

        # Add more rule-based reasoning based on other factors (privacy, type, floor preference etc.)
        # These rules can supplement the model's prediction
        if is_suitable:
            if context_data.get('preferred_floor') and workspace_data.get('floor') == context_data.get('preferred_floor'):
                 reasons.append(f"Matches preferred floor ({context_data.get('preferred_floor')}).")
            if context_data.get('preferred_type') and workspace_data.get('type') == context_data.get('preferred_type'):
                 reasons.append(f"Matches preferred type ({context_data.get('preferred_type')}).")
            reasons.append("Overall assessment: Likely a good fit based on requirements.")
        else:
             reasons.append("Overall assessment: May not be the best fit based on requirements.")
             
        return reasons

    def _calculate_score(self,
        model_confidence: float,
        is_suitable_pred: bool,
        user_data: Dict[str, Any],
        workspace_data: Dict[str, Any],
        context_data: Dict[str, Any]
    ) -> float:
        """Calculates a hybrid suitability score (0-100)."""
        # Start with model confidence (scaled) with a boost to increase overall scores
        base_score = (model_confidence * 100 + 20) if is_suitable_pred else ((1 - model_confidence) * 100 + 10)
        
        # Adjust based on critical hard constraints (capacity, facilities) - more lenient
        adjustment = 0
        required_capacity = context_data.get('team_size', 1)
        actual_capacity = workspace_data.get('capacity', 0)
        if actual_capacity < required_capacity:
            adjustment -= 20 # Reduced penalty for insufficient capacity
            
        missing_facilities = []
        available_facilities = set(workspace_data.get('facilities', []))
        for facility in context_data.get('required_facilities', []):
            if facility not in available_facilities:
                missing_facilities.append(facility)
        if missing_facilities:
             adjustment -= 5 * len(missing_facilities) # Reduced penalty per missing facility

        # Minor adjustments for preferences
        if context_data.get('preferred_floor') and workspace_data.get('floor') == context_data.get('preferred_floor'):
             adjustment += 10  # Increased bonus
        if context_data.get('preferred_type') and workspace_data.get('type') == context_data.get('preferred_type'):
             adjustment += 10  # Increased bonus

        # Apply adjustments and clamp score between 0 and 100
        final_score = base_score + adjustment if is_suitable_pred else base_score - adjustment # Apply penalties positively if already deemed unsuitable
        final_score = max(10, min(100, final_score))  # Minimum score of 10 instead of 0
        
        return round(final_score, 2)

    async def get_workspace_suitability(
        self,
        user_data: Dict[str, Any],
        workspace_data: Dict[str, Any],
        context_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predicts workspace suitability using the loaded model and rules."""
        if not self.model or not self.tokenizer:
            # Fallback if model loading failed
            print("ML model not available, using basic rule-based fallback.")
            is_suitable = workspace_data.get('capacity', 0) >= context_data.get('team_size', 1)
            confidence = 0.5 # Unknown confidence
            reasons = self._generate_reasoning(is_suitable, user_data, workspace_data, context_data)
            score = self._calculate_score(confidence, is_suitable, user_data, workspace_data, context_data)
            return {
                "workspace_id": workspace_data.get("id"),
                "is_suitable": is_suitable, 
                "confidence": confidence, 
                "reasoning": reasons,
                "score": score
            }

        input_text = self._prepare_input_text(user_data, workspace_data, context_data)
        
        # Tokenize and predict
        inputs = self.tokenizer(input_text, return_tensors="pt", truncation=True, padding=True, max_length=512)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1)
            
        # Assuming class 1 is 'suitable' and class 0 is 'not suitable'
        confidence, predicted_class = torch.max(probabilities, dim=-1)
        is_suitable_pred = predicted_class.item() == 1
        model_confidence = confidence.item()
        
        # Generate reasoning and final score
        reasons = self._generate_reasoning(is_suitable_pred, user_data, workspace_data, context_data)
        final_score = self._calculate_score(model_confidence, is_suitable_pred, user_data, workspace_data, context_data)
        
        return {
            "workspace_id": workspace_data.get("id"),
            "is_suitable": is_suitable_pred,
            "confidence": round(model_confidence, 4),
            "reasoning": reasons,
            "score": final_score
        }

# Singleton instance (optional, depends on how you manage dependencies)
# workspace_allocator_instance = WorkspaceAllocator() 