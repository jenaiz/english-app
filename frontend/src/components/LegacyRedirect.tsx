import { Navigate, generatePath, useLocation, useParams } from 'react-router-dom'

/** Sends an old path to its new one, keeping the params, the query string and the hash. */
export default function LegacyRedirect({ to }: { to: string }) {
  const params = useParams()
  const { search, hash } = useLocation()
  return <Navigate to={generatePath(to, params) + search + hash} replace />
}
