# DICOM System Setup Guide

This guide explains how to set up and use the DICOM (Digital Imaging and Communications in Medicine) system in your radiology tagging application.

## Overview

The system uses:
- **Orthanc**: DICOM server for storing and serving DICOM files
- **Cornerstone.js**: Frontend library for viewing and annotating DICOM images
- **FastAPI Backend**: Handles secure communication between frontend and Orthanc
- **PostgreSQL**: Stores metadata and project information

## Architecture

```
Frontend (Cornerstone.js) ←→ Backend (FastAPI) ←→ Orthanc (DICOM Server)
                                    ↓
                            PostgreSQL (Metadata)
```

## Setup Instructions

### 1. Start the Services

```bash
# Start all services using Docker Compose
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Orthanc DICOM server (HTTP: 8042, DICOM: 4242)
- FastAPI backend (port 8000)
- Next.js frontend (port 3000)

### 2. Access the Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Orthanc Web Interface**: http://localhost:8042
- **API Documentation**: http://localhost:8000/docs

### 3. Orthanc Configuration

The Orthanc server is configured with:
- **Username**: `orthancadmin`
- **Password**: `change_this_password`
- **Authentication**: Enabled
- **DICOM Web**: Enabled for WADO support

**Important**: Change the default password in production!

## Usage Guide

### 1. Upload DICOM Images

1. Log into the application
2. Create or select a project
3. Go to the "Images" tab
4. Click "Upload Image"
5. Select a DICOM file (.dcm or .dicom)
6. Optionally assign the image to a team member
7. Click "Upload Image"

The system will:
- Upload the DICOM file to Orthanc
- Extract metadata from the DICOM file
- Store the Orthanc ID and metadata in the database
- Associate the image with the project

### 2. View and Annotate DICOM Images

1. In the project dashboard, go to the "Images" tab
2. Click on any image card (with the eye icon)
3. The DICOM viewer will open in a modal

#### Available Tools

- **Window/Level (🔍)**: Adjust brightness and contrast
- **Pan (✋)**: Move the image around
- **Zoom (🔎)**: Zoom in/out
- **Length (📏)**: Measure distances
- **Arrow (➡️)**: Add arrow annotations
- **Bidirectional (↔️)**: Measure in two directions
- **Ellipse (⭕)**: Draw elliptical regions of interest
- **Rectangle (⬜)**: Draw rectangular regions of interest

#### Controls

- **Window Center/Width**: Adjust image contrast
- **Reset View**: Return to default view
- **Clear Annotations**: Remove all annotations
- **Download DICOM**: Export the original DICOM file

### 3. Export and Download

- **Download DICOM**: Click the "Download DICOM" button to get the original DICOM file
- **Export Annotations**: (Coming soon) Export annotations in various formats

## Security Features

### Backend Security
- All DICOM operations go through the backend
- Orthanc credentials are never exposed to the frontend
- JWT authentication required for all operations
- Project-based access control

### Orthanc Security
- Authentication enabled
- Only accessible through backend API
- Secure credential management

## API Endpoints

### Image Management
- `POST /images/upload` - Upload DICOM file
- `GET /images/` - List images (with project filtering)
- `GET /images/{id}` - Get image details
- `GET /images/download/{id}` - Download DICOM file
- `GET /images/wado/{id}` - Serve DICOM for Cornerstone.js
- `PATCH /images/{id}/assign` - Assign image to user

### Project Management
- `POST /projects/` - Create project
- `GET /projects/` - List user's projects
- `GET /projects/{id}` - Get project details
- `POST /projects/{id}/invite` - Invite user to project

## Troubleshooting

### Common Issues

1. **DICOM files not loading**
   - Check if Orthanc is running: `docker-compose ps`
   - Verify Orthanc credentials in backend environment
   - Check browser console for errors

2. **Authentication errors**
   - Ensure you're logged in
   - Check if JWT token is valid
   - Try logging out and back in

3. **Upload failures**
   - Verify file is a valid DICOM format
   - Check file size limits
   - Ensure you have project access

### Logs

```bash
# View backend logs
docker-compose logs backend

# View Orthanc logs
docker-compose logs orthanc

# View all logs
docker-compose logs -f
```

## Development

### Adding New Tools

To add new annotation tools to Cornerstone.js:

1. Import the tool in `dicom-viewer.tsx`
2. Add it to the tools array
3. Add tool activation logic in `handleToolChange`

### Customizing Orthanc

Edit `orthanc-config.json` to modify Orthanc settings:

```json
{
  "Name": "Orthanc",
  "StorageDirectory": "/var/lib/orthanc/db",
  "AuthenticationEnabled": true,
  "RegisteredUsers": {
    "orthancadmin": "your_secure_password"
  }
}
```

## Production Deployment

### Security Checklist
- [ ] Change default Orthanc password
- [ ] Enable HTTPS
- [ ] Configure proper CORS settings
- [ ] Set up proper backup for Orthanc data
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging

### Performance Optimization
- [ ] Configure Orthanc for your workload
- [ ] Set up database connection pooling
- [ ] Configure proper caching headers
- [ ] Monitor memory usage

## Support

For issues or questions:
1. Check the logs first
2. Verify all services are running
3. Test with a known good DICOM file
4. Check browser console for JavaScript errors 