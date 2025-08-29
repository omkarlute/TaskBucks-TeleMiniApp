import React, { useEffect, useState } from 'react'

const MESSAGES = [
  'Getting your tasks and rewards ready…',
  'Summoning bonus fairies…',
  'Too many legends online at once — including you 😎 — loading shortly!',
  'Counting referrals (math is hard)…',
  'Spinning up the mini app engines…'
]

// Option 1: 3D Rotating Cube with Gradient
const CubeAnimation = () => (
  <div className="relative h-14 w-14 mx-auto mb-4" style={{ perspective: '200px' }}>
    <div 
      className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg shadow-lg"
      style={{
        animation: 'cube-spin 2s infinite linear',
        transformStyle: 'preserve-3d',
      }}
    />
    <style jsx>{`
      @keyframes cube-spin {
        0% { transform: rotateX(0deg) rotateY(0deg); }
        25% { transform: rotateX(90deg) rotateY(0deg); }
        50% { transform: rotateX(90deg) rotateY(90deg); }
        75% { transform: rotateX(0deg) rotateY(90deg); }
        100% { transform: rotateX(0deg) rotateY(0deg); }
      }
    `}</style>
  </div>
)

// Option 2: Floating Orbs Animation
const FloatingOrbs = () => (
  <div className="relative h-14 w-14 mx-auto mb-4">
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-ping opacity-20" />
    <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse" />
    <div className="absolute inset-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 animate-bounce" />
    <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white animate-pulse" />
  </div>
)

// Option 3: 3D Card Flip Animation
const CardFlip = () => (
  <div className="relative h-14 w-14 mx-auto mb-4" style={{ perspective: '1000px' }}>
    <div 
      className="absolute inset-0 rounded-xl"
      style={{
        animation: 'card-flip 2s infinite ease-in-out',
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-600 rounded-xl shadow-lg" style={{ backfaceVisibility: 'hidden' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl shadow-lg" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} />
    </div>
    <style jsx>{`
      @keyframes card-flip {
        0%, 100% { transform: rotateY(0deg); }
        50% { transform: rotateY(180deg); }
      }
    `}</style>
  </div>
)

// Option 4: Morphing Shape Animation
const MorphingShape = () => (
  <div className="relative h-14 w-14 mx-auto mb-4">
    <div 
      className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-600 shadow-lg"
      style={{
        animation: 'morph-shape 3s infinite ease-in-out',
        transformOrigin: 'center',
      }}
    />
    <style jsx>{`
      @keyframes morph-shape {
        0%, 100% { 
          border-radius: 50%; 
          transform: rotate(0deg) scale(1);
        }
        25% { 
          border-radius: 25%; 
          transform: rotate(90deg) scale(1.1);
        }
        50% { 
          border-radius: 10%; 
          transform: rotate(180deg) scale(0.9);
        }
        75% { 
          border-radius: 25%; 
          transform: rotate(270deg) scale(1.1);
        }
      }
    `}</style>
  </div>
)

// Option 5: Loading Rings Animation
const LoadingRings = () => (
  <div className="relative h-14 w-14 mx-auto mb-4">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="absolute inset-0 rounded-full border-2 border-transparent"
        style={{
          borderTopColor: ['#3b82f6', '#8b5cf6', '#ec4899'][i],
          animation: `ring-spin 1.5s infinite linear`,
          animationDelay: `${i * 0.2}s`,
          transform: `scale(${1 - i * 0.2})`,
        }}
      />
    ))}
    <style jsx>{`
      @keyframes ring-spin {
        0% { transform: rotate(0deg) scale(var(--scale)); }
        100% { transform: rotate(360deg) scale(var(--scale)); }
      }
    `}</style>
  </div>
)

// Option 6: 3D Hexagon Rotation
const HexagonRotation = () => (
  <div className="relative h-14 w-14 mx-auto mb-4" style={{ perspective: '200px' }}>
    <div 
      className="absolute inset-0 bg-gradient-to-br from-teal-400 to-blue-600 shadow-lg"
      style={{
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        animation: 'hexagon-3d 2s infinite ease-in-out',
        transformStyle: 'preserve-3d',
      }}
    />
    <style jsx>{`
      @keyframes hexagon-3d {
        0%, 100% { transform: rotateX(0deg) rotateY(0deg); }
        33% { transform: rotateX(60deg) rotateY(120deg); }
        66% { transform: rotateX(-60deg) rotateY(240deg); }
      }
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

  // Change animation every few seconds
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setAnimationType(v => (v + 1) % 6), 4000)
    return () => clearInterval(id)
  }, [active])

  if (!active) return null

  const animations = [
    <CubeAnimation key="cube" />,
    <FloatingOrbs key="orbs" />,
    <CardFlip key="card" />,
    <MorphingShape key="morph" />,
    <LoadingRings key="rings" />,
    <HexagonRotation key="hex" />
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b11] text-white">
      <div className="max-w-sm text-center px-6">
        {animations[animationType]}
        <div className="text-base leading-relaxed opacity-90">{MESSAGES[i]}</div>
      </div>
    </div>
  )
}
