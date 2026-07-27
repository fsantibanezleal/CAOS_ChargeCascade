import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Disc3 } from 'lucide-react';
import { AppShell, applyTheme, CitationsProvider, readTheme, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import './chargecascade.css';
import { CITATIONS } from './data/citations.ts';
import Focus from './pages/Focus.tsx';
import { architecture } from './architecture.ts';
import pkg from '../package.json';
import Tool from './pages/Tool.tsx';
import Introduction from './pages/Introduction.tsx';
import Methodology from './pages/Methodology.tsx';
import Implementation from './pages/Implementation.tsx';
import Experiments from './pages/Experiments.tsx';
import Benchmark from './pages/Benchmark.tsx';

applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: 'ChargeCascade', mark: <Disc3 size={18} aria-hidden="true" /> },
  routes: [
    { path: '/', en: 'App', es: 'App' },
    { path: '/introduction', en: 'Introduction', es: 'Introducción' },
    { path: '/methodology', en: 'Methodology', es: 'Metodología' },
    { path: '/implementation', en: 'Implementation', es: 'Implementación' },
    { path: '/experiments', en: 'Experiments', es: 'Experimentos' },
    { path: '/benchmark', en: 'Benchmark', es: 'Benchmark' },
  ],
  links: { github: 'https://github.com/fsantibanezleal/CAOS_ChargeCascade' },
  version: pkg.version,  // single source: frontend/package.json (no drift)
  architecture,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
        <Routes>
          {/* ADR-0070: the focus route renders OUTSIDE AppShell on purpose. The shell header and
              footer are exactly the 150px of chrome that stops the App's stage from owning the
              viewport, and the focus view's whole point is that the stage owns it. */}
          <Route path="/focus/:caseId" element={<Focus />} />
          <Route path="*" element={
        <AppShell config={config}>
          <Routes>
            <Route path="/" element={<Tool />} />
            <Route path="/introduction" element={<Introduction />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/implementation" element={<Implementation />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="*" element={<Tool />} />
          </Routes>
        </AppShell>
          } />
        </Routes>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
