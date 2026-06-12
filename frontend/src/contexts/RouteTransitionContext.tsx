import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface RouteTransitionContextValue {
  navigateWithTransition: (path: string) => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null);

export const RouteTransitionProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateWithTransition = useCallback((path: string) => {
    if (path === location.pathname) return;

    navigate(path);
  }, [location.pathname, navigate]);

  const value = useMemo<RouteTransitionContextValue>(() => ({
    navigateWithTransition,
  }), [navigateWithTransition]);

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
};

export const useRouteTransition = () => {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error('useRouteTransition must be used within RouteTransitionProvider');
  }
  return context;
};
