export const en = {
  nav: {
    docs: 'Docs',
    commands: 'Commands',
    plugins: 'Plugins',
    roadmap: 'Roadmap',
    blog: 'Blog',
    github: 'GitHub',
  },
  footer: {
    product: 'Product',
    community: 'Community',
    legal: 'Legal',
    documentation: 'Documentation',
    changelog: 'Changelog',
    showcase: 'Showcase',
    contributing: 'Contributing',
    license: 'License',
    copyright: 'DevCLI. MIT License.',
  },
  hero: {
    badge: 'v1.0.4 — Now with 11 plugins',
    title: 'DevCLI',
    subtitle: 'The Raycast of the Terminal for Developers',
    description: 'One CLI. Dozens of developer tools. One consistent experience.',
    getStarted: 'Get Started',
    install: 'npm install -g @1arley/devcli',
    plugins: '11 plugins',
    mitLicense: 'MIT License',
    openSource: 'Open Source',
  },
  features: {
    title: 'Everything you need',
    description: '11 powerful plugins to streamline your development workflow.',
    doctor: {
      name: 'Doctor',
      description: 'Environment diagnostics — check Node, npm, Git, Docker, and more.',
    },
    docker: {
      name: 'Docker',
      description: 'Inspect containers, images, volumes, and networks.',
    },
    ports: {
      name: 'Ports',
      description: 'List and kill ports instantly. Cross-platform support.',
    },
    git: {
      name: 'Git',
      description: 'Branch overview, status, log, and stash management.',
    },
    json: {
      name: 'JSON',
      description: 'Format, minify, validate, and convert JSON/YAML.',
    },
    jwt: {
      name: 'JWT',
      description: 'Decode, encode, and validate JWT tokens.',
    },
    uuid: {
      name: 'UUID',
      description: 'Generate UUIDs, NanoIDs, and ULIDs.',
    },
    qr: {
      name: 'QR',
      description: 'Generate QR codes in the terminal.',
    },
    env: {
      name: 'Env',
      description: 'Compare .env files and find missing variables.',
    },
    repo: {
      name: 'Repo',
      description: 'Analyze project structure, framework, and dependencies.',
    },
    ai: {
      name: 'AI',
      description: 'Explain errors with local heuristics or OpenAI integration.',
    },
  },
  comparisons: {
    title: 'Why DevCLI?',
    description: 'Stop memorizing commands. Start shipping faster.',
    docker: {
      before: 'Managing Docker containers',
      after: 'With DevCLI',
    },
    ports: {
      before: 'Finding and killing ports',
      after: 'With DevCLI',
    },
    doctor: {
      before: 'Checking project health',
      after: 'With DevCLI',
    },
  },
  cta: {
    title: 'Ready to streamline your workflow?',
    description: 'Install DevCLI and get 11 developer tools in seconds.',
    getStarted: 'Get Started',
    plugins: 'Plugins',
    tests: 'Tests',
    license: 'License',
  },
  docs: {
    title: 'Documentation',
    description: 'Everything you need to know about DevCLI.',
    gettingStarted: {
      title: 'Getting Started',
      description: 'Installation, setup, and first steps with DevCLI.',
    },
    commands: {
      title: 'Commands',
      description: 'Complete reference for all 11 commands and their flags.',
    },
    plugins: {
      title: 'Plugins',
      description: 'Official, experimental, and planned plugins.',
    },
    configuration: {
      title: 'Configuration',
      description: 'Customize DevCLI with .devclirc.json.',
    },
    architecture: {
      title: 'Architecture',
      description: 'Plugin system and internal architecture.',
    },
    contributing: {
      title: 'Contributing',
      description: 'How to contribute to DevCLI.',
    },
  },
  commands: {
    title: 'Commands',
    description: 'All 11 commands available in DevCLI.',
    examples: 'Examples',
  },
  plugins: {
    title: 'Plugins',
    description: 'Official, experimental, and planned plugins for DevCLI.',
    official: 'Official Plugins',
    experimental: 'Experimental Plugins',
    planned: 'Planned Plugins',
    noExperimental: 'No experimental plugins yet.',
    comingSoon: 'Coming soon',
  },
  roadmap: {
    title: 'Roadmap',
    description: "What's done, what's next, and what's planned.",
    completed: 'Completed',
    inProgress: 'In Progress',
    planned: 'Planned',
    future: 'Future',
  },
  changelog: {
    title: 'Changelog',
    description: 'All notable changes to DevCLI.',
    added: 'added',
    fixed: 'fixed',
    changed: 'changed',
    removed: 'removed',
  },
  showcase: {
    title: 'Showcase',
    description: 'Projects and companies using DevCLI.',
    projects: 'Projects',
    companies: 'Companies',
    contributors: 'Contributors',
    noProjects: 'No projects showcased yet. Be the first to share your DevCLI workflow!',
    noCompanies: 'No companies listed yet.',
    joinCommunity: 'Join the community',
    joinDescription:
      'DevCLI is open source and welcomes contributions. Check out the contributing guide to get started.',
  },
  contributing: {
    title: 'Contributing',
    description: 'How to contribute to DevCLI.',
  },
  blog: {
    title: 'Blog',
    description: 'Technical articles, tutorials, and updates from the DevCLI team.',
    introducing: 'Introducing DevCLI v1.0',
    introducingDescription:
      'The first stable release of DevCLI — 11 plugins, plugin architecture, and a streamlined developer experience.',
  },
  terminal: {
    welcome: 'Welcome to DevCLI — The Raycast of the Terminal',
    hint: 'Type a command or press Enter for help. Try: dev doctor, dev docker, dev ports',
    placeholder: 'Type a command...',
    commandNotFound: 'Command not found:',
    typeHelp: "Type 'help' to see available commands.",
  },
} as const
