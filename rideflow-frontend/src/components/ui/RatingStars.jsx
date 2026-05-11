import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export default function RatingStars({ mode = 'display', value = 0, onChange, size = 'md' }) {
  const [hover, setHover] = useState(0);

  const sizes = {
    sm: 14,
    md: 20,
    lg: 32
  };

  const starSize = sizes[size] || 20;

  const renderStar = (index) => {
    const starValue = index + 1;
    
    if (mode === 'input') {
      const isFilled = (hover || value) >= starValue;
      return (
        <motion.button
          key={index}
          type="button"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange && onChange(starValue)}
          onMouseEnter={() => setHover(starValue)}
          onMouseLeave={() => setHover(0)}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: 0, 
            cursor: 'pointer',
            color: isFilled ? 'var(--amber-core)' : 'rgba(255,255,255,0.2)',
            display: 'flex'
          }}
        >
          <Star size={starSize} fill={isFilled ? 'currentColor' : 'none'} />
        </motion.button>
      );
    }

    // Display Mode Logic (with partial fill)
    const fillAmount = Math.max(0, Math.min(1, value - index));
    
    return (
      <div key={index} style={{ position: 'relative', width: starSize, height: starSize, color: 'rgba(255,255,255,0.1)' }}>
        <Star size={starSize} style={{ position: 'absolute', top: 0, left: 0 }} />
        {fillAmount > 0 && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: `${fillAmount * 100}%`, 
            overflow: 'hidden', 
            color: 'var(--amber-core)' 
          }}>
            <Star size={starSize} fill="currentColor" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? '8px' : '4px' }}>
      <div style={{ display: 'flex', gap: size === 'lg' ? '4px' : '2px' }}>
        {[...Array(5)].map((_, i) => renderStar(i))}
      </div>
      {mode === 'display' && value > 0 && (
        <span style={{ 
          marginLeft: '4px', 
          fontSize: size === 'sm' ? '12px' : '14px', 
          fontWeight: 700, 
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)'
        }}>
          {Number(value).toFixed(1)}
        </span>
      )}
    </div>
  );
}
