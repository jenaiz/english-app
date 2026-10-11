import BeyondGrammar from '../components/home/BeyondGrammar'
import FinalCta from '../components/home/FinalCta'
import HeroExercise from '../components/home/HeroExercise'
import LevelPath from '../components/home/LevelPath'
import MethodSection from '../components/home/MethodSection'
import ReviewSection from '../components/home/ReviewSection'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const cta = user ? { to: '/levels', label: 'Ir a Inicio' } : { to: '/register', label: 'Empieza gratis' }

  return (
    <div>
      <HeroExercise cta={cta} showLogin={!user} />
      <MethodSection />
      <BeyondGrammar />
      <ReviewSection />
      <LevelPath />
      <FinalCta cta={cta} />
    </div>
  )
}
