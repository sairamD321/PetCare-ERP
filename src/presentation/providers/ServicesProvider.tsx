import { createContext, useContext, type ReactNode } from 'react';
import type { Services } from '@/application/services';

const ServicesContext = createContext<Services | null>(null);

// Dependency injection for the UI: screens ask for ports (useServices().products …), never for
// concrete HTTP or storage classes. Tests can render with a fake container.
export function ServicesProvider({ services, children }: { services: Services; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used inside <ServicesProvider>.');
  return services;
}
