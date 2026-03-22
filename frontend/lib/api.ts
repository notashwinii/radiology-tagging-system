import { API_BASE_URL } from "@/lib/config"

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

export interface RegistrationResponse {
  email: string
  verification_required: boolean
  verification_email_sent: boolean
  message: string
}

export interface VerificationResendResponse {
  email: string
  verification_email_sent: boolean
  message: string
}

export interface VerificationCompleteResponse {
  email: string
  verified: boolean
  message: string
  verified_at: string
}

export interface User {
  id: number
  email: string
  first_name?: string
  last_name?: string
  is_active: boolean
  is_email_verified?: boolean
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: number
  name: string
  description?: string
  owner_id: number
  created_at: string
  updated_at?: string
  members_count?: number
  projects_count?: number
}

export interface WorkspaceCreate {
  name: string
  description?: string
}

export interface WorkspaceUpdate {
  name?: string
  description?: string
}

export interface WorkspaceMemberInvite {
  email: string
  role: string
}

interface Project {
  id: number
  name: string
  description?: string
  workspace_id: number
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
  workspace_id: number
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
  folder_id?: number
  assigned_user_id: number | null
  upload_time: string | null
  dicom_metadata: any | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
  uploader: User
  assigned_user: User | null
  folder?: Folder
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
  code?: string
  email?: string
  data?: unknown

  constructor(public status: number, message: string, options?: { code?: string; email?: string; data?: unknown }) {
    super(message)
    this.name = "ApiError"
    this.code = options?.code
    this.email = options?.email
    this.data = options?.data
  }
}

function buildApiError(status: number, errorData: any): ApiError {
  const detail = errorData?.detail
  if (typeof detail === "string") {
    return new ApiError(status, detail, { data: errorData })
  }
  if (detail && typeof detail === "object") {
    return new ApiError(status, detail.message || "An error occurred", {
      code: detail.code,
      email: detail.email,
      data: errorData,
    })
  }
  return new ApiError(status, "An error occurred", { data: errorData })
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access-token") : null

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "An error occurred" }))
    throw buildApiError(response.status, errorData)
  }

  return response.json()
}

