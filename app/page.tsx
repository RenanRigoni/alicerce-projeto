'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function IntroPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [fading, setFading]   = useState(false)

  useEffect(() => {
    // Mostra apenas uma vez por sessão — reoabrir o app (nova aba/sessão) sempre exibe
    const shown = sessionStorage.getItem('introShown')
    if (shown) {
      router.replace('/login')
      return
    }

    // Pequeno delay para garantir que a imagem carregue antes do fade-in
    const t0 = setTimeout(() => setVisible(true), 80)
    const t1 = setTimeout(() => setFading(true), 2200)
    const t2 = setTimeout(() => {
      sessionStorage.setItem('introShown', '1')
      router.replace('/login')
    }, 2800)

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [router])

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        background: '#FDF8F3',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow:   'hidden',
        transition: 'opacity 0.6s ease',
        opacity:    fading ? 0 : visible ? 1 : 0,
      }}
    >
      <Image
        src="/intro_app.png"
        alt="Alicerce"
        fill
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        priority
        sizes="100vw"
      />
    </div>
  )
}
