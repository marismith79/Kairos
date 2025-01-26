import { useState, useEffect } from 'react';
import { humeService } from '../humeService';

export const useHume = () => {
  const [state, setState] = useState(humeService.getStore().getState());

  useEffect(() => {
    const unsubscribe = humeService.getStore().subscribe(setState);
    return () =>  { unsubscribe };
  }, []);

  return {
    ...state,
    connect: () => humeService.connect(),
    disconnect: () => humeService.disconnect(),
  };
};