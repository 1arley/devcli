import {
  Stethoscope,
  Container,
  Network,
  GitBranch,
  Braces,
  Key,
  Hash,
  QrCode,
  FileCode,
  FolderGit2,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Dictionary } from '@/lib/i18n'

interface FeaturesProps {
  dict: Dictionary
}

export function Features({ dict }: FeaturesProps) {
  const features = [
    { icon: Stethoscope, ...dict.features.doctor },
    { icon: Container, ...dict.features.docker },
    { icon: Network, ...dict.features.ports },
    { icon: GitBranch, ...dict.features.git },
    { icon: Braces, ...dict.features.json },
    { icon: Key, ...dict.features.jwt },
    { icon: Hash, ...dict.features.uuid },
    { icon: QrCode, ...dict.features.qr },
    { icon: FileCode, ...dict.features.env },
    { icon: FolderGit2, ...dict.features.repo },
    { icon: Sparkles, ...dict.features.ai },
  ]

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">{dict.features.title}</h2>
        <p className="text-lg text-muted-foreground">{dict.features.description}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} className="transition-colors hover:border-primary">
              <CardHeader>
                <Icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle>{feature.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
