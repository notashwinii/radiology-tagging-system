const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  email: string
  password: string
  first_name?: string
  last_name?: string
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

interface User {
  id: number
  email: string
  first_name?: string
  last_name?: string
  is_active: boolean
  role: "user" | "admin" | "reviewer"
  created_at: string
  updated_at: string
}

interface Project {
  id: number
  name: string
  description?: string
  owner_id: number
  owner: User
  members: ProjectMember[]
  created_at: string
  updated_at: string
}

interface ProjectMember {
  user_id: number
  email: string
  first_name?: string
  last_name?: string
  role: string
  joined_at: string
}

interface ProjectCreate {
  name: string
  description?: string
}

interface ProjectInvite {
  email: string
  role: string
}

export interface Image {
  id: number
  orthanc_id: string
  uploader_id: number
  project_id: number
  assigned_user_id: number | null
  upload_time: string | null
  dicom_metadata: any | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
  uploader: User
  assigned_user: User | null
}

export interface Folder {
  id: number
  name: string
  description?: string
  project_id: number
  parent_folder_id?: number
  created_at: string
  updated_at: string
  image_count?: number
  subfolder_count?: number
}

interface FolderCreate {
  name: string
  description?: string
  project_id: number
  parent_folder_id?: number
}

interface FolderUpdate {
  name?: string
  description?: string
  parent_folder_id?: number
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access-token')
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  console.log(`Making API request to: ${API_BASE_URL}${endpoint}`)
  console.log('Request config:', config)

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  console.log('Response status:', response.status)
  console.log('Response headers:', response.headers)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }))
    console.error('API Error:', errorData)
    throw new ApiError(response.status, errorData.detail || 'An error occurred')
  }

  return response.json()
}

export const api = {
  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  async register(userData: RegisterRequest): Promise<User> {
    return apiRequest<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/users/me/')
  },

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const formData = new FormData()
    formData.append('refresh_token', refreshToken)
    
    const token = localStorage.getItem('access-token')
    
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }))
      throw new ApiError(response.status, errorData.detail || 'An error occurred')
    }

    return response.json()
  },

  // Project management
  async createProject(projectData: ProjectCreate): Promise<Project> {
    return apiRequest<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    })
  },

  async getProjects(): Promise<Project[]> {
    return apiRequest<Project[]>('/projects/')
  },

  async getProject(projectId: number): Promise<Project> {
    return apiRequest<Project>(`/projects/${projectId}`)
  },

  async updateProject(projectId: number, projectData: Partial<ProjectCreate>): Promise<Project> {
    return apiRequest<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(projectData),
    })
  },

  async deleteProject(projectId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/projects/${projectId}`, {
      method: 'DELETE',
    })
  },

  async inviteUserToProject(projectId: number, invite: ProjectInvite): Promise<ProjectMember> {
    return apiRequest<ProjectMember>(`/projects/${projectId}/invite`, {
      method: 'POST',
      body: JSON.stringify(invite),
    })
  },

  async removeUserFromProject(projectId: number, userId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    })
  },

  // Image management
  async uploadImage(file: File, projectId: number, folderId?: number, assignedUserId?: number): Promise<Image> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('project_id', projectId.toString())
    if (folderId) {
      formData.append('folder_id', folderId.toString())
    }
    if (assignedUserId) {
      formData.append('assigned_user_id', assignedUserId.toString())
    }
    
    const token = localStorage.getItem('access-token')
    
    const response = await fetch(`${API_BASE_URL}/images/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }))
      throw new ApiError(response.status, errorData.detail || 'An error occurred')
    }

    return response.json()
  },

  async bulkUploadImages(files: File[], projectId: number, folderId?: number, assignedUserId?: number): Promise<Image[]> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    formData.append('project_id', projectId.toString())
    if (folderId) {
      formData.append('folder_id', folderId.toString())
    }
    if (assignedUserId) {
      formData.append('assigned_user_id', assignedUserId.toString())
    }
    
    const token = localStorage.getItem('access-token')
    
    const response = await fetch(`${API_BASE_URL}/images/bulk-upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }))
      throw new ApiError(response.status, errorData.detail || 'An error occurred')
    }

    return response.json()
  },

  async getImages(projectId?: number, folderId?: number): Promise<Image[]> {
    let url = '/images/'
    const params = new URLSearchParams()
    if (projectId) params.append('project_id', projectId.toString())
    if (folderId) params.append('folder_id', folderId.toString())
    if (params.toString()) url += '?' + params.toString()
    return apiRequest<Image[]>(url)
  },

  async getImage(imageId: number): Promise<Image> {
    return apiRequest<Image>(`/images/${imageId}`)
  },

  async assignImage(imageId: number, assignedUserId: number): Promise<Image> {
    const formData = new FormData()
    formData.append('assigned_user_id', assignedUserId.toString())
    
    const token = localStorage.getItem('access-token')
    
    const response = await fetch(`${API_BASE_URL}/images/${imageId}/assign`, {
      method: 'PATCH',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }))
      throw new ApiError(response.status, errorData.detail || 'An error occurred')
    }

    return response.json()
  },

  // User management
  async getAllUsers(skip = 0, limit = 100): Promise<User[]> {
    return apiRequest<User[]>(`/users/?skip=${skip}&limit=${limit}`)
  },

  async getUserById(userId: number): Promise<User> {
    return apiRequest<User>(`/users/${userId}`)
  },

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    return apiRequest<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    })
  },

  async deleteUser(userId: number): Promise<{ msg: string }> {
    return apiRequest<{ msg: string }>(`/users/${userId}`, {
      method: 'DELETE',
    })
  },

  // Folder management
  async createFolder(folderData: FolderCreate): Promise<Folder> {
    return apiRequest<Folder>('/folders/', {
      method: 'POST',
      body: JSON.stringify(folderData),
    })
  },

  async getProjectFolders(projectId: number): Promise<Folder[]> {
    return apiRequest<Folder[]>(`/folders/project/${projectId}`)
  },

  async getFolder(folderId: number): Promise<Folder> {
    return apiRequest<Folder>(`/folders/${folderId}`)
  },

  async updateFolder(folderId: number, folderData: FolderUpdate): Promise<Folder> {
    return apiRequest<Folder>(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(folderData),
    })
  },

  async deleteFolder(folderId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/folders/${folderId}`, {
      method: 'DELETE',
    })
  },

} 