export const api = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiRequest<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  },

  async register(userData: RegisterRequest): Promise<RegistrationResponse> {
    return apiRequest<RegistrationResponse>("/users/", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>("/users/me/")
  },

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const formData = new FormData()
    formData.append("refresh_token", refreshToken)

    const token = typeof window !== "undefined" ? localStorage.getItem("access-token") : null

    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "An error occurred" }))
      throw buildApiError(response.status, errorData)
    }

    return response.json()
  },

  async resendVerificationEmail(email: string): Promise<VerificationResendResponse> {
    return apiRequest<VerificationResendResponse>("/auth/verify-email/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  async verifyEmail(token: string): Promise<VerificationCompleteResponse> {
    const params = new URLSearchParams({ token })
    return apiRequest<VerificationCompleteResponse>(`/auth/verify-email?${params.toString()}`)
  },

  async createProject(projectData: ProjectCreate): Promise<Project> {
    return apiRequest<Project>("/projects/", {
      method: "POST",
      body: JSON.stringify(projectData),
    })
  },

  async getProject(projectId: number): Promise<Project> {
    return apiRequest<Project>(`/projects/${projectId}`)
  },

  async updateProject(projectId: number, projectData: Partial<ProjectCreate>): Promise<Project> {
    return apiRequest<Project>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(projectData),
    })
  },

  async deleteProject(projectId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/projects/${projectId}`, {
      method: "DELETE",
    })
  },

  async getProjects(workspaceId?: number): Promise<Project[]> {
    let url = "/projects/"
    if (workspaceId) {
      url += `?workspace_id=${workspaceId}`
    }
    return apiRequest<Project[]>(url)
  },

  async getWorkspaces(): Promise<Workspace[]> {
    return apiRequest<Workspace[]>("/workspaces/")
  },

  async getWorkspace(workspaceId: number): Promise<Workspace> {
    return apiRequest<Workspace>(`/workspaces/${workspaceId}`)
  },

  async createWorkspace(workspaceData: WorkspaceCreate): Promise<Workspace> {
    return apiRequest<Workspace>("/workspaces/", {
      method: "POST",
      body: JSON.stringify(workspaceData),
    })
  },

  async updateWorkspace(workspaceId: number, workspaceData: WorkspaceUpdate): Promise<Workspace> {
    return apiRequest<Workspace>(`/workspaces/${workspaceId}`, {
      method: "PUT",
      body: JSON.stringify(workspaceData),
    })
  },

  async deleteWorkspace(workspaceId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/workspaces/${workspaceId}`, {
      method: "DELETE",
    })
  },

  async inviteUserToProject(projectId: number, invite: ProjectInvite): Promise<ProjectMember> {
    return apiRequest<ProjectMember>(`/projects/${projectId}/invite`, {
      method: "POST",
      body: JSON.stringify(invite),
    })
  },

  async removeUserFromProject(projectId: number, userId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    })
  },

  async uploadImage(file: File, projectId: number, folderId?: number, assignedUserId?: number): Promise<Image> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("project_id", projectId.toString())
    if (folderId) {
      formData.append("folder_id", folderId.toString())
    }
    if (assignedUserId) {
      formData.append("assigned_user_id", assignedUserId.toString())
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("access-token") : null

    const response = await fetch(`${API_BASE_URL}/images/upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "An error occurred" }))
      throw buildApiError(response.status, errorData)
    }

    return response.json()
  },

  async bulkUploadImages(files: File[], projectId: number, folderId?: number, assignedUserId?: number): Promise<Image[]> {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append("files", file)
    })
    formData.append("project_id", projectId.toString())
    if (folderId) {
      formData.append("folder_id", folderId.toString())
    }
    if (assignedUserId) {
      formData.append("assigned_user_id", assignedUserId.toString())
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("access-token") : null

    const response = await fetch(`${API_BASE_URL}/images/bulk-upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "An error occurred" }))
      throw buildApiError(response.status, errorData)
    }

    return response.json()
  },

  async getImages(projectId?: number, folderId?: number): Promise<Image[]> {
    let url = "/images/"
    const params = new URLSearchParams()
    if (projectId) params.append("project_id", projectId.toString())
    if (folderId) params.append("folder_id", folderId.toString())
    if (params.toString()) url += "?" + params.toString()
    return apiRequest<Image[]>(url)
  },

  async getImage(imageId: number): Promise<Image> {
    return apiRequest<Image>(`/images/${imageId}`)
  },

  async assignImage(imageId: number, assignedUserId: number): Promise<Image> {
    const formData = new FormData()
    formData.append("assigned_user_id", assignedUserId.toString())

    const token = typeof window !== "undefined" ? localStorage.getItem("access-token") : null

    const response = await fetch(`${API_BASE_URL}/images/${imageId}/assign`, {
      method: "PATCH",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "An error occurred" }))
      throw buildApiError(response.status, errorData)
    }

    return response.json()
  },

  async updateImage(imageId: number, imageData: { assigned_user_id?: number; folder_id?: number }): Promise<Image> {
    return apiRequest<Image>(`/images/${imageId}`, {
      method: "PATCH",
      body: JSON.stringify(imageData),
    })
  },

  async moveImage(imageId: number, folderId?: number): Promise<Image> {
    return apiRequest<Image>(`/images/${imageId}/move`, {
      method: "PATCH",
      body: JSON.stringify({ folder_id: folderId }),
    })
  },

  async deleteImage(imageId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/images/${imageId}`, {
      method: "DELETE",
    })
  },

  async getAllUsers(skip = 0, limit = 100): Promise<User[]> {
    return apiRequest<User[]>(`/users/?skip=${skip}&limit=${limit}`)
  },

  async getUserById(userId: number): Promise<User> {
    return apiRequest<User>(`/users/${userId}`)
  },

  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    return apiRequest<User>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    })
  },

  async deleteUser(userId: number): Promise<{ msg: string }> {
    return apiRequest<{ msg: string }>(`/users/${userId}`, {
      method: "DELETE",
    })
  },

  async createFolder(folderData: FolderCreate): Promise<Folder> {
    return apiRequest<Folder>("/folders/", {
      method: "POST",
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
      method: "PATCH",
      body: JSON.stringify(folderData),
    })
  },

  async deleteFolder(folderId: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/folders/${folderId}`, {
      method: "DELETE",
    })
  },

  async assignFolderImages(folderId: number, assignedUserId: number): Promise<{ message: string; updated_count: number }> {
    return apiRequest<{ message: string; updated_count: number }>(`/folders/${folderId}/assign-images`, {
      method: "PATCH",
      body: JSON.stringify({ assigned_user_id: assignedUserId }),
    })
  },

  async assignUnknownImages(projectId: number, assignedUserId: number): Promise<{ message: string; updated_count: number }> {
    return apiRequest<{ message: string; updated_count: number }>(`/projects/${projectId}/assign-root-images`, {
      method: "PATCH",
      body: JSON.stringify({ assigned_user_id: assignedUserId }),
    })
  },

  async createAnnotation(annotationData: {
    image_id: number
    data: any
    dicom_metadata?: any
    tags?: string[]
  }): Promise<any> {
    return apiRequest<any>("/annotations/", {
      method: "POST",
      body: JSON.stringify(annotationData),
    })
  },

  async updateAnnotation(annotationId: number, annotationData: {
    data?: any
    dicom_metadata?: any
    tags?: string[]
    review_status?: string
  }): Promise<any> {
    return apiRequest<any>(`/annotations/${annotationId}`, {
      method: "PATCH",
      body: JSON.stringify(annotationData),
    })
  },

  async getAnnotationsForImage(imageId: number): Promise<any[]> {
    return apiRequest<any[]>(`/annotations/image/${imageId}`)
  },

  async saveAnnotationState(image_id: number, annotations: any[], dicom_metadata: any, tags?: string[]) {
    const safeAnnotations = Array.isArray(annotations) ? annotations : []
    const payload: any = {
      image_id,
      data: { annotations: safeAnnotations },
      dicom_metadata,
    }
    if (Array.isArray(tags)) {
      payload.tags = tags
    }
    return this.createAnnotation(payload)
  },

  async loadAnnotationState(image_id: number) {
    const annotationList = await this.getAnnotationsForImage(image_id)
    if (annotationList.length > 0) {
      const annotation = annotationList[annotationList.length - 1]
      const { annotations } = annotation.data || {}
      const dicom_metadata = annotation.dicom_metadata || null
      return { annotations: annotations || [], dicom_metadata }
    }
    return { annotations: [], dicom_metadata: null }
  },

  async downloadImageAnnotations(imageId: number, format: "json" | "csv" = "json"): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access-token") : null

    const response = await fetch(`${API_BASE_URL}/annotations/image/${imageId}/download?format=${format}`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "An error occurred" }))
      throw buildApiError(response.status, errorData)
    }

    return response.blob()
  },

  async exportDicomSeg(imageId: number): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access-token") : null

    const response = await fetch(`${API_BASE_URL}/annotations/image/${imageId}/export-dicom-seg`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "An error occurred" }))
      throw buildApiError(response.status, errorData)
    }

    return response.blob()
  },
}
