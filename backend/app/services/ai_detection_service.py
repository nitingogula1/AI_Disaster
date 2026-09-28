class AIDetectionService:
    def get_model_status(self):
        return {"status": "UNAVAILABLE", "code": "MODEL_WEIGHTS_NOT_FOUND",
                "weights_loaded": False, "model_name": None,
                "message": "No trained damage model or tested inference adapter is installed.",
                "recommendations": ["Select a published architecture and exact checkpoint.",
                                    "Implement its documented pre/post image preprocessing and output mapping.",
                                    "Validate inference on held-out labelled data before enabling damage claims."]}
    def has_trained_weights(self):
        return False
    def run_detection(self, *args, **kwargs):
        raise NotImplementedError(self.get_model_status()["message"])
ai_detection_service = AIDetectionService()
