import { useState, useEffect } from 'react';
import { getRiskColor } from '../../lib/utils';

interface RiskScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE_MAP = {
  sm: { diameter: 80, strokeWidth: 7, fontSize: 18 },
  md: { diameter: 120, strokeWidth: 9, fontSize: 26 },
  lg: { diameter: 160, strokeWidth: 11, fontSize: 34 },
};

export default function RiskScoreGauge({ score, size = 'md', showLabel = false }: RiskScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const { diameter, strokeWidth, fontSize } = SIZE_MAP[size];
  const center = diameter / 2;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getRiskColor(animatedScore);
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 50);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="inline-flex flex-col items-center">
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="transform"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#2A2A3A"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Colored fill */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease' }}
        />
        {/* Score number */}
        <text
          x={center}
          y={showLabel ? center - 4 : center}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="'JetBrains Mono', monospace"
        >
          {animatedScore}
        </text>
        {/* Label */}
        {showLabel && (
          <text
            x={center}
            y={center + fontSize * 0.8}
            textAnchor="middle"
            fill="#5A5A72"
            fontSize={10}
          >
            Risk Score
          </text>
        )}
      </svg>
    </div>
  );
}
