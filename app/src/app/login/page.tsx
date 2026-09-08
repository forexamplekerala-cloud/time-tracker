import { login, resetPassword } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="flex-1 flex flex-col w-full px-4 justify-center gap-2 h-[80vh]">
      <h1 className="text-2xl font-semibold mb-6">Log in to The Mirror</h1>
      
      <form className="flex-1 flex flex-col w-full justify-center gap-2 text-ink">
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-surface border border-border mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
          name="email"
          placeholder="you@example.com"
          required
        />
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-surface border border-border mb-6 focus:outline-none focus:ring-2 focus:ring-blue-600"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        <button
          formAction={login}
          className="bg-ink text-background rounded-md px-4 py-3 text-lg font-medium mb-4"
        >
          Sign In
        </button>
        <button
          formAction={resetPassword}
          className="text-ink-muted text-sm text-center mb-6"
        >
          Forgot password? Send reset link
        </button>

        {searchParams?.message && (
          <p className="mt-4 p-4 bg-surface text-ink text-center border border-border rounded-md">
            {searchParams.message}
          </p>
        )}
      </form>
      
      <div className="text-center mt-auto pb-4">
        <p className="text-sm text-ink-muted">
          Your data is entirely private and isolated. We don't share anything.
        </p>
      </div>
    </div>
  )
}
