'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import {
  type Container,
  type ISourceOptions,
  MoveDirection,
  OutMode,
  type Engine,
} from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

export default function ParticleLayer() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      console.log('[tsparticles] Engine init triggered');
      await loadSlim(engine);
      console.log('[tsparticles] Slim engine loaded');
    }).then(() => {
      setInit(true);
      console.log('[tsparticles] Initialization complete');
    });
  }, []);

  const particlesLoaded = async (container?: Container): Promise<void> => {
    console.log('[tsparticles] Particles loaded:', container);
  };

  const options: ISourceOptions = useMemo(() => {
    console.log('[tsparticles] Options config initialized');
    return {
      fullScreen: { enable: true, zIndex: 1 },
      background: {
        color: {
          value: "transparent"
        },
      },
      fpsLimit: 60,
      detectRetina: true,
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: "repulse",
          },
          onClick: {
            enable: true,
            mode: "attract",
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          repulse: {
            distance: 200,
            duration: 200,
            speed: 0.02,
            easing: "ease-out-quad",
          },
          attract: {
            distance: 200,
            duration: 1,
            speed: 10,
            easing: "ease-out-quad",
          },
        },
      },
      particles: {
        number: {
          value: 900,
          density: {
            enable: true,
            area: 800,
          },
        },
        color: {
          value: "#488188",
        },
        shape: {
          type: "circle",
        },
        opacity: {
          value: { min: 0.1, max: 0.4 },
          animation: {
            enable: true,
            speed: 1,
            minimumValue: 0.1,
            sync: false,
          },
        },
        size: {
          value: { min: 0.5, max: 2.5 },
        },
        move: {
          enable: true,
          direction: "top",
          speed: 0.4,
          outModes: {
            default: "out",
          },
          decay: 0,
          random: true,
          straight: false,
        },
      },
    };
  }, []);

  return init ? (
    <Particles
      id="tsparticles"
      particlesLoaded={particlesLoaded}
      options={options}
    />
  ) : null;
}
