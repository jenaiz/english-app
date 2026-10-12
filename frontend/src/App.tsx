import { Route, Routes } from 'react-router-dom'
import LegacyRedirect from './components/LegacyRedirect'
import CookieBanner from './components/CookieBanner'
import Footer from './components/Footer'
import Navbar, { BottomNavSpacer } from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ConsentProvider } from './context/ConsentContext'
import Club from './pages/Club'
import ClubActivity from './pages/ClubActivity'
import ClubTiming from './pages/ClubTiming'
import Contact from './pages/Contact'
import Cookies from './pages/Cookies'
import ExamAttemptPage from './pages/ExamAttemptPage'
import ExamCertificate from './pages/ExamCertificate'
import ExamIntro from './pages/ExamIntro'
import ExpressionIndexPage from './pages/ExpressionIndexPage'
import ExpressionPage from './pages/ExpressionPage'
import Expressions from './pages/Expressions'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import LegalNotice from './pages/LegalNotice'
import LevelStudyPage from './pages/LevelStudyPage'
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
              <Route path="/expresiones/idioms" element={<ExpressionIndexPage kind="idiom" />} />
              <Route path="/expresiones/phrasal-verbs" element={<ExpressionIndexPage kind="phrasal" />} />
              <Route path="/expresiones/:segment/:id" element={<ExpressionPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/niveles" element={<Levels />} />
                <Route path="/niveles/:levelId/estudiar" element={<LevelStudyPage />} />
                <Route path="/unidades/:unitId" element={<UnitView />} />
                <Route path="/unidades/:unitId/estudiar" element={<Study />} />
                <Route path="/examen/:levelId" element={<ExamIntro />} />
                <Route path="/examen/:levelId/intento/:attemptId" element={<ExamAttemptPage />} />
                <Route path="/examen/:levelId/certificado/:attemptId" element={<ExamCertificate />} />
                <Route path="/club" element={<Club />} />
                {/* Dev-only: time song lines by hand (see backend/cmd/subs). */}
                {import.meta.env.DEV && <Route path="/club/dev/timing" element={<ClubTiming />} />}
                <Route path="/club/:activityId" element={<ClubActivity />} />
                <Route path="/repaso" element={<Review />} />
                <Route path="/ajustes" element={<Settings />} />
              </Route>
              {/* Old English paths, kept working for bookmarks and links already out there. */}
              <Route path="/levels" element={<LegacyRedirect to="/niveles" />} />
              <Route path="/levels/:levelId/study" element={<LegacyRedirect to="/niveles/:levelId/estudiar" />} />
              <Route path="/units/:unitId" element={<LegacyRedirect to="/unidades/:unitId" />} />
              <Route path="/units/:unitId/study" element={<LegacyRedirect to="/unidades/:unitId/estudiar" />} />
              <Route path="/review" element={<LegacyRedirect to="/repaso" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <BottomNavSpacer />
          <CookieBanner />
        </div>
      </ConsentProvider>
    </AuthProvider>
  )
}
