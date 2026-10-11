import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-indigo-600">404</p>
      <p className="mt-4 text-slate-600">Esta página no existe.</p>
      <Link to="/" className="mt-6 inline-block font-medium text-indigo-600 hover:underline">
        Volver al inicio
      </Link>
    </div>
  )
}
