import { Navigate } from 'react-router-dom'
import BeyondGrammar from '../components/home/BeyondGrammar'
import ClubSection from '../components/home/ClubSection'
import ExamSection from '../components/home/ExamSection'
import FinalCta from '../components/home/FinalCta'
import HeroExercise from '../components/home/HeroExercise'
import LevelPath from '../components/home/LevelPath'
import MethodSection from '../components/home/MethodSection'
import ReviewSection from '../components/home/ReviewSection'
import { useAuth } from '../context/AuthContext'

const CTA = { to: '/register', label: 'Empieza gratis' }

export default function Home() {
  const { user } = useAuth()
  // The landing is for visitors: signed-in learners go straight to their course.
  if (user) return <Navigate to="/niveles" replace />

  return (
    <div>
      <HeroExercise cta={CTA} showLogin />
      <MethodSection />
      <BeyondGrammar />
      <ReviewSection />
      <ClubSection />
      <LevelPath />
      <ExamSection />
      <FinalCta cta={CTA} />
    </div>
  )
}
