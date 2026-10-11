import { Route, Routes } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ConsentProvider } from './context/ConsentContext'
import Contact from './pages/Contact'
import Cookies from './pages/Cookies'
import Home from './pages/Home'
import LegalNotice from './pages/LegalNotice'
import Levels from './pages/Levels'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Privacy from './pages/Privacy'
import Register from './pages/Register'
import Review from './pages/Review'
import Study from './pages/Study'
import Terms from './pages/Terms'
import UnitView from './pages/UnitView'

export default function App() {
  return (
    <AuthProvider>
      <ConsentProvider>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/aviso-legal" element={<LegalNotice />} />
              <Route path="/privacidad" element={<Privacy />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/terminos" element={<Terms />} />
              <Route path="/contacto" element={<Contact />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/levels" element={<Levels />} />
                <Route path="/units/:unitId" element={<UnitView />} />
                <Route path="/units/:unitId/study" element={<Study />} />
                <Route path="/review" element={<Review />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <CookieBanner />
        </div>
      </ConsentProvider>
    </AuthProvider>
  )
}
