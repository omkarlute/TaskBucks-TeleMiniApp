import React, { useEffect, useState } from 'react'

const MESSAGES = [
  '🚀 First-Ever Earn Bot on Telegram — history doesn’t load this fast 😉',
  '💰 Securing your 60% share — because fairness takes a second!',
  '📊 Crunching referral math — infinity is harder than it looks 😅',
  '🔥 Too many earners online at once — including YOU!',
  '✨ Preparing something epic — legends don’t just load, they arrive',
  '🥇 Winners wait a second. Losers never earn. You’re clearly a winner 😉'
]

// Epic 3D Rotating Polyhedron with Particles
const EpicPolyhedron = () => (
  <div className="relative h-20 w-20 mx-auto mb-6" style={{ perspective: '400px' }}>
    {/* Particle system background */}
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-60"
        style={{
          left: '50%',
          top: '50%',
          animation: `particle-orbit-${i} ${2 + i * 0.3}s infinite linear`,
          animationDelay: `${i * 0.2}s`
        }}
      />
    ))}
    
    {/* Main 3D shape */}
    <div 
      className="absolute inset-0 rounded-lg"
      style={{
        animation: 'epic-poly-spin 4s infinite ease-in-out',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Multiple faces with different gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-lg shadow-2xl opacity-90" style={{ transform: 'rotateY(0deg) translateZ(20px)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 rounded-lg shadow-2xl opacity-90" style={{ transform: 'rotateY(60deg) translateZ(20px)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-cyan-500 rounded-lg shadow-2xl opacity-90" style={{ transform: 'rotateY(120deg) translateZ(20px)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-lg shadow-2xl opacity-90" style={{ transform: 'rotateY(180deg) translateZ(20px)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-lg shadow-2xl opacity-90" style={{ transform: 'rotateY(240deg) translateZ(20px)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-lg shadow-2xl opacity-90" style={{ transform: 'rotateY(300deg) translateZ(20px)' }} />
      
      {/* Core glowing center */}
      <div className="absolute inset-4 bg-white rounded-full shadow-inner animate-pulse" style={{ boxShadow: '0 0 20px rgba(255,255,255,0.8) inset' }} />
    </div>

    <style jsx>{`
      @keyframes epic-poly-spin {
        0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
        25% { transform: rotateX(90deg) rotateY(180deg) rotateZ(45deg); }
        50% { transform: rotateX(180deg) rotateY(360deg) rotateZ(90deg); }
        75% { transform: rotateX(270deg) rotateY(540deg) rotateZ(135deg); }
        100% { transform: rotateX(360deg) rotateY(720deg) rotateZ(180deg); }
      }
      ${[...Array(12)].map((_, i) => `
        @keyframes particle-orbit-${i} {
          0% { 
            transform: translate(-50%, -50%) rotate(${i * 30}deg) translateX(40px) scale(0.5);
            opacity: 0.3;
          }
          50% { 
            transform: translate(-50%, -50%) rotate(${i * 30 + 180}deg) translateX(50px) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translate(-50%, -50%) rotate(${i * 30 + 360}deg) translateX(40px) scale(0.5);
            opacity: 0.3;
          }
        }
      `).join('')}
    `}</style>
  </div>
)

// Mind-bending Tesseract (4D Cube) Animation
const Tesseract = () => (
  <div className="relative h-20 w-20 mx-auto mb-6" style={{ perspective: '800px' }}>
    <div 
      className="absolute inset-0"
      style={{
        animation: 'tesseract-rotation 6s infinite linear',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Outer cube */}
      {[0, 90, 180, 270].map(rotation => (
        <div
          key={`outer-${rotation}`}
          className="absolute inset-0 border-2 border-cyan-400 rounded-lg"
          style={{
            transform: `rotateY(${rotation}deg) translateZ(30px)`,
            background: `linear-gradient(45deg, rgba(6, 182, 212, 0.1), rgba(147, 51, 234, 0.1))`,
            animation: 'cube-pulse 2s infinite alternate'
          }}
        />
      ))}
      
      {/* Inner cube */}
      {[0, 90, 180, 270].map(rotation => (
        <div
          key={`inner-${rotation}`}
          className="absolute inset-2 border-2 border-purple-400 rounded-lg"
          style={{
            transform: `rotateY(${rotation + 45}deg) translateZ(15px)`,
            background: `linear-gradient(-45deg, rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.2))`,
            animation: 'cube-pulse 2s infinite alternate 0.5s'
          }}
        />
      ))}
      
      {/* Core energy */}
      <div className="absolute inset-6 bg-gradient-to-br from-white via-cyan-300 to-purple-300 rounded-full animate-spin" style={{ animation: 'core-energy 3s infinite ease-in-out' }} />
    </div>

    <style jsx>{`
      @keyframes tesseract-rotation {
        0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
        100% { transform: rotateX(360deg) rotateY(720deg) rotateZ(360deg); }
      }
      @keyframes cube-pulse {
        0% { opacity: 0.3; transform: rotateY(var(--rotation, 0deg)) translateZ(30px) scale(0.9); }
        100% { opacity: 1; transform: rotateY(var(--rotation, 0deg)) translateZ(30px) scale(1.1); }
      }
      @keyframes core-energy {
        0%, 100% { transform: scale(0.5) rotate(0deg); filter: hue-rotate(0deg); }
        50% { transform: scale(1.2) rotate(180deg); filter: hue-rotate(180deg); }
      }
    `}</style>
  </div>
)

// Holographic DNA Helix
const DNAHelix = () => (
  <div className="relative h-20 w-20 mx-auto mb-6" style={{ perspective: '500px' }}>
    {/* DNA strands */}
    {[0, 1].map(strand => (
      <div key={strand} className="absolute inset-0" style={{ animation: `dna-helix-${strand} 3s infinite linear` }}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-3 h-3 rounded-full ${strand === 0 ? 'bg-cyan-400' : 'bg-purple-400'} shadow-lg`}
            style={{
              left: '50%',
              top: `${12.5 + i * 9}%`,
              transform: `translateX(-50%) rotateY(${strand * 180 + i * 45}deg) translateX(25px)`,
              boxShadow: `0 0 10px ${strand === 0 ? 'cyan' : 'purple'}`,
              animation: `dna-glow 2s infinite alternate ${i * 0.2}s`
            }}
          />
        ))}
      </div>
    ))}
    
    {/* Connecting bonds */}
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400 opacity-60"
        style={{
          left: '50%',
          top: `${20 + i * 10}%`,
          transform: 'translateX(-50%)',
          animation: `bond-pulse 1.5s infinite alternate ${i * 0.3}s`
        }}
      />
    ))}

    <style jsx>{`
      @keyframes dna-helix-0 {
        0% { transform: rotateY(0deg); }
        100% { transform: rotateY(360deg); }
      }
      @keyframes dna-helix-1 {
        0% { transform: rotateY(180deg); }
        100% { transform: rotateY(540deg); }
      }
      @keyframes dna-glow {
        0% { box-shadow: 0 0 10px currentColor; transform: translateX(-50%) rotateY(var(--rotation)) translateX(25px) scale(0.8); }
        100% { box-shadow: 0 0 20px currentColor; transform: translateX(-50%) rotateY(var(--rotation)) translateX(25px) scale(1.2); }
      }
      @keyframes bond-pulse {
        0% { opacity: 0.3; width: 2rem; }
        100% { opacity: 1; width: 3rem; }
      }
    `}</style>
  </div>
)

// Quantum Portal Effect
const QuantumPortal = () => (
  <div className="relative h-20 w-20 mx-auto mb-6">
    {/* Portal rings */}
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full border-2"
        style={{
          inset: `${i * 8}px`,
          borderColor: `hsl(${i * 60 + 180}, 70%, 60%)`,
          animation: `portal-ring-${i} ${2 + i * 0.5}s infinite linear`,
          background: `conic-gradient(from ${i * 72}deg, transparent, hsl(${i * 60 + 180}, 70%, 60%, 0.3), transparent)`
        }}
      />
    ))}
    
    {/* Central vortex */}
    <div 
      className="absolute inset-4 rounded-full bg-gradient-to-br from-white via-cyan-300 to-purple-600"
      style={{
        animation: 'vortex-spin 1s infinite linear',
        background: 'conic-gradient(from 0deg, #ffffff, #06b6d4, #8b5cf6, #ffffff)',
        filter: 'blur(0.5px)'
      }}
    />
    
    {/* Energy particles */}
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-white rounded-full"
        style={{
          left: '50%',
          top: '50%',
          animation: `energy-particle-${i} 3s infinite linear`,
          animationDelay: `${i * 0.15}s`
        }}
      />
    ))}

    <style jsx>{`
      ${[...Array(5)].map((_, i) => `
        @keyframes portal-ring-${i} {
          0% { transform: rotateZ(0deg) scale(${0.8 + i * 0.1}); opacity: 0.4; }
          50% { opacity: 1; }
          100% { transform: rotateZ(360deg) scale(${1.2 + i * 0.1}); opacity: 0.4; }
        }
      `).join('')}
      
      @keyframes vortex-spin {
        0% { transform: rotate(0deg) scale(0.8); }
        100% { transform: rotate(360deg) scale(1.2); }
      }
      
      ${[...Array(20)].map((_, i) => `
        @keyframes energy-particle-${i} {
          0% { 
            transform: translate(-50%, -50%) rotate(${i * 18}deg) translateX(0px) scale(0);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) rotate(${i * 18}deg) translateX(40px) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translate(-50%, -50%) rotate(${i * 18}deg) translateX(60px) scale(0);
            opacity: 0;
          }
        }
      `).join('')}
    `}</style>
  </div>
)

export default function LoadingOverlay({ active }) {
  const [i, setI] = useState(0)
  const [animationType, setAnimationType] = useState(0)
  
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setI(v => (v + 1) % MESSAGES.length), 1600)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setAnimationType(v => (v + 1) % 4), 5000)
    return () => clearInterval(id)
  }, [active])

  if (!active) return null

  const animations = [
    <EpicPolyhedron key="poly" />,
    <Tesseract key="tesseract" />,
    <DNAHelix key="dna" />,
    <QuantumPortal key="portal" />
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b11] text-white overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20 animate-pulse" />
      
      <div className="max-w-sm text-center px-6 relative z-10">
        {animations[animationType]}
        <div className="text-base leading-relaxed opacity-90 font-medium tracking-wide">{MESSAGES[i]}</div>
        
        {/* Subtle bottom glow effect */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-pulse" />
      </div>
    </div>
  )
}
