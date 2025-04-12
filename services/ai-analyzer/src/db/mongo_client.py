# src/db/mongo_client.py
from pymongo import MongoClient
import logging
from config import settings

logger = logging.getLogger("ai-analyzer.db")

class MongoDB:
    def __init__(self):
        self.client = None
        self.db = None
        
    def connect(self):
        """
        Connect to MongoDB
        """
        try:
            self.client = MongoClient(settings.mongodb_url)
            self.db = self.client.get_database()
            logger.info(f"Connected to MongoDB: {settings.mongodb_url}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise
    
    def get_collection(self, name):
        """
        Get a collection by name
        """
        if not self.db:
            self.connect()
        return self.db[name]

mongodb = MongoDB()