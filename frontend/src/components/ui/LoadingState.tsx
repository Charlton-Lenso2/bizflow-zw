type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex min-h-55 items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4 text-sm font-medium text-[var(--app-foreground-muted)] shadow-sm dark:bg-[var(--app-card)]">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
        {message}
      </div>
    </div>
  )
}
