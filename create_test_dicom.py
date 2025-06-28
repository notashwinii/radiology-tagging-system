#!/usr/bin/env python3
"""
Create a simple test DICOM file for testing the radiology tagging system.
"""

import pydicom
from pydicom.dataset import Dataset, FileDataset
import numpy as np
import os

def create_test_dicom():
    """Create a simple test DICOM file"""
    
    # Create some test data
    image = np.random.randint(0, 255, (256, 256), dtype=np.uint8)
    
    # File meta info data elements
    file_meta = Dataset()
    file_meta.FileMetaInformationGroupLength = 0
    file_meta.FileMetaInformationVersion = b'\x00\x01'
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    file_meta.MediaStorageSOPInstanceUID = '1.2.3.4.5.6.7.8.9.10'
    file_meta.TransferSyntaxUID = '1.2.840.10008.1.2'  # Implicit VR Little Endian
    
    # Main data elements
    ds = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
    
    ds.PatientName = "Test^Patient"
    ds.PatientID = "123456"
    ds.PatientBirthDate = "19800101"
    
    ds.StudyInstanceUID = "1.2.3.4.5.6.7.8.9.11"
    ds.StudyDate = "20240101"
    ds.StudyDescription = "Test Study"
    
    ds.SeriesInstanceUID = "1.2.3.4.5.6.7.8.9.12"
    ds.SeriesDate = "20240101"
    ds.SeriesDescription = "Test Series"
    ds.Modality = "CT"
    
    ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.2"  # CT Image Storage
    ds.SOPInstanceUID = "1.2.3.4.5.6.7.8.9.10"
    
    ds.Rows = 256
    ds.Columns = 256
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    
    ds.PixelData = image.tobytes()
    
    # Save the file
    ds.save_as("test_sample.dcm", write_like_original=False)
    print("Created test DICOM file: test_sample.dcm")
    print(f"File size: {os.path.getsize('test_sample.dcm')} bytes")

if __name__ == "__main__":
    create_test_dicom() 