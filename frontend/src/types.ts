// Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
export type TaskLanguage = 'python' | 'html' | 'css' | 'javascript' | 'react'

export interface Task {
  id: string
  module: string
  module_order: number
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  description: string
  starter_code: string
  hints: (string | { level: number; text: string })[]
  tests: TestDef[]
  explanation?: string
  status?: 'not_started' | 'attempted' | 'completed'
  attempts?: number
  type?: string
  language?: TaskLanguage
  duration?: string
  one_liner?: string
  concept?: string
  demo?: {
    code: string
    output: string
    try_changes?: { change: string; new_output: string }[]
    line_comments?: Record<string, string>
  }
  mini_task?: {
    goal: string
    starter: string
    hints: string[]
    validation?: any
  }
  task?: {
    goal: string
    starter: string
    hints: string[]
    tests: TestDef[]
  }
  review?: {
    solutions: { code: string; comment: string }[]
    takeaway: string
  }
}

export interface TestDef {
  input: string
  expected: string
}

export interface TestResult {
  passed: boolean
  input: string
  expected: string
  got: string
  error?: string
}

export interface User {
  id: number
  username: string
  email: string
  display_name: string
  avatar_url: string
  auth_provider: string
  role: string
  mentor_id: number
  theme: string
  editor_theme: string
}

export type AppTheme = 'dark' | 'light'

export const MONACO_THEMES = [
  'vs-dark', 'vs', 'hc-black',
  'one-dark-pro', 'dracula', 'monokai', 'nord', 'github-dark',
  'github-light', 'solarized-dark', 'solarized-light', 'tokyo-night',
  'ayu-dark', 'ayu-mirage', 'cobalt2', 'material-theme',
  'oceanic-next', 'summerfruit', 'zenburn', 'clouds-midnight',
]

export const MODULES = [
  { order: 1, name: 'Змінні та типи', icon: '📦' },
  { order: 2, name: 'Оператори', icon: '🔢' },
  { order: 3, name: 'Умови', icon: '🔀' },
  { order: 4, name: 'Цикли', icon: '🔄' },
  { order: 5, name: 'Функції', icon: '⚡' },
  { order: 6, name: 'Списки', icon: '📋' },
  { order: 7, name: 'Словники', icon: '📚' },
  { order: 8, name: 'Файли', icon: '📁' },
  { order: 9, name: 'Винятки', icon: '⚠️' },
  { order: 10, name: 'ООП', icon: '🏗️' },
  { order: 11, name: 'HTML', icon: '🌐' },
  { order: 12, name: 'CSS', icon: '🎨' },
  { order: 13, name: 'JavaScript', icon: '📜' },
  { order: 14, name: 'React', icon: '⚛️' },
  { order: 15, name: 'GUI (tkinter)', icon: '🖥️' },
  { order: 16, name: 'CLI', icon: '💻' },
  { order: 17, name: 'Файли (просунуті)', icon: '📂' },
  { order: 18, name: 'OOP (просунуті)', icon: '🏗️' },
  { order: 19, name: 'БД: Основи', icon: '🗄️' },
  { order: 20, name: 'БД: Запити', icon: '🔍' },
  { order: 21, name: 'БД: Просунуте', icon: '⚡' },
  { order: 22, name: 'API', icon: '🌐' },
  { order: 23, name: 'ORM (SQLAlchemy)', icon: '🔗' },
]

export const LANGUAGE_LABELS: Record<TaskLanguage, string> = {
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  react: 'React',
}

export const LANGUAGE_MONACO_MAP: Record<TaskLanguage, string> = {
  python: 'python',
  html: 'html',
  css: 'css',
  javascript: 'javascript',
  react: 'javascript',
}
