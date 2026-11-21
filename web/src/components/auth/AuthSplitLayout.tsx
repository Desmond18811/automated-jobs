import { useState, useEffect, type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { JaviBrandMark } from '@/assets/logos';
import { useIsMobile } from '@/hooks/useStageScale';

interface TestimonialSlide {
  image: string;
  quote: string;
  author: string;
  role: string;
  company: string;
}

// Strictly authentic high-resolution portraits of Black Nigerian & African professionals
const SLIDES: TestimonialSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1611432579402-7037e3e2c1e4?q=80&w=1200&auto=format&fit=crop',
    quote: "JAVI tailored my CV to match Paystack and Stripe's exact product criteria. I had 4 interview invitations within my first 10 days.",
    author: 'Amaka Okafor',
    role: 'Lead Product Designer',
    company: 'Fintech Systems · Lagos & Abuja, Nigeria',
  },
  {
    image: 'https://images.unsplash.com/photo-1616805765352-beedbad46b2a?q=80&w=1200&auto=format&fit=crop',
    quote: "The autonomous application engine and WhatsApp updates mean I wake up to interview screenings rather than endless form rejections.",
    author: 'Tunde Adeleke',
    role: 'Staff Systems Architect',
    company: 'Distributed Infrastructure · Lekki, Lagos',
  },
  {
    image: 'https://images.unsplash.com/photo-1573496358961-3c82861ab8f4?q=80&w=1200&auto=format&fit=crop',
    quote: "We move 10x faster and stay consistent. While others are bogged down with manual job portals, JAVI submits customized applications around the clock.",
    author: 'Zainab Balogun',
    role: 'Head of Product Operations',
    company: 'Growth Infrastructure · Maitama, Abuja',
  },
  {
    image: 'https://images.unsplash.com/photo-1769636929231-3cd7f853d038?q=80&w=1200&auto=format&fit=crop',
    quote: "The autonomous applying engine handles extensive custom question fields and portfolio attachments with zero manual friction.",
    author: 'Babajide Sanwo',
    role: 'Engineering Director & Tech Fellow',
    company: 'Payments Core · Wuse II, Abuja',
  },
  {
    image: 'https://images.unsplash.com/photo-1770235622094-a6484f7698ed?q=80&w=1200&auto=format&fit=crop',
    quote: "The CV tailoring feature highlighted my high-volume fintech and design systems work for European and US employers. I landed two international offers in 3 weeks.",
    author: 'Chioma Okonkwo',
    role: 'Senior UX & Design Systems Lead',
    company: 'Consumer Technologies · Central Business District, Abuja',
  },
];

interface AuthSplitLayoutProps {
  children: ReactNode;
}

export const AuthSplitLayout: FC<AuthSplitLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance slides smoothly every 9 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[currentSlide];

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: '#ffffff',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        fontFamily: "Montserrat, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ---------------------------------------------------------------------- */}
      {/* LEFT COLUMN: BRANDING, FORM, AND AMBIENT TEAL/BLUE GRADIENT           */}
      {/* ---------------------------------------------------------------------- */}
      <div
        style={{
          flex: isMobile ? 'none' : '1 1 50%',
          width: isMobile ? '100%' : '50%',
          minHeight: '100vh',
          height: isMobile ? 'auto' : '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isMobile ? '28px 20px 36px' : '40px 64px 36px',
          boxSizing: 'border-box',
          background: '#ffffff',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Subtle Bottom-Left Blue / Teal Ambient Gradient */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: '52%',
            background:
              'radial-gradient(ellipse 65% 85% at 0% 100%, rgba(60,115,255,0.24), rgba(60,115,255,0) 70%), radial-gradient(ellipse 60% 75% at 28% 100%, rgba(20,190,180,0.20), rgba(20,190,180,0) 70%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Brand Header (Prominent JaviBrandMark matching landing page presence) */}
        <header style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <JaviBrandMark glyphSize={24} fontSize={22} color="#0b0b0c" />
          </Link>
        </header>

        {/* Form Slot */}
        <main
          style={{
            position: 'relative',
            zIndex: 3,
            width: '100%',
            maxWidth: 400,
            margin: '0 auto',
            padding: isMobile ? '24px 0 28px' : '36px 0',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>

        {/* Footer / Copyright */}
        <footer
          style={{
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            color: '#98a2b3',
          }}
        >
          <span>&copy; {new Date().getFullYear()} Javi Inc.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link to="/pricing" style={{ color: '#667085', textDecoration: 'none' }}>
              Pricing
            </Link>
            <Link to="/faq" style={{ color: '#667085', textDecoration: 'none' }}>
              FAQ
            </Link>
            <a href="mailto:support@javi.ai" style={{ color: '#667085', textDecoration: 'none' }}>
              Support
            </a>
          </div>
        </footer>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* RIGHT COLUMN: EDITORIAL BLACK PROFESSIONAL PORTRAIT & TESTIMONIAL     */}
      {/* ---------------------------------------------------------------------- */}
      {!isMobile && (
        <div
          style={{
            flex: '1 1 50%',
            width: '50%',
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflow: 'hidden',
            background: '#090a0f',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {/* Background Portrait Image */}
          <div
            key={slide.image}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url('${slide.image}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 20%',
              transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Deep Cinematic Gradient Scrim */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(10,12,18,0.05) 0%, rgba(10,12,18,0.25) 45%, rgba(10,12,18,0.92) 88%, #0a0c12 100%)',
            }}
          />

          {/* Testimonial & Controls Container */}
          <div
            style={{
              position: 'relative',
              zIndex: 3,
              padding: '0 56px 48px',
              color: '#ffffff',
            }}
          >
            {/* Bold Testimonial Quote */}
            <blockquote
              key={slide.quote}
              style={{
                margin: '0 0 28px',
                fontSize: 27,
                fontWeight: 600,
                lineHeight: 1.35,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                maxWidth: 580,
                animation: 'jj-fade-in 0.5s ease',
              }}
            >
              &ldquo;{slide.quote}&rdquo;
            </blockquote>

            {/* Author Meta Row (Clean Editorial Layout without ratings/stars or arrow buttons) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: '0 0 4px',
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    color: '#ffffff',
                  }}
                >
                  {slide.author}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {slide.role}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
                  {slide.company}
                </p>
              </div>

              {/* Minimalist Slide Progress Indicators (No stars, no arrows) */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      width: i === currentSlide ? 24 : 6,
                      height: 4,
                      borderRadius: 2,
                      background: i === currentSlide ? '#ffffff' : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
