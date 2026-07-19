import { cn } from '@/lib/utils'

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Battleship AI</h1>
        <p className="text-muted-foreground">
          Browser-based Battleship against an AI opponent.
        </p>
      </div>
      <div
        className={cn(
          'rounded-lg border bg-card px-6 py-4 text-card-foreground shadow-sm',
        )}
      >
        <p className="text-sm text-muted-foreground">
          Project scaffold ready. Game engine, AI, UI, and state come next.
        </p>
      </div>
    </main>
  )
}

export default App
