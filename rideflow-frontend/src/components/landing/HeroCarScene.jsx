// src/components/landing/HeroCarScene.jsx
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function HeroCarScene() {
  const mountRef = useRef(null);
  const carRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Gentle floating animation
      gsap.to(carRef.current, {
        y: -15,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      // Subtle rotation/parallax on scroll
      ScrollTrigger.create({
        trigger: mountRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => {
          if (carRef.current) {
            gsap.set(carRef.current, { 
              x: self.progress * 150,
              rotate: self.progress * 2
            });
          }
        },
      });
    }, mountRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: '#050508'
      }}
    >
      {/* Side view Lamborghini - Silver/Grey as per Stitch Design */}
      <img 
        ref={carRef}
        src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1920&q=80" 
        alt="Premium Car Side View"
        style={{
          position: 'absolute',
          right: '-15%', // Pushed further right to clear space for text
          top: '20%',   
          width: '95%',  // Maximum impact for full-width layout
          height: 'auto',
          objectFit: 'contain',
          zIndex: 5,
          filter: 'drop-shadow(0 0 100px rgba(245,166,35,0.05))',
          pointerEvents: 'none'
        }}
      />

      {/* Atmospheric Overlays */}
      
      {/* Focused Spotlight from top-right */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '10%',
        width: '60%',
        height: '80%',
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, transparent 70%)',
        zIndex: 6,
        pointerEvents: 'none',
        transform: 'rotate(-20deg)'
      }} />

      {/* Strong Left-side shadow for text (ensures text is furthest left) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        background: 'linear-gradient(to right, #050508 0%, #050508 25%, rgba(5,5,8,0.7) 40%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      {/* Bottom grounding shadow */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(to top, #050508 0%, transparent 100%)',
        zIndex: 11,
        pointerEvents: 'none'
      }} />
    </div>
  );
}
