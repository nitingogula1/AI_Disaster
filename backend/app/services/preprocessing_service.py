class PreprocessingService:
    def execute_pipeline(self, *args, **kwargs):
        raise NotImplementedError("Independent preprocessing is unavailable. Use validated L2A ingestion and water analysis.")
preprocessing_service = PreprocessingService()
