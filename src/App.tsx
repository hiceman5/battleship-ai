import { GamePhase } from '@/engine/types'
import { GameProvider, useGame } from '@/state/GameProvider'
import { PlacementScreen } from '@/ui/placement/PlacementScreen'
import { PlayScreen } from '@/ui/play/PlayScreen'
import { GameOverScreen } from '@/ui/gameover/GameOverScreen'
import { ThemeToggle } from '@/ui/theme/ThemeToggle'

/**
 * Renders the active screen for the current game phase (SPEC §11): `Setup` →
 * placement, `Playing` → play, `GameOver` → game-over. Consumes the single
 * reducer-backed store via {@link useGame} and passes `{ state, dispatch }` to
 * each screen. Presentation only — it never mutates game state directly.
 */
function GameScreens() {
  const { state, dispatch } = useGame()

  switch (state.phase) {
    case GamePhase.Setup:
      return <PlacementScreen state={state} dispatch={dispatch} />
    case GamePhase.Playing:
      return <PlayScreen state={state} dispatch={dispatch} />
    case GamePhase.GameOver:
      return <GameOverScreen state={state} dispatch={dispatch} />
    default:
      return null
  }
}

/** The app shell: a top bar (title + dark-mode toggle) over the active screen. */
export function AppContent() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">
          Battleship AI
        </h1>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-start p-4 sm:p-6">
        <GameScreens />
      </main>
    </div>
  )
}

/** Root component: wraps the app in the single {@link GameProvider} store. */
function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  )
}

export default App
