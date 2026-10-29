import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { AppShell } from './components/AppShell';
import { Live } from './components/ShopBits';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingBlock } from './components/ui';
import { AppMark } from './graphics/Icons';

const SignIn = lazy(() => import('./pages/auth/SignIn'));
const Join = lazy(() => import('./pages/auth/Join'));
const NewPassword = lazy(() => import('./pages/auth/NewPassword'));
const Home = lazy(() => import('./pages/Home'));
const Picker = lazy(() => import('./pages/tools/Picker'));
const Library = lazy(() => import('./pages/tools/Library'));
const ToolEntry = lazy(() => import('./pages/tools/ToolEntry'));
const Inventory = lazy(() => import('./pages/shop/Inventory'));
const Item = lazy(() => import('./pages/shop/Item'));
const Changelog = lazy(() => import('./pages/shop/Changelog'));
const LearnHub = lazy(() => import('./pages/learn/LearnHub'));
const Safety = lazy(() => import('./pages/learn/Safety'));
const SafetyTest = lazy(() => import('./pages/learn/test/SafetyTest'));
const SafetyTestEditor = lazy(() => import('./pages/learn/test/SafetyTestEditor'));
const SafetyLog = lazy(() => import('./pages/learn/test/SafetyLog'));
const Practice = lazy(() => import('./pages/learn/Practice'));
const Projects = lazy(() => import('./pages/learn/Projects'));
const ProjectEntry = lazy(() => import('./pages/learn/ProjectEntry'));
const Materials = lazy(() => import('./pages/learn/Materials'));
const MaterialEntry = lazy(() => import('./pages/learn/MaterialEntry'));
const Ste = lazy(() => import('./pages/learn/Ste'));
const Posts = lazy(() => import('./pages/community/Posts'));
const Announcements = lazy(() => import('./pages/community/Announcements'));
const Roster = lazy(() => import('./pages/community/Roster'));
const Groups = lazy(() => import('./pages/community/Groups'));
const GroupChannel = lazy(() => import('./pages/community/GroupChannel'));
const Profile = lazy(() => import('./pages/Profile'));
const Moderation = lazy(() => import('./pages/Moderation'));
const Dev = lazy(() => import('./pages/Dev'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse">
        <AppMark size={56} />
      </div>
    </div>
  );
}

const live = (el: ReactNode) => <Live>{el}</Live>;

function Gate() {
  const { status, recovering } = useAuth();
  if (status === 'loading') return <Splash />;

  let screen: ReactNode;
  if (recovering) screen = <NewPassword />;
  else if (status === 'signed-out') screen = <SignIn />;
  else if (status === 'needs-join') screen = <Join />;
  else {
    screen = (
      <AppShell>
        <ErrorBoundary>
        <Suspense fallback={<LoadingBlock />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/picker" element={<Picker />} />
            <Route path="/tools" element={<Library />} />
            <Route path="/tools/:slug" element={<ToolEntry />} />
            <Route path="/shop" element={live(<Inventory />)} />
            <Route path="/shop/log" element={live(<Changelog />)} />
            <Route path="/shop/:id" element={live(<Item />)} />
            <Route path="/learn" element={<LearnHub />} />
            <Route path="/learn/safety" element={<Safety />} />
            <Route path="/learn/safety/practice" element={<Practice />} />
            <Route path="/learn/safety/test" element={live(<SafetyTest />)} />
            <Route path="/learn/safety/test/edit" element={live(<SafetyTestEditor />)} />
            <Route path="/learn/safety/log" element={live(<SafetyLog />)} />
            <Route path="/learn/projects" element={<Projects />} />
            <Route path="/learn/projects/:slug" element={<ProjectEntry />} />
            <Route path="/learn/materials" element={<Materials />} />
            <Route path="/learn/materials/:id" element={<MaterialEntry />} />
            <Route path="/learn/ste" element={<Ste />} />
            <Route path="/community" element={live(<Posts />)} />
            <Route path="/community/announcements" element={live(<Announcements />)} />
            <Route path="/community/roster" element={live(<Roster />)} />
            <Route path="/groups" element={live(<Groups />)} />
            <Route path="/groups/:id" element={live(<GroupChannel />)} />
            <Route path="/me" element={<Profile />} />
            <Route path="/mod" element={live(<Moderation />)} />
            <Route path="/dev" element={live(<Dev />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </AppShell>
    );
  }
  return <Suspense fallback={<Splash />}>{screen}</Suspense>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Gate />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
