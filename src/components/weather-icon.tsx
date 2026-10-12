/**
 * 天气图标（纯 SVG，无外部依赖）
 * 图标标识来自 lib/weather.ts 的 WEATHER_CODES
 */

type IconProps = {
  name: string;
  className?: string;
};

export function WeatherIcon({ name, className = "size-6" }: IconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      );
    case "sun-cloud":
    case "cloud-sun":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1" />
          <path d="M18 20H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 20Z" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <path d="M18 20H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 20Z" />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path d="M18 15H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 15Z" />
          <path d="M4 19h16M6 22h12" />
        </svg>
      );
    case "drizzle":
      return (
        <svg {...common}>
          <path d="M18 14H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 14Z" />
          <path d="M9 18v2M13 18v2M17 18v2" />
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path d="M18 14H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 14Z" />
          <path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path d="M18 14H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 14Z" />
          <path d="M8 18h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01" />
        </svg>
      );
    case "storm":
      return (
        <svg {...common}>
          <path d="M18 13H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 13Z" />
          <path d="M12 16l-2 4h4l-2 4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M18 20H8a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.5 3.5 0 0 1 18 20Z" />
        </svg>
      );
  }
}
