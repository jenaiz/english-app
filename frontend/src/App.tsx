import { Route, Routes } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ConsentProvider } from './context/ConsentContext'
import Contact from './pages/Contact'
import Cookies from './pages/Cookies'
import Expressions from './pages/Expressions'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import LegalNotice from './pages/LegalNotice'
import Levels from './pages/Levels'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import PackPage from './pages/PackPage'
import Privacy from './pages/Privacy'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Review from './pages/Review'
import Settings from './pages/Settings'
import Study from './pages/Study'
import Terms from './pages/Terms'
import UnitView from './pages/UnitView'
import VerifyEmail from './pages/VerifyEmail'

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
              <Route path="/verificar-email" element={<VerifyEmail />} />
              <Route path="/olvide-contrasena" element={<ForgotPassword />} />
              <Route path="/restablecer-contrasena" element={<ResetPassword />} />
              <Route path="/aviso-legal" element={<LegalNotice />} />
              <Route path="/privacidad" element={<Privacy />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/terminos" element={<Terms />} />
              <Route path="/contacto" element={<Contact />} />
              <Route path="/expresiones" element={<Expressions />} />
              <Route path="/expresiones/packs/:packId" element={<PackPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/levels" element={<Levels />} />
                <Route path="/units/:unitId" element={<UnitView />} />
                <Route path="/units/:unitId/study" element={<Study />} />
                <Route path="/review" element={<Review />} />
                <Route path="/ajustes" element={<Settings />} />
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
