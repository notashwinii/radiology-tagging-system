import os
import requests
from typing import Optional

# Orthanc configuration
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USERNAME = os.getenv("ORTHANC_USERNAME", "orthancadmin")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "change_this_password")

class OrthancClient:
    def __init__(self):
        self.url = ORTHANC_URL
        self.auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
    
    def upload_dicom(self, file) -> str:
        """Upload DICOM file to Orthanc server"""
        url = f"{self.url}/instances"
        
        try:
            print(f"Uploading DICOM file to Orthanc: {url}")
            response = requests.post(url, files={"file": file}, auth=self.auth)
            response.raise_for_status()
            result = response.json()
            orthanc_id = result["ID"]
            print(f"Successfully uploaded to Orthanc with ID: {orthanc_id}")
            return orthanc_id
        except requests.exceptions.RequestException as e:
            print(f"Error uploading to Orthanc: {e}")
            raise Exception(f"Failed to upload to Orthanc server: {str(e)}")
        except (KeyError, ValueError) as e:
            print(f"Invalid response from Orthanc: {e}")
            raise Exception("Invalid response from Orthanc server")
        except Exception as e:
            print(f"Unexpected error uploading to Orthanc: {e}")
            raise
    
    def get_dicom_file(self, orthanc_id: str) -> bytes:
        """Download DICOM file from Orthanc server"""
        url = f"{self.url}/instances/{orthanc_id}/file"
        
        try:
            response = requests.get(url, auth=self.auth)
            response.raise_for_status()
            return response.content
        except requests.exceptions.RequestException as e:
            print(f"Error downloading from Orthanc: {e}")
            raise Exception(f"Failed to download from Orthanc server: {str(e)}")
    
    def get_dicom_metadata(self, orthanc_id: str) -> Optional[dict]:
        """Get DICOM metadata from Orthanc server"""
        url = f"{self.url}/instances/{orthanc_id}/tags?simplify"
        
        try:
            response = requests.get(url, auth=self.auth)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching metadata from Orthanc: {e}")
            return None
        except (KeyError, ValueError) as e:
            print(f"Invalid metadata response from Orthanc: {e}")
            return None

def get_orthanc_client() -> OrthancClient:
    """Get Orthanc client instance"""
    return OrthancClient() 