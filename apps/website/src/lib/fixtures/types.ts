export interface DemoFixture {
  id: string
  title: string
  command: string
  description: string
  output: string
}

export interface PluginDemo {
  plugin: string
  category: string
  description: string
  fixtures: DemoFixture[]
}
