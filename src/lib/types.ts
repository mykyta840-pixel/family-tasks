export type Role = 'parent' | 'child'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  language?: string | null
  push_test_done_at?: string | null // когда тест уведомления прошёл успешно (null = ещё не проходил)
}

export interface Family {
  id: string
  name: string
}
