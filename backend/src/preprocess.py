import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.base import BaseEstimator, TransformerMixin

class URLEmbeddingTransformer(BaseEstimator, TransformerMixin):
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model_name = model_name
        self.model = None

    def fit(self, X, y=None):
        return self  

    def transform(self, X):
  
        if self.model is None:
            print(f"📥 Loading Model: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)

        if isinstance(X, np.ndarray):
            X = X.flatten().tolist()

        if isinstance(X, str):
            X = [X]
            
        print("⚙️ Encoding URL...")
        return self.model.encode(X)