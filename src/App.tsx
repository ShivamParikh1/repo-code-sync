import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import HabitsPage from "@/pages/HabitsPage";
import HabitSelectPage from "@/pages/HabitSelectPage";
import ProgressPage from "@/pages/ProgressPage";
import CommunityPage from "@/pages/CommunityPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/habits" element={
              <ProtectedRoute>
                <Layout>
                  <HabitsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/habits/select/:type" element={
              <ProtectedRoute>
                <HabitSelectPage />
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute>
                <Layout>
                  <ProgressPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/community" element={
              <ProtectedRoute>
                <Layout>
                  <CommunityPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
