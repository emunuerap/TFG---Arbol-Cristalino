export const RAMAS_PROJECTS = [
  {
      id: 'ramen-9000', // [AHORA ES EL PRIMERO - INICIO DEL RECORRIDO]
      title: 'RAMEN 9000',
      kicker: 'DIGITAL 3D EXPERIENCE',
      line: 'Narrativa visual inmersiva que demuestra el poder de Three.js aplicado a marca.',
      description: 'Una experiencia digital que rompe la barrera de la web plana. Ramen-9000 es un showcase de dirección de arte, iluminación atmosférica e interacción en tiempo real dentro del navegador. El objetivo fue crear una escena que se sienta "viva" y premium, utilizando técnicas de post-procesado y materiales físicos para elevar la percepción de marca.',
      tags: ['THREE.JS', 'WEBGL', 'INTERACTIVE'],
      tech: ['Three.js', 'Blender', 'GLSL Shaders', 'Post-processing'],
      links: {
          'repo': 'https://github.com/emunuerap/Proyecto-3-Aplicaci-n-Interactiva',
          'site': 'https://ramen-9000.vercel.app/'

      }
  },
  {
      id: 'tapin-os',
      title: 'TAPIN',
      kicker: 'USER APP + RESTAURANT OS',
      line: 'Un ecosistema de doble capa: reserva sin fricción y gestión operativa en tiempo real.',
      description: 'TapIn no es solo una app de reservas, es un circuito completo. Por un lado, una experiencia B2C que elimina la fricción para el comensal (reservas instantáneas, identidad ligera). Por otro, un Sistema Operativo B2B para el restaurante que optimiza mesas, turnos y aforo real. Datos que viajan del usuario a la cocina para reducir el estrés y eliminar los huecos vacíos.',
      tags: ['PRODUCT DESIGN', 'REAL-TIME', 'B2B/B2C'],
      tech: ['React Native', 'Node.js', 'Socket.io', 'Dashboard OS'],
      links: {
          'web': 'https://tapin.app',
          'case': '#'
      }
  },
  {
      id: 'iberikus',
      title: 'IBERIKUS',
      kicker: 'DATA SCIENCE & ANALYTICS',
      line: 'Transformando datos transaccionales en decisiones estratégicas de retención.',
      description: 'Proyecto de ciencia de datos aplicado a e-commerce gourmet. El objetivo: dejar de operar por intuición y empezar a decidir con datos. Implementación de limpieza de datos, análisis RFM, segmentación de clientes por comportamiento (Clustering) y modelos de predicción de demanda (Forecasting) para personalizar el marketing y optimizar el inventario.',
      tags: ['DATA SCIENCE', 'E-COMMERCE', 'STRATEGY'],
      tech: ['Python', 'Pandas', 'Scikit-learn', 'PowerBI'],
      links: {
          'analysis': '#',
          'web': 'https://iberikus.fi',
          'case': 'https://iberikus-rfm-dashboard.onrender.com/'
      }
  },
  {
      id: 'eporlan',
      title: 'EPORLAN.COM',
      kicker: 'MINIMALIST TEASER',
      line: 'Diseño sobrio y craft por encima de lo obvio. La antesala de la experiencia.',
      description: 'Una landing page ultra-minimalista diseñada con una única intención: transmitir calidad desde el primer segundo. Funciona como puerta de entrada a la marca personal mientras el portfolio inmersivo cobra vida. Sin ruido visual, solo tipografía cuidada, ritmo vertical y micro-interacciones sutiles que marcan el tono de "menos es más".',
      tags: ['MINIMALISM', 'UI/UX', 'BRANDING'],
      tech: ['HTML5', 'Sass', 'GSAP', 'Micro-interactions'],
      links: {
        'repo': 'https://github.com/emunuerap/eporlan-coming-soon',
          'site': 'https://eporlan.com'
      }
  },
  {
      id: 'arbol', // [EL FINAL DEL RECORRIDO]
      title: 'ÁRBOL CRISTALINO',
      kicker: 'IMMERSIVE PORTFOLIO',
      line: 'El 3D como interfaz de navegación: un mundo explorable dividido en narrativa y visión.',
      description: 'Más que una web, un mundo navegable. Este portfolio utiliza la metáfora de un árbol cristalino para estructurar el contenido: Raíces (fundamentos), Ramas (proyectos) y Copa (visión). Implementa navegación scroll-driven, físicas de cristal realistas (transmisión, refracción), shaders personalizados y un sistema modular para crear una experiencia de descubrimiento única.',
      tags: ['CREATIVE DEV', 'PHYSICS', 'WORLD BUILDING'],
      tech: ['React Three Fiber', 'Cannon.js', 'Custom Shaders', 'Glassmorphism'],
      links: {
          'about': '#'
      }
  }
]