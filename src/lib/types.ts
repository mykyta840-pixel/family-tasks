export type Role = 'parent' | 'child'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  language?: string | null
}

export interface Family {
  id: string
  name: string
}
