import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-white mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-300 mb-6">
        Page Not Found
      </h2>
      <p className="text-gray-400 mb-8 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/contact"
          className="rounded-lg border border-gray-600 px-6 py-3 text-gray-300 font-medium hover:border-gray-400 transition-colors"
        >
          Contact Us
        </Link>
      </div>
    </div>
  )
}
