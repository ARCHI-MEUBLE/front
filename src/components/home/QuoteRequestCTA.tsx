import Link from 'next/link';
import { IconCamera, IconVideo, IconArrowRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function QuoteRequestCTA() {
  return (
    <section className="py-16 px-4 sm:py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto max-w-6xl">
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left side - Text content */}
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconCamera className="w-4 h-4" />
                  </div>
                  Nouveau service
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Un meuble vous plaît ?
                </h2>

                <p className="text-lg text-muted-foreground mb-6">
                  Vous avez vu un meuble dans la rue ou ailleurs qui vous inspire ?
                  Envoyez-nous une <strong>photo ou vidéo</strong> et nous vous ferons
                  un <strong>devis personnalisé</strong> pour le reproduire sur mesure.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconCamera className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Photos acceptées</p>
                      <p className="text-xs text-muted-foreground">Formats: JPG, PNG, HEIC</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconVideo className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Vidéos acceptées</p>
                      <p className="text-xs text-muted-foreground">Formats: MP4, MOV, AVI</p>
                    </div>
                  </div>
                </div>

                <Link href="/demande-devis">
                  <Button size="lg" className="w-full sm:w-auto group">
                    Demander un devis
                    <IconArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              {/* Right side - Visual/Illustration */}
              <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 p-8 sm:p-12 flex items-center justify-center min-h-[300px] lg:min-h-0">
                <div className="relative w-full max-w-sm">
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />

                  {/* Central illustration */}
                  <div className="relative bg-background rounded-2xl shadow-2xl p-6 border-2 border-border">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <IconCamera className="w-10 h-10 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded w-32 mx-auto" />
                        <div className="h-3 bg-muted rounded w-24 mx-auto" />
                      </div>
                      <div className="w-full h-32 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                        <IconVideo className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                      <div className="flex gap-2 w-full">
                        <div className="h-8 bg-primary/20 rounded flex-1" />
                        <div className="h-8 bg-muted rounded flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
