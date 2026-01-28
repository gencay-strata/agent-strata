import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Home from './pages/Home';
import LandingPage from './pages/LandingPage';
import InterviewSession from './pages/InterviewSession';
import Results from './pages/Results';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key');
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <Router>
        <Routes>
          {/* Home page - Public (no auth required) */}
          <Route path="/" element={<Home />} />

          {/* Interview setup page - Protected */}
          <Route
            path="/interview-setup"
            element={
              <>
                <SignedIn>
                  <LandingPage />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />

          {/* Interview session - Protected */}
          <Route
            path="/interview"
            element={
              <>
                <SignedIn>
                  <InterviewSession />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />

          {/* Results page - Protected */}
          <Route
            path="/results"
            element={
              <>
                <SignedIn>
                  <Results />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}

export default App;
