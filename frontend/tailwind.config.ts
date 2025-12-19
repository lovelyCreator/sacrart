import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  safelist: [
    // Font Awesome base classes
    'fas',
    'far',
    'fab',
    'fal',
    'fa-solid',
    'fa-regular',
    'fa-brands',
    'fa-light',
    // Font Awesome icon classes - match all fa-* patterns (including fa-solid fa-*)
    {
      pattern: /^fa-/,
    },
    // Explicitly include common icon classes to ensure they're not purged
    {
      pattern: /fa-(globe|chevron-down|check|star|user|tv|ticket|right-from-bracket|edit|award|arrow-up|credit-card|download|xmark|search|envelope|plus|eye|heart|play|lock)/,
    },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#A05245",
          foreground: "hsl(var(--primary-foreground))",
        },
        "background-light": "#f8f6f6",
        "background-dark": "#0A0A0A",
        "surface-dark": "#1E1E1E",
        "border-dark": "#333333",
        "text-subtle": "#b99da6",
        "kids-bg": "#252525",
        "text-light": "#E0E0E0",
        "text-dim": "#A0A0A0",
        "text-main-light": "#2D2D2D",
        "text-main-dark": "#E5E5E5",
        "text-muted-light": "#666666",
        "text-muted-dark": "#A3A3A3",
        "border-light": "#E5E5E5",
        "primary-hover": "#8a4539",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        terracotta: {
          DEFAULT: "hsl(var(--terracotta))",
          light: "hsl(var(--terracotta-light))",
          dark: "hsl(var(--terracotta-dark))",
        },
        cream: "hsl(var(--cream))",
        "warm-dark": "hsl(var(--warm-dark))",
        nav: {
          bg: "hsl(var(--nav-bg))",
          "gradient-from": "hsl(var(--nav-gradient-from))",
          "gradient-to": "hsl(var(--nav-gradient-to))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
        'display': ['Plus Jakarta Sans', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
          },
          to: {
            opacity: "1",
          },
        },
        "slide-up": {
          from: {
            opacity: "0",
            transform: "translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--terracotta) / 0.3)",
          },
          "50%": {
            boxShadow: "0 0 40px hsl(var(--terracotta) / 0.6)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        "glow": "glow 2s ease-in-out infinite",
      },
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
