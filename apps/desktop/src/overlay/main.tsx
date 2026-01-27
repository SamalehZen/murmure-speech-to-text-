import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './overlay.tsx';
import '../tailwind.css';

const root = document.getElementById('root')!;
createRoot(root).render(
    <React.StrictMode>
        <Overlay />
    </React.StrictMode>
);
