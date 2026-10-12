import { Navigate } from 'react-router-dom'
import BeyondGrammar from '../components/home/BeyondGrammar'
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
  if (user) return <Navigate to="/levels" replace />

  return (
    <div>
      <HeroExercise cta={CTA} showLogin />
      <MethodSection />
      <BeyondGrammar />
      <ReviewSection />
      <LevelPath />
      <FinalCta cta={CTA} />
    </div>
  )
}
