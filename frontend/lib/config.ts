const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL

if (!apiBaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_API_URL environment variable")
}

export const API_BASE_URL = apiBaseUrl
