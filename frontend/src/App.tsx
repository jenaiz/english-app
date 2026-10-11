import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Levels from './pages/Levels'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import Review from './pages/Review'
import Study from './pages/Study'
import UnitView from './pages/UnitView'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/levels" element={<Levels />} />
              <Route path="/units/:unitId" element={<UnitView />} />
              <Route path="/units/:unitId/study" element={<Study />} />
              <Route path="/review" element={<Review />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
