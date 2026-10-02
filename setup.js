const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("🚀 Building your project structure...");

const files = {
  "package.json": `{
  "name": "keep-pwa",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.394.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "vite-plugin-pwa": "^0.20.0"
  }
}`,
  "tsconfig.json": `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}`,
  "tsconfig.app.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}`,
  "tsconfig.node.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`,
  "vite.config.ts": `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Keep',
        short_name: 'Keep',
        description: 'Private relationship memory aid',
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});`,
  "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        primary: 'var(--primary)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      }
    },
  },
  plugins: [],
}`,
  "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#fafaf9" />
    <meta name="description" content="Private relationship memory aid" />
    <title>Keep</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  "public/icon.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect width="100" height="100" rx="20" fill="#0d9488"/>
  <circle cx="50" cy="40" r="15" fill="#fafaf9"/>
  <path d="M20 90C20 73.4315 33.4315 60 50 60C66.5685 60 80 73.4315 80 90" fill="#fafaf9"/>
</svg>`,
  "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #fafaf9;
    --surface: #ffffff;
    --primary: #0d9488;
    --text: #1c1917;
    --muted: #78716c;
    --border: #e7e5e4;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --background: #0c0a09;
      --surface: #1c1917;
      --primary: #14b8a6;
      --text: #fafaf9;
      --muted: #a8a29e;
      --border: #292524;
    }
  }
  body {
    background-color: var(--background);
    color: var(--text);
    -webkit-tap-highlight-color: transparent;
    @apply antialiased min-h-[100dvh] w-full overflow-x-hidden;
  }
}`,
  "src/vite-env.d.ts": `/// <reference types="vite/client" />\n/// <reference types="vite-plugin-pwa/client" />`,
  "src/lib/utils.ts": `import { type ClassValue, clsx } from "clsx";\nimport { twMerge } from "tailwind-merge";\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}`,
  "src/main.tsx": `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.tsx';\nimport './index.css';\nimport { registerSW } from 'virtual:pwa-register';\n\nregisterSW({ immediate: true });\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n);`,
  "src/App.tsx": `import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';\nimport AppLayout from './components/layout/AppLayout';\nimport Today from './pages/Today';\nimport People from './pages/People';\nimport OpenLoops from './pages/OpenLoops';\nimport Settings from './pages/Settings';\n\nexport default function App() {\n  return (\n    <HashRouter>\n      <Routes>\n        <Route element={<AppLayout />}>\n          <Route path="/" element={<Navigate to="/today" replace />} />\n          <Route path="/today" element={<Today />} />\n          <Route path="/people" element={<People />} />\n          <Route path="/loops" element={<OpenLoops />} />\n          <Route path="/settings" element={<Settings />} />\n        </Route>\n      </Routes>\n    </HashRouter>\n  );\n}`,
  "src/components/layout/AppLayout.tsx": `import { Outlet } from 'react-router-dom';\nimport BottomNav from './BottomNav';\n\nexport default function AppLayout() {\n  return (\n    <div className="flex flex-col min-h-[100dvh]" dir="auto">\n      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-safe-top pb-24">\n        <Outlet />\n      </main>\n      <BottomNav />\n    </div>\n  );\n}`,
  "src/components/layout/BottomNav.tsx": `import { NavLink } from 'react-router-dom';\nimport { CalendarHeart, Users, CheckCircle, Settings } from 'lucide-react';\nimport { cn } from '@/lib/utils';\n\nexport default function BottomNav() {\n  const links = [\n    { to: '/today', icon: CalendarHeart, label: 'Today' },\n    { to: '/people', icon: Users, label: 'People' },\n    { to: '/loops', icon: CheckCircle, label: 'Loops' },\n    { to: '/settings', icon: Settings, label: 'Settings' },\n  ];\n\n  return (\n    <nav className="fixed bottom-0 w-full bg-surface border-t border-border pb-safe-bottom z-50">\n      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">\n        {links.map(({ to, icon: Icon, label }) => (\n          <NavLink\n            key={to}\n            to={to}\n            className={({ isActive }) =>\n              cn(\n                "flex flex-col items-center justify-center w-full h-full space-y-1 rounded-lg transition-colors",\n                isActive ? "text-primary" : "text-muted hover:text-text"\n              )\n            }\n          >\n            <Icon size={24} strokeWidth={2} />\n            <span className="text-[10px] font-medium tracking-wide">{label}</span>\n          </NavLink>\n        ))}\n      </div>\n    </nav>\n  );\n}`,
  "src/pages/Today.tsx": `export default function Today() {\n  return (\n    <div className="pt-8">\n      <h1 className="text-3xl font-semibold mb-6">Today</h1>\n      <div className="text-center py-20 text-muted">\n        <p>Phase 1 complete.</p>\n        <p className="mt-2 text-sm">Nothing needs your attention today.</p>\n      </div>\n    </div>\n  );\n}`,
  "src/pages/People.tsx": `export default function People() {\n  return (\n    <div className="pt-8">\n      <h1 className="text-3xl font-semibold mb-6">People</h1>\n      <p className="text-muted">People list will go here.</p>\n    </div>\n  );\n}`,
  "src/pages/OpenLoops.tsx": `export default function OpenLoops() {\n  return (\n    <div className="pt-8">\n      <h1 className="text-3xl font-semibold mb-6">Open Loops</h1>\n      <p className="text-muted">Open loops will go here.</p>\n    </div>\n  );\n}`,
  "src/pages/Settings.tsx": `export default function Settings() {\n  return (\n    <div className="pt-8">\n      <h1 className="text-3xl font-semibold mb-6">Settings</h1>\n      <p className="text-muted">App settings and export/import will go here.</p>\n    </div>\n  );\n}`
};

// Write all files and folders
for (const [filePath, content] of Object.entries(files)) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content.trim());
}

console.log("✅ All files created successfully!");
console.log("📦 Installing dependencies (this will take a few seconds)...");

try {
  execSync('npm install', { stdio: 'inherit' });
  console.log("\\n🎉 Setup complete! Starting the development server...");
  execSync('npm run dev', { stdio: 'inherit' });
} catch (err) {
  console.error("An error occurred. Please run 'npm install' manually.");
}
