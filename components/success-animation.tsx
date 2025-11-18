"use client";

interface SuccessAnimationProps {
  variant?: "Default" | "Variant2" | "Variant3";
  className?: string;
}

// Add keyframe animations
const animationStyles = `
  @keyframes circle-appear {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes pulse-stop {
    0% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
  }
  
  @keyframes pulse-stop-1 {
    0% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
    100% {
      opacity: 0.4;
      transform: scale(1);
    }
  }
  
  @keyframes pulse-stop-2 {
    0% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 0.9;
      transform: scale(1.05);
    }
    100% {
      opacity: 0.5;
      transform: scale(1);
    }
  }
  
  @keyframes checkmark-fade-in {
    0% {
      opacity: 0;
      transform: scale(0.8) rotate(160deg) scaleY(-1) scaleX(-1);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(160deg) scaleY(-1) scaleX(-1);
    }
  }
`;

export default function SuccessAnimation({
  variant = "Default",
  className = "",
}: SuccessAnimationProps) {
  if (variant === "Variant2") {
    return (
      <>
        <style>{animationStyles}</style>
        <div
          className={`relative h-[89px] w-[97px] ${className}`}
          style={{
            boxShadow: "0px 0px 8px 0px rgba(255, 255, 255, 0.25)",
          }}
        >
          <div className="absolute inset-0 contents">
            {/* Checkmark icon - positioned and rotated */}
            <div
              className="absolute aspect-square overflow-hidden"
              style={{
                left: "25.77%",
                right: "24.74%",
                top: "20px",
              }}
            >
              <div className="absolute flex inset-[20.83%_18.75%_20.83%_16.67%] items-center justify-center">
                <div
                  className="flex-none"
                  style={{
                    width: "28px",
                    height: "31px",
                    transform: "rotate(160deg) scaleY(-1) scaleX(-1)",
                    animation: "checkmark-fade-in 1.5s ease-in-out",
                  }}
                >
                  <svg
                    width="28"
                    height="31"
                    viewBox="0 0 28 31"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 15.5L10 23.5L26 7.5"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))",
                      }}
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Concentric circle layers with animations */}
            {/* First circle - visible from start */}
            <div
              className="absolute"
              style={{
                bottom: 0,
                left: 0,
                right: "17.5%",
                top: "0.07%",
              }}
            >
              <div className="h-full w-full rounded-full border border-white/30" />
            </div>
            {/* Second circle - fades in with checkmark */}
            <div
              className="absolute rounded-full border border-white/40"
              style={{
                inset: "0.05% 13.13% 0.02% 4.37%",
                animation: "circle-appear 1.5s ease-in-out forwards",
                opacity: 0,
              }}
            />
            {/* Third circle - fades in with checkmark */}
            <div
              className="absolute rounded-full border border-white/50"
              style={{
                inset: "0.03% 8.75%",
                animation: "circle-appear 1.5s ease-in-out forwards",
                opacity: 0,
              }}
            />
          </div>
        </div>
      </>
    );
  }

  if (variant === "Variant3") {
    return (
      <>
        <style>{animationStyles}</style>
        <div
          className={`relative h-[89px] w-[97px] ${className}`}
          style={{
            boxShadow: "0px 0px 8px 0px rgba(255, 255, 255, 0.25)",
          }}
        >
          <div
            className="absolute contents"
            style={{
              bottom: 0,
              left: "8.25%",
              right: "9.25%",
              top: 0,
            }}
          >
            {/* Checkmark icon */}
            <div
              className="absolute flex inset-[20.83%_18.75%_20.83%_16.67%] items-center justify-center"
            >
              <div
                className="flex-none"
                style={{
                  width: "28px",
                  height: "31px",
                  transform: "rotate(160deg) scaleY(-1) scaleX(-1)",
                  animation: "checkmark-fade-in 1.5s ease-in-out",
                }}
              >
                <svg
                  width="28"
                  height="31"
                  viewBox="0 0 28 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 15.5L10 23.5L26 7.5"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))",
                    }}
                  />
                </svg>
              </div>
            </div>

            {/* Concentric circle layers with animations */}
            <div
              className="absolute"
              style={{
                bottom: 0,
                left: "8.25%",
                right: "9.25%",
                top: "0.07%",
              }}
            >
              <div
                className="h-full w-full rounded-full border border-white/30"
                style={{
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
            </div>
            <div
              className="absolute rounded-full border border-white/40"
              style={{
                inset: "0.05% 9.25% 0.02% 8.25%",
                animation: "pulse-delayed-1 2s ease-in-out infinite 0.2s",
              }}
            />
            <div
              className="absolute rounded-full border border-white/50"
              style={{
                inset: "0.03% 9.25% 0.03% 8.25%",
                animation: "pulse-delayed-2 2s ease-in-out infinite 0.4s",
              }}
            />
            <div
              className="absolute rounded-full border border-white/60"
              style={{
                inset: "0.02% 9.25% 0.05% 8.25%",
                animation: "pulse-delayed-3 2s ease-in-out infinite 0.6s",
              }}
            />
            <div
              className="absolute"
              style={{
                bottom: "0.07%",
                left: "8.25%",
                right: "9.25%",
                top: 0,
              }}
            >
              <div
                className="h-full w-full rounded-full border border-white/70"
                style={{
                  animation: "pulse 2s ease-in-out infinite 0.8s",
                }}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Default variant
  return (
    <>
      <style>{animationStyles}</style>
      <div
        className={`relative h-[89px] w-[97px] ${className}`}
        style={{
          
        }}
      >
        <div className="absolute inset-0 contents">
          {/* Checkmark icon - positioned and rotated */}
          <div
            className="absolute aspect-square overflow-hidden"
            style={{
              left: "25.77%",
              right: "24.74%",
              top: "20px",
            }}
          >
            <div className="absolute flex inset-[20.83%_18.75%_20.83%_16.67%] items-center justify-center">
              <div
                className="flex-none"
                style={{
                  width: "28px",
                  height: "31px",
                  transform: "rotate(160deg) scaleY(-1) scaleX(-1)",
                  animation: "checkmark-fade-in 1.5s ease-in-out",
                }}
              >
                <svg
                  width="28"
                  height="31"
                  viewBox="0 0 28 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 15.5L10 23.5L26 7.5"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))",
                    }}
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Concentric circle layers matching Figma positioning with animations */}
          <div
            className="absolute"
            style={{
              bottom: 0,
              left: 0,
              right: "17.5%",
              top: "0.07%",
            }}
          >
            <div
              className="h-full w-full rounded-full border border-white/30"
              style={{
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          </div>
          <div
            className="absolute rounded-full border border-white/40"
            style={{
              inset: "0.05% 13.13% 0.02% 4.37%",
              animation: "pulse-delayed-1 2s ease-in-out infinite 0.2s",
            }}
          />
          <div
            className="absolute rounded-full border border-white/50"
            style={{
              inset: "0.03% 8.75%",
              animation: "pulse-delayed-2 2s ease-in-out infinite 0.4s",
            }}
          />
          <div
            className="absolute rounded-full border border-white/60"
            style={{
              inset: "0.02% 4.38% 0.05% 13.12%",
              animation: "pulse-delayed-3 2s ease-in-out infinite 0.6s",
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: "0.07%",
              left: "17.5%",
              right: 0,
              top: 0,
            }}
          >
            <div
              className="h-full w-full rounded-full border border-white/70"
              style={{
                animation: "pulse 2s ease-in-out infinite 0.8s",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

