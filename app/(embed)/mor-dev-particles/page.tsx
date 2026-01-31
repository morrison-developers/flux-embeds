'use client';

import Particles from './Particles';
import { EmbedShell } from '../_shared/EmbedShell';

export default function MorDevParticlesPage() {
  return (
    <EmbedShell>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#161d21',
          height: '100dvh',
        }}
      >
        <Particles />
      </div>
    </EmbedShell>
  );
}
