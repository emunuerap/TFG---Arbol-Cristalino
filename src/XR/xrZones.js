export function initXrZones() {
    const zones = document.querySelectorAll('.xr-zone')
    const title = document.getElementById('xr-zone-detail-title')
    const text = document.getElementById('xr-zone-detail-text')
  
    if (!zones.length || !title || !text) return
  
    const copy = {
      light: {
        title: 'Light as Interface',
        text: 'Uso la iluminación como sistema de señalética: foco, estados (activo/inactivo) y profundidad sin recargar la UI.',
      },
      space: {
        title: 'Space as Interface',
        text: 'La posición de cámara, el framing y la profundidad marcan el recorrido del usuario. La escena es la interfaz.',
      },
      motion: {
        title: 'Motion as UI',
        text: 'Las transiciones explican qué ha pasado: scroll → cambio de estado, zoom → entrar en detalle, rotación → cambio de perspectiva.',
      },
      thresholds: {
        title: 'Thresholds',
        text: 'Diseño umbrales claros entre estados: cambios de luz, fades, portales o saltos de cámara que marcan “he cruzado a otra zona”.',
      },
    }
  
    zones.forEach((zone) => {
      zone.addEventListener('mouseenter', () => {
        zones.forEach((z) => z.classList.remove('is-active'))
        zone.classList.add('is-active')
  
        const key = zone.dataset.zone
        if (copy[key]) {
          title.textContent = copy[key].title
          text.textContent = copy[key].text
        }
      })
    })
  }
  