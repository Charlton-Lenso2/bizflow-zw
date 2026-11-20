import { motion } from "motion/react";

export type MascotState =
  | "idle"
  | "email"
  | "password"
  | "error"
  | "success"
  | "loading";

type AnimatedMascotProps = {
  state: MascotState;
};

export function AnimatedMascot({ state }: AnimatedMascotProps) {
  const isCoveringEyes = state === "password";
  const isError = state === "error";
  const isSuccess = state === "success";
  const isLoading = state === "loading";

  return (
    <div className="relative mx-auto flex w-full max-w-[380px] items-center justify-center">
      <div className="absolute h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />

      <motion.div
        className="relative w-full"
        animate={isSuccess ? { y: [0, -16, 0, -8, 0] } : { y: [0, -7, 0] }}
        transition={
          isSuccess
            ? { duration: 0.8, ease: "easeOut" }
            : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <svg
          viewBox="0 0 360 400"
          className="relative z-10 w-full"
          fill="none"
          role="img"
          aria-label="Animated BizFlow mascot"
        >
          <defs>
            <linearGradient id="mascotBody" x1="90" y1="220" x2="270" y2="360">
              <stop stopColor="#60A5FA" />
              <stop offset="0.55" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>

            <linearGradient id="mascotFace" x1="130" y1="60" x2="230" y2="210">
              <stop stopColor="#EFF6FF" />
              <stop offset="1" stopColor="#BFDBFE" />
            </linearGradient>

            <linearGradient
              id="mascotHands"
              x1="100"
              y1="270"
              x2="280"
              y2="360"
            >
              <stop stopColor="#93C5FD" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>

            <filter
              id="mascotShadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          <ellipse
            cx="180"
            cy="355"
            rx="95"
            ry="16"
            fill="#1E40AF"
            opacity=".12"
            filter="url(#mascotShadow)"
          />

          {/* Body */}
          <motion.g
            animate={
              isSuccess
                ? { rotate: [0, -3, 3, 0] }
                : { rotate: [0, -1.5, 1.5, 0] }
            }
            transition={
              isSuccess
                ? { duration: 0.6 }
                : { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <path
              d="M95 235C78 247 69 274 69 320C69 342 85 355 105 355H255C275 355 291 342 291 320C291 274 282 247 265 235C245 220 220 215 180 215C140 215 115 220 95 235Z"
              fill="url(#mascotBody)"
            />

            <path
              d="M145 218L180 265L215 218"
              fill="#DBEAFE"
              stroke="#BFDBFE"
              strokeWidth="3"
            />

            <path d="M165 265L180 281L195 265" fill="#1D4ED8" />

            <rect
              x="157"
              y="286"
              width="46"
              height="40"
              rx="12"
              fill="#1E40AF"
            />

            <text
              x="180"
              y="313"
              textAnchor="middle"
              fill="#DBEAFE"
              fontSize="24"
              fontWeight="bold"
            >
              B
            </text>

            {/* Left arm */}
            <motion.g
              animate={
                isSuccess
                  ? { rotate: -35, y: -25 }
                  : isCoveringEyes
                    ? { rotate: -125, y: -18 }
                    : { rotate: 0, y: 0 }
              }
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
              style={{ transformOrigin: "100px 260px" }}
            >
              <path
                d="M105 260C80 264 67 282 69 305L75 330C78 344 94 348 104 339C114 329 118 310 117 292L105 260Z"
                fill="url(#mascotBody)"
              />

              <motion.path
                d="M95 327C85 323 77 329 76 339C75 350 86 359 98 355C111 351 115 339 108 331C104 327 100 326 95 327Z"
                fill="url(#mascotHands)"
                animate={
                  isCoveringEyes
                    ? { x: 85, y: -125, scale: 1.1 }
                    : isSuccess
                      ? { y: -15 }
                      : { x: 0, y: 0, scale: 1 }
                }
                transition={{ type: "spring", stiffness: 150, damping: 15 }}
              />
            </motion.g>

            {/* Right arm */}
            <motion.g
              animate={
                isSuccess
                  ? { rotate: 35, y: -25 }
                  : isCoveringEyes
                    ? { rotate: 125, y: -18 }
                    : { rotate: 0, y: 0 }
              }
              transition={{ type: "spring", stiffness: 180, damping: 16 }}
              style={{ transformOrigin: "260px 260px" }}
            >
              <path
                d="M255 260C280 264 293 282 291 305L285 330C282 344 266 348 256 339C246 329 242 310 243 292L255 260Z"
                fill="url(#mascotBody)"
              />

              <motion.path
                d="M265 327C275 323 283 329 284 339C285 350 274 359 262 355C249 351 245 339 252 331C256 327 260 326 265 327Z"
                fill="url(#mascotHands)"
                animate={
                  isCoveringEyes
                    ? { x: -85, y: -125, scale: 1.1 }
                    : isSuccess
                      ? { y: -15 }
                      : { x: 0, y: 0, scale: 1 }
                }
                transition={{ type: "spring", stiffness: 150, damping: 15 }}
              />
            </motion.g>

            {/* Head */}
            <motion.g
              animate={
                isError
                  ? { rotate: [0, 5, -2, 0], y: [0, 3, 0] }
                  : isSuccess
                    ? { y: -10, rotate: [0, 3, -3, 0] }
                    : { y: 0, rotate: 0 }
              }
              transition={
                isError
                  ? { duration: 0.7, ease: "easeInOut" }
                  : isSuccess
                    ? { duration: 0.65, ease: "easeOut" }
                    : { type: "spring", stiffness: 170, damping: 14 }
              }
              style={{ transformOrigin: "180px 220px" }}
            >
              {/* Head shape */}
              <path
                d="M112 105C112 67 140 40 180 40C220 40 248 67 248 105V165C248 205 220 230 180 230C140 230 112 205 112 165V105Z"
                fill="url(#mascotBody)"
              />

              {/* Forehead highlight */}
              <path
                d="M130 82C144 60 162 52 180 52C198 52 216 60 230 82"
                stroke="#BFDBFE"
                strokeWidth="8"
                strokeLinecap="round"
                opacity=".65"
              />

              {/* Ears */}
              <ellipse cx="110" cy="145" rx="12" ry="20" fill="#2563EB" />
              <ellipse cx="250" cy="145" rx="12" ry="20" fill="#2563EB" />

              {/* Face panel */}
              <path
                d="M130 105C130 91 142 82 156 82H204C218 82 230 91 230 105V165C230 182 218 194 202 194H158C142 194 130 182 130 165V105Z"
                fill="url(#mascotFace)"
              />

              {/* Eyes */}
              <motion.g
                animate={
                  isCoveringEyes
                    ? { opacity: 0, scale: 0.8 }
                    : isSuccess
                      ? { scaleY: 0.3 }
                      : { scaleY: 1 }
                }
                transition={{ duration: 0.15 }}
                style={{ transformOrigin: "180px 145px" }}
              >
                <ellipse cx="153" cy="145" rx="8" ry="12" fill="#1E3A8A" />
                <ellipse cx="207" cy="145" rx="8" ry="12" fill="#1E3A8A" />

                <circle cx="155" cy="141" r="3" fill="white" />
                <circle cx="209" cy="141" r="3" fill="white" />
              </motion.g>

              {/* Closed eyes during password entry */}
              {isCoveringEyes && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <path
                    d="M143 143C150 140 158 140 164 144"
                    stroke="#1E40AF"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  <path
                    d="M196 144C202 140 210 140 217 143"
                    stroke="#1E40AF"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </motion.g>
              )}

              {/* Happy eyes during success */}
              {isSuccess && (
                <g>
                  <path
                    d="M143 146C151 135 160 135 164 146"
                    stroke="#1E40AF"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />

                  <path
                    d="M196 146C204 135 213 135 217 146"
                    stroke="#1E40AF"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Mouth */}
              <motion.path
                d="M165 178C175 188 185 188 195 178"
                stroke="#1E40AF"
                strokeWidth="5"
                strokeLinecap="round"
                animate={
                  isSuccess
                    ? { d: "M160 175C175 198 185 198 200 175" }
                    : isCoveringEyes
                      ? { d: "M170 180C175 184 185 184 190 180" }
                      : { d: "M165 178C175 188 185 188 195 178" }
                }
                transition={{ duration: 0.25 }}
              />

              {/* Blush */}
              <motion.ellipse
                cx="140"
                cy="170"
                rx="12"
                ry="7"
                fill="#60A5FA"
                opacity=".35"
                animate={{ opacity: isSuccess ? 0.65 : 0.35 }}
              />

              <motion.ellipse
                cx="220"
                cy="170"
                rx="12"
                ry="7"
                fill="#60A5FA"
                opacity=".35"
                animate={{ opacity: isSuccess ? 0.65 : 0.35 }}
              />
            </motion.g>
          </motion.g>

          {/* Success indicator */}
          {isSuccess && (
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
            >
              <circle cx="275" cy="65" r="28" fill="#22C55E" />

              <path
                d="M262 65L272 75L289 55"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.g>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "180px 180px" }}
            >
              <circle cx="180" cy="20" r="5" fill="#60A5FA" />
            </motion.g>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
