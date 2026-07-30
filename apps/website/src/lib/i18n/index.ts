import { en } from './dictionaries/en'
import { ptBR } from './dictionaries/pt-BR'
import { es } from './dictionaries/es'
import { defaultLocale, type Locale } from './config'

const dictionaries = {
  en,
  'pt-BR': ptBR,
  es,
} as const

export interface Dictionary {
  nav: {
    docs: string
    commands: string
    plugins: string
    roadmap: string
    blog: string
    github: string
  }
  footer: {
    product: string
    community: string
    legal: string
    documentation: string
    changelog: string
    showcase: string
    contributing: string
    license: string
    copyright: string
  }
  hero: {
    badge: string
    title: string
    subtitle: string
    description: string
    getStarted: string
    install: string
    plugins: string
    mitLicense: string
    openSource: string
  }
  features: {
    title: string
    description: string
    doctor: { name: string; description: string }
    docker: { name: string; description: string }
    ports: { name: string; description: string }
    git: { name: string; description: string }
    json: { name: string; description: string }
    jwt: { name: string; description: string }
    uuid: { name: string; description: string }
    qr: { name: string; description: string }
    env: { name: string; description: string }
    repo: { name: string; description: string }
    ai: { name: string; description: string }
  }
  comparisons: {
    title: string
    description: string
    docker: { before: string; after: string }
    ports: { before: string; after: string }
    doctor: { before: string; after: string }
  }
  cta: {
    title: string
    description: string
    getStarted: string
    plugins: string
    tests: string
    license: string
  }
  docs: {
    title: string
    description: string
    gettingStarted: { title: string; description: string }
    commands: { title: string; description: string }
    plugins: { title: string; description: string }
    configuration: { title: string; description: string }
    architecture: { title: string; description: string }
    contributing: { title: string; description: string }
  }
  commands: {
    title: string
    description: string
    examples: string
  }
  plugins: {
    title: string
    description: string
    official: string
    experimental: string
    planned: string
    noExperimental: string
    comingSoon: string
  }
  roadmap: {
    title: string
    description: string
    completed: string
    inProgress: string
    planned: string
    future: string
  }
  changelog: {
    title: string
    description: string
    added: string
    fixed: string
    changed: string
    removed: string
  }
  showcase: {
    title: string
    description: string
    projects: string
    companies: string
    contributors: string
    noProjects: string
    noCompanies: string
    joinCommunity: string
    joinDescription: string
  }
  contributing: {
    title: string
    description: string
  }
  blog: {
    title: string
    description: string
    introducing: string
    introducingDescription: string
  }
  terminal: {
    welcome: string
    hint: string
    placeholder: string
    commandNotFound: string
    typeHelp: string
  }
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}
