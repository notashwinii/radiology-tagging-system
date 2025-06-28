from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, users, projects, folders, images, annotations, workspace
from database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Radiology Tagging System API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(workspace.router)
app.include_router(projects.router)
app.include_router(folders.router)
app.include_router(images.router)
app.include_router(annotations.router)

@app.get("/")
def read_root():
    return {"message": "Radiology Tagging System API"} 