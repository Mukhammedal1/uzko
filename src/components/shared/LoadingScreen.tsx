export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <svg
        viewBox="0 0 640 500"
        className="w-[220px] sm:w-[260px]"
        role="img"
        aria-label="UZKO yuklanmoqda"
      >
        <defs>
          <clipPath id="logo-clip">
            <path
              transform="translate(320 175) scale(1.2) translate(-326.5 -270.2)"
              d="M219 190 H254.8 V292 C254.8 308 268 318.5 288 318.5 C308 318.5 322 303 334.5 291 L350 310.5
                 C335 330 317 350.5 289.5 350.5 C250 350.5 219 328 219 297 Z
                 M420.5 190 H384 C378 190 375 191 372 194 L308 256 C302 262 299.2 267 299.2 273 V302
                 L302.5 306.8 L308 304 L420.5 194 Z
                 M360.5 264 L366 263.5 L431 344.5 L430.5 347.8 L393.5 348 L342.5 287.5 L343 280.8 Z"
            />
          </clipPath>
          <radialGradient id="glow-g" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#0a2fbf" stopOpacity=".18" />
            <stop offset=".65" stopColor="#0a2fbf" stopOpacity=".05" />
            <stop offset="1" stopColor="#0a2fbf" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bar-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0a2fbf" stopOpacity="0" />
            <stop offset=".5" stopColor="#0a2fbf" />
            <stop offset="1" stopColor="#0a2fbf" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="shine-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset=".5" stopColor="#ffffff" stopOpacity=".9" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="track-clip">
            <rect x="150" y="410" width="340" height="5" rx="2.5" />
          </clipPath>
        </defs>

        {/* Yumshoq nafas oluvchi nur */}
        <circle className="uzko-glow" cx="320" cy="175" r="150" fill="url(#glow-g)" />

        {/* Logo */}
        <g className="uzko-logo" transform="translate(320 175) scale(1.2) translate(-326.5 -270.2)">
          <path
            fill="#1c2438"
            d="M219 190 H254.8 V292 C254.8 308 268 318.5 288 318.5 C308 318.5 322 303 334.5 291 L350 310.5
               C335 330 317 350.5 289.5 350.5 C250 350.5 219 328 219 297 Z"
          />
          <path
            className="uzko-k-arm"
            fill="#0a2fbf"
            d="M420.5 190 H384 C378 190 375 191 372 194 L308 256 C302 262 299.2 267 299.2 273 V302
               L302.5 306.8 L308 304 L420.5 194 Z"
          />
          <path
            className="uzko-k-leg"
            fill="#0a2fbf"
            d="M360.5 264 L366 263.5 L431 344.5 L430.5 347.8 L393.5 348 L342.5 287.5 L343 280.8 Z"
          />
        </g>

        {/* Logo ustidan o'tuvchi shimmer */}
        <g clipPath="url(#logo-clip)">
          <rect className="uzko-shine" x="150" y="0" width="60" height="360" fill="url(#shine-g)" />
        </g>

        {/* Pastdagi loading chizig'i */}
        <rect x="150" y="410" width="340" height="5" rx="2.5" fill="#e4e8f1" />
        <g clipPath="url(#track-clip)">
          <rect
            className="uzko-bar"
            x="150"
            y="410"
            width="130"
            height="5"
            rx="2.5"
            fill="url(#bar-g)"
          />
          <circle className="uzko-spark" cx="150" cy="412.5" r="3.2" fill="#0a2fbf" />
        </g>
      </svg>

      <style>{`
        .uzko-logo {
          transform-origin: 320px 175px;
          animation: uzko-breathe 2.4s ease-in-out infinite;
        }
        @keyframes uzko-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.035); opacity: 0.88; }
        }

        .uzko-glow {
          transform-origin: 320px 175px;
          animation: uzko-glow-anim 2.4s ease-in-out infinite;
        }
        @keyframes uzko-glow-anim {
          0%, 100% { opacity: 0.35; transform: scale(0.94); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }

        .uzko-k-arm {
          transform-origin: 320px 175px;
          animation: uzko-pulse-arm 2.4s ease-in-out infinite;
        }
        .uzko-k-leg {
          transform-origin: 320px 175px;
          animation: uzko-pulse-leg 2.4s ease-in-out infinite;
        }
        @keyframes uzko-pulse-arm {
          0%, 40%, 100% { opacity: 1; }
          20% { opacity: 0.55; }
        }
        @keyframes uzko-pulse-leg {
          0%, 60%, 100% { opacity: 1; }
          40% { opacity: 0.55; }
        }

        .uzko-shine {
          animation: uzko-shine-anim 2.4s ease-in-out infinite;
        }
        @keyframes uzko-shine-anim {
          0% { transform: translateX(-140px) rotate(20deg); opacity: 0; }
          12% { opacity: 0.55; }
          45% { opacity: 0.55; }
          60% { transform: translateX(140px) rotate(20deg); opacity: 0; }
          100% { transform: translateX(140px) rotate(20deg); opacity: 0; }
        }

        .uzko-bar {
          animation: uzko-slide 1.6s cubic-bezier(0.45, 0, 0.2, 1) infinite;
        }
        @keyframes uzko-slide {
          0% { transform: translateX(-170px) scaleX(0.35); }
          50% { transform: translateX(85px) scaleX(1); }
          100% { transform: translateX(340px) scaleX(0.35); }
        }

        .uzko-spark {
          animation: uzko-spark-anim 1.6s linear infinite;
        }
        @keyframes uzko-spark-anim {
          0% { transform: translateX(-30px); opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { transform: translateX(370px); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .uzko-logo, .uzko-glow, .uzko-k-arm, .uzko-k-leg, .uzko-shine, .uzko-bar, .uzko-spark {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
