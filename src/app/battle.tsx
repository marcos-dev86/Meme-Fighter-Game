import { useLocalSearchParams } from 'expo-router';
import { BattleScreen } from '@/screens/BattleScreen';
// Keyed by the params so going to the next tower floor (same route, new params) starts a fresh fight.
export default function Route() {
  const params = useLocalSearchParams();
  return <BattleScreen key={JSON.stringify(params)} />;
}
