import { useEffect } from 'react';
import { useFeatherService } from '../src';

export default function Counter() {
  const { get, set } = useFeatherService();
  useEffect(() => {
    if (get('count') === undefined) set('count', 0);
  }, []);

  const inc = () => set('count', (get('count') || 0) + 1);
  return (
    <button onClick={inc}>Increment: {get('count')}</button>
  );
}
