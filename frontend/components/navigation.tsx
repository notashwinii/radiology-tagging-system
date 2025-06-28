"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Upload, UserPlus, LogOut, Stethoscope, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavigationProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { user, logout } = useAuth()

  // Construct full name from first_name and last_name
  const getFullName = () => {
    if (!user) return "User"
    const firstName = user.first_name || ""
    const lastName = user.last_name || ""
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || user.email
  }

  // Map backend role to display name
  const getRoleDisplayName = () => {
    if (!user) return ""
    switch (user.role) {
      case "admin":
        return "Administrator"
      case "reviewer":
        return "Reviewer"
      case "user":
        return "User"
      default:
        return user.role
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold text-gray-900">Radiology Tagging System</span>
          </div>

          <div className="flex space-x-1">
            <Button
              variant={currentPage === "dashboard" ? "default" : "ghost"}
              onClick={() => onNavigate("dashboard")}
              className="flex items-center space-x-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>

            <Button
              variant={currentPage === "upload" ? "default" : "ghost"}
              onClick={() => onNavigate("upload")}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Button>

            {user?.role === "admin" && (
              <Button
                variant={currentPage === "add-user" ? "default" : "ghost"}
                onClick={() => onNavigate("add-user")}
                className="flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add User</span>
              </Button>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{getFullName()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <div className="flex flex-col">
                <span className="font-medium">{getFullName()}</span>
                <span className="text-sm text-gray-500">{user?.email}</span>
                <span className="text-xs text-blue-600 capitalize">{getRoleDisplayName()}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
