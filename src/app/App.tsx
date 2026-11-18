import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { FullPageLoader } from '@/presentation/components/PageState';
import { GuestOnly, RequireAuth, RoleLayout } from '@/presentation/layouts/RouteGuards';
import { MenuPage } from '@/presentation/pages/MenuPage';
import { AuthProvider } from '@/presentation/providers/AuthProvider';
import { MenuProvider } from '@/presentation/providers/MenuProvider';
import { ServicesProvider } from '@/presentation/providers/ServicesProvider';
import { theme } from '@/presentation/theme/theme';
import { createServices } from './container';

// Sign-in screens are only downloaded by signed-out visitors.
const LoginPage = lazy(() => import('@/presentation/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/presentation/pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/presentation/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));

// Every signed-in page comes from the backend menu: MenuPage matches the url against the user's menu
// links and renders the matching screen ("/" opens the first link).
export function App() {
  const [services] = useState(createServices);

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <ModalsProvider>
        <Notifications position="top-right" />
        <ServicesProvider services={services}>
          <AuthProvider>
            <MenuProvider>
              <BrowserRouter>
                <Suspense fallback={<FullPageLoader />}>
                  <Routes>
                    <Route element={<GuestOnly />}>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    </Route>
                    <Route element={<RequireAuth />}>
                      <Route element={<RoleLayout />}>
                        <Route path="*" element={<MenuPage />} />
                      </Route>
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </MenuProvider>
          </AuthProvider>
        </ServicesProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
