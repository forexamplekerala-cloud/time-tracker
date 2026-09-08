import ReviewClient from './ReviewClient'

export default function ReviewPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)]">
      <header className="py-6">
        <h1 className="text-2xl text-ink font-semibold mb-1">Review your day</h1>
        <p className="text-sm text-ink-muted">nothing is saved until you tap Save</p>
      </header>
      
      <main className="flex-1 flex flex-col pb-6">
        <ReviewClient />
      </main>
    </div>
  )
}